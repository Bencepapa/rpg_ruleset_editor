import {
  CharacterSheetState,
  ClassDef,
  ComputedCharacterSheet,
  ComputedItemTooltip,
  ComputedMonsterStatus,
  ItemDef,
  MonsterInstance,
  RaceDef,
  RulesetBundle,
  SpellDef,
} from '../types/ruleset.types';
import { evaluateCheckFormula, RngFn, rollDiceExpression } from '../engine/dice';
import {
  applyXpWithProgression,
  calculateSpellDamage,
  computeCharacterSheet,
  computeEffectiveStats,
  getGenericStatMod,
  getPrimaryClassDef,
  getStrDamageMod,
  isTargetImmuneToSpell,
  resolveMoraleCheck,
  resolveThac0Attack,
} from '../engine/rulesEngine';
import {
  ActionOutcome,
  CheckOutcome,
  LevelUpOutcome,
  RestOutcomeEvent,
  RpgEvent,
} from './events';

function deepClone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

export class RpgRuntime {
  private bundle: RulesetBundle;
  private party: CharacterSheetState[] = [];
  private encounter: MonsterInstance[] = [];
  private identifiedItemIds = new Set<string>();
  private rng: RngFn;
  private listeners = new Set<() => void>();

  constructor(bundle: RulesetBundle, rng: RngFn = Math.random) {
    this.bundle = deepClone(bundle);
    this.rng = rng;
    if (this.bundle.partyPresets.length > 0) {
      this.loadParty(this.bundle.partyPresets[0].members);
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const fn of this.listeners) {
      fn();
    }
  }

  // 1. Hot-Reload & Live In-Game Debug Overrides
  reloadRuleset(bundle: RulesetBundle): void {
    this.bundle = deepClone(bundle);
    this.notify();
  }

  getRuleset(): RulesetBundle {
    return this.bundle;
  }

  getActiveParty(): CharacterSheetState[] {
    return this.party;
  }

  getActiveEncounter(): MonsterInstance[] {
    return this.encounter;
  }

  patchActiveMember(memberId: string, patch: Partial<CharacterSheetState>): void {
    const idx = this.party.findIndex((m) => m.id === memberId);
    if (idx === -1) return;
    this.party[idx] = {
      ...this.party[idx],
      ...deepClone(patch),
    };
    this.notify();
  }

  fullRestoreParty(): void {
    for (const member of this.party) {
      member.currentHp = member.maxHp;
      member.activeStatuses = [];
      const computed = computeCharacterSheet(this.bundle, member);
      const primary = getPrimaryClassDef(this.bundle, member);
      const school = primary?.spellSchool ?? 'none';
      if (school !== 'none' && member.memorizedSpellIds.length === 0) {
        const available =
          school === 'mage'
            ? member.spellbookIds
            : this.bundle.spells.filter((s) => s.school === 'cleric').map((s) => s.id);
        const refilled: string[] = [];
        for (let tierIdx = 0; tierIdx < 6; tierIdx++) {
          const cap = computed.maxSpellSlots[tierIdx];
          const tierSpells = available
            .map((sid) => this.bundle.spells.find((s) => s.id === sid))
            .filter((s): s is SpellDef => Boolean(s && s.tier === tierIdx + 1));
          if (tierSpells.length > 0) {
            for (let c = 0; c < cap; c++) {
              refilled.push(tierSpells[c % tierSpells.length].id);
            }
          }
        }
        member.memorizedSpellIds = refilled;
      }
    }
    this.notify();
  }

  // 2. Discovery & UI Inspection
  getCatalog(): { classes: ClassDef[]; races: RaceDef[]; spells: SpellDef[]; items: ItemDef[] } {
    return {
      classes: this.bundle.classes,
      races: this.bundle.races,
      spells: this.bundle.spells,
      items: this.bundle.items,
    };
  }

  getCharacterSheet(memberId: string): ComputedCharacterSheet {
    const member = this.party.find((m) => m.id === memberId);
    if (!member) {
      throw new Error(`Character not found: ${memberId}`);
    }
    return computeCharacterSheet(this.bundle, member);
  }

  getMonsterStatus(instanceId: string): ComputedMonsterStatus {
    const instance = this.encounter.find((m) => m.instanceId === instanceId);
    if (!instance) {
      throw new Error(`Monster instance not found: ${instanceId}`);
    }
    const effectiveAc = instance.ac + (instance.activeStatuses.includes('paralyzed') ? 4 : 0);
    return {
      instance,
      effectiveAc,
      effectiveThac0: instance.thac0,
      isAlive: instance.currentHp > 0 && !instance.moraleBroken,
    };
  }

  markItemIdentified(itemId: string): void {
    this.identifiedItemIds.add(itemId);
  }

  inspectItem(itemId: string): ComputedItemTooltip {
    const item = this.bundle.items.find((i) => i.id === itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }
    const isIdentified = item.identifiedByDefault || this.identifiedItemIds.has(item.id);
    const summaryLines: string[] = [];
    if (item.weaponStats) {
      const bonusStr = isIdentified && item.weaponStats.magicBonus !== 0
        ? ` (+${item.weaponStats.magicBonus})`
        : '';
      summaryLines.push(`Damage: ${item.weaponStats.damageDice}${bonusStr} ${item.weaponStats.damageType}`);
    }
    if (item.armorStats?.baseAc !== undefined) {
      summaryLines.push(`Base AC: ${item.armorStats.baseAc}`);
    }
    if (item.armorStats?.acBonus !== undefined) {
      summaryLines.push(
        isIdentified ? `AC Bonus: ${item.armorStats.acBonus >= 0 ? '+' : ''}${item.armorStats.acBonus}` : 'AC Bonus: ?'
      );
    }
    if (isIdentified && item.cursed) {
      summaryLines.push('Cursed');
    }

    return {
      item,
      isIdentified,
      displayMagicBonus: isIdentified ? (item.weaponStats?.magicBonus ?? item.armorStats?.acBonus ?? 0) : null,
      summaryLines,
    };
  }

  // 3. Session & Encounter Management
  loadParty(members: CharacterSheetState[]): void {
    this.party = deepClone(members);
    this.notify();
  }

  swapFormation(memberAId: string, memberBId: string): void {
    const idxA = this.party.findIndex((m) => m.id === memberAId);
    const idxB = this.party.findIndex((m) => m.id === memberBId);
    if (idxA === -1 || idxB === -1) return;
    const tempRow = this.party[idxA].row;
    this.party[idxA].row = this.party[idxB].row;
    this.party[idxB].row = tempRow;
    const temp = this.party[idxA];
    this.party[idxA] = this.party[idxB];
    this.party[idxB] = temp;
    this.notify();
  }

  spawnEncounter(monsterIds: string[]): MonsterInstance[] {
    this.encounter = monsterIds
      .map((id, idx) => {
        const def = this.bundle.monsters.find((m) => m.id === id);
        if (!def) return null;
        const maxHp = Math.max(1, rollDiceExpression(def.maxHpDice, this.rng).total);
        return {
          instanceId: `${def.id}_${idx + 1}`,
          monsterId: def.id,
          name: def.name,
          isUndead: def.isUndead,
          currentHp: maxHp,
          maxHp,
          ac: def.baseAc,
          thac0: def.thac0,
          morale: def.morale,
          moraleBroken: false,
          xpReward: def.xpReward,
          row: idx < 2 ? 'front' : 'back',
          activeStatuses: [],
          resistances: { ...def.resistances },
          attacks: deepClone(def.attacks),
        } as MonsterInstance;
      })
      .filter((m): m is MonsterInstance => Boolean(m));
    this.notify();
    return this.encounter;
  }

  restParty(): RestOutcomeEvent[] {
    const outcomes: RestOutcomeEvent[] = [];
    for (const member of this.party) {
      if (member.activeStatuses.includes('dead')) continue;
      const before = member.currentHp;
      member.currentHp = Math.min(member.maxHp, member.currentHp + Math.max(1, Math.floor(member.maxHp * 0.25)));
      member.activeStatuses = member.activeStatuses.filter((s) => s !== 'feared' && s !== 'blinded');
      outcomes.push({
        memberId: member.id,
        memberName: member.name,
        hpRecovered: member.currentHp - before,
        memorizedCount: member.memorizedSpellIds.length,
      });
    }
    this.notify();
    return outcomes;
  }

  // 4. Gameplay Actions
  performAttack(req: { attackerId: string; targetId: string; hand?: 'main' | 'off' }): ActionOutcome {
    const events: RpgEvent[] = [];
    const partyAttacker = this.party.find((m) => m.id === req.attackerId);
    const monsterAttacker = this.encounter.find((m) => m.instanceId === req.attackerId);
    const partyTarget = this.party.find((m) => m.id === req.targetId);
    const monsterTarget = this.encounter.find((m) => m.instanceId === req.targetId);

    if (!partyAttacker && !monsterAttacker) {
      return { ok: false, errorCode: 'ACTOR_NOT_FOUND', events };
    }
    if (!partyTarget && !monsterTarget) {
      return { ok: false, errorCode: 'TARGET_NOT_FOUND', events };
    }

    if (partyAttacker && monsterTarget) {
      const sheet = computeCharacterSheet(this.bundle, partyAttacker);
      if (!sheet.isAlive || partyAttacker.activeStatuses.includes('paralyzed')) {
        return { ok: false, errorCode: 'ACTOR_UNABLE', events };
      }
      const slot = req.hand === 'off' ? 'off_hand' : 'main_hand';
      const weaponId = partyAttacker.equipped[slot] ?? partyAttacker.equipped.main_hand;
      const weapon = weaponId ? this.bundle.items.find((i) => i.id === weaponId) : undefined;
      const damageDice = weapon?.weaponStats?.damageDice ?? '1d4';
      const damageType = weapon?.weaponStats?.damageType ?? 'bludgeoning';
      const magicBonus = weapon?.weaponStats?.magicBonus ?? 0;

      const targetStatus = this.getMonsterStatus(monsterTarget.instanceId);
      const res = resolveThac0Attack(
        {
          modifiedThac0: sheet.modifiedThac0,
          effectiveTargetAc: targetStatus.effectiveAc,
          damageDice,
          damageType,
          strDamageMod: sheet.strDamageMod,
          weaponMagicBonus: magicBonus,
          targetResistances: monsterTarget.resistances,
          critHitD20: this.bundle.globalRules.critHitD20,
          critMissD20: this.bundle.globalRules.critMissD20,
        },
        this.rng
      );

      if (!res.hit) {
        events.push({
          type: 'MISS',
          sourceId: partyAttacker.id,
          targetId: monsterTarget.instanceId,
          d20Roll: res.d20Roll,
          requiredRoll: res.requiredRoll,
          isCritMiss: res.isCritMiss,
        });
        return { ok: true, events };
      }

      const prevHalf = monsterTarget.currentHp > monsterTarget.maxHp * 0.5;
      monsterTarget.currentHp = Math.max(0, monsterTarget.currentHp - res.finalDamage);
      const defeated = monsterTarget.currentHp === 0;
      events.push({
        type: 'DAMAGE',
        sourceId: partyAttacker.id,
        targetId: monsterTarget.instanceId,
        amount: res.finalDamage,
        damageType,
        isCrit: res.isCrit,
        targetRemainingHp: monsterTarget.currentHp,
        targetDefeated: defeated,
      });

      if (!defeated && prevHalf && monsterTarget.currentHp <= monsterTarget.maxHp * 0.5) {
        const moraleRes = resolveMoraleCheck(
          monsterTarget.morale,
          this.bundle.globalRules.moraleCheckDice,
          this.rng
        );
        if (moraleRes.broken) {
          monsterTarget.moraleBroken = true;
        }
        events.push({
          type: moraleRes.broken ? 'MORALE_BROKEN' : 'MORALE_CHECK',
          targetId: monsterTarget.instanceId,
          roll2d6: moraleRes.roll2d6,
          moraleThreshold: monsterTarget.morale,
          broken: moraleRes.broken,
        });
      }

      this.notify();
      return { ok: true, events };
    }

    if (monsterAttacker && partyTarget) {
      if (monsterAttacker.currentHp <= 0 || monsterAttacker.moraleBroken || monsterAttacker.activeStatuses.includes('paralyzed')) {
        return { ok: false, errorCode: 'ACTOR_UNABLE', events };
      }
      const attack = monsterAttacker.attacks[0] ?? {
        name: { en: 'Strike', hu: 'Csapás' },
        damageDice: '1d6',
        damageType: 'bludgeoning' as const,
        attackSpeedMs: 1500,
      };
      const targetSheet = computeCharacterSheet(this.bundle, partyTarget);
      const res = resolveThac0Attack(
        {
          modifiedThac0: monsterAttacker.thac0,
          effectiveTargetAc: targetSheet.effectiveAc,
          damageDice: attack.damageDice,
          damageType: attack.damageType,
          strDamageMod: 0,
          weaponMagicBonus: 0,
          targetResistances: {},
          critHitD20: this.bundle.globalRules.critHitD20,
          critMissD20: this.bundle.globalRules.critMissD20,
        },
        this.rng
      );

      if (!res.hit) {
        events.push({
          type: 'MISS',
          sourceId: monsterAttacker.instanceId,
          targetId: partyTarget.id,
          d20Roll: res.d20Roll,
          requiredRoll: res.requiredRoll,
          isCritMiss: res.isCritMiss,
        });
        return { ok: true, events };
      }

      partyTarget.currentHp = Math.max(0, partyTarget.currentHp - res.finalDamage);
      const defeated = partyTarget.currentHp === 0;
      if (defeated && !partyTarget.activeStatuses.includes('downed')) {
        partyTarget.activeStatuses.push('downed');
      }
      events.push({
        type: 'DAMAGE',
        sourceId: monsterAttacker.instanceId,
        targetId: partyTarget.id,
        amount: res.finalDamage,
        damageType: attack.damageType,
        isCrit: res.isCrit,
        targetRemainingHp: partyTarget.currentHp,
        targetDefeated: defeated,
      });

      this.notify();
      return { ok: true, events };
    }

    return { ok: false, errorCode: 'TARGET_NOT_FOUND', events };
  }

  castSpell(req: {
    casterId: string;
    spellId: string;
    targetIds: string[];
    source: 'memorized' | 'scroll';
  }): ActionOutcome {
    const events: RpgEvent[] = [];
    const caster = this.party.find((m) => m.id === req.casterId);
    if (!caster) return { ok: false, errorCode: 'ACTOR_NOT_FOUND', events };

    const spell = this.bundle.spells.find((s) => s.id === req.spellId);
    if (!spell) return { ok: false, errorCode: 'SPELL_NOT_FOUND', events };

    if (spell.requiresFrontRow && caster.row !== 'front') {
      return {
        ok: false,
        errorCode: 'INVALID_ROW',
        message: `${spell.name.en} requires the caster to stand in the front row.`,
        events,
      };
    }

    if (req.source === 'memorized') {
      const idx = caster.memorizedSpellIds.indexOf(spell.id);
      if (idx === -1) {
        return {
          ok: false,
          errorCode: 'SPELL_NOT_MEMORIZED',
          message: `${spell.name.en} is not memorized.`,
          events,
        };
      }
      caster.memorizedSpellIds.splice(idx, 1);
    }

    events.push({
      type: 'SPELL_CAST',
      casterId: caster.id,
      spellId: spell.id,
      spellName: spell.name,
      source: req.source,
      targetIds: req.targetIds,
    });

    const primaryClassId = caster.classIds.find((cid) => {
      const c = this.bundle.classes.find((def) => def.id === cid);
      return c?.spellSchool === spell.school;
    }) ?? caster.classIds[0];
    const casterLevel = caster.levels[primaryClassId] ?? 1;

    for (const targetId of req.targetIds) {
      const ally = this.party.find((m) => m.id === targetId);
      const monster = this.encounter.find((m) => m.instanceId === targetId);

      if (spell.formula.effectType === 'damage' && monster) {
        const dmg = calculateSpellDamage(spell, casterLevel, monster.resistances, this.rng);
        monster.currentHp = Math.max(0, monster.currentHp - dmg);
        events.push({
          type: 'DAMAGE',
          sourceId: caster.id,
          targetId: monster.instanceId,
          amount: dmg,
          damageType: spell.formula.damageType ?? 'magic',
          isCrit: false,
          targetRemainingHp: monster.currentHp,
          targetDefeated: monster.currentHp === 0,
        });
      } else if (spell.formula.effectType === 'heal' && ally) {
        const healed = spell.formula.dice
          ? Math.max(1, rollDiceExpression(spell.formula.dice, this.rng).total)
          : 0;
        ally.currentHp = Math.min(ally.maxHp, ally.currentHp + healed);
        events.push({
          type: 'HEAL',
          sourceId: caster.id,
          targetId: ally.id,
          amount: healed,
          targetCurrentHp: ally.currentHp,
        });
        if (spell.formula.removeStatus) {
          for (const st of spell.formula.removeStatus) {
            if (ally.activeStatuses.includes(st)) {
              ally.activeStatuses = ally.activeStatuses.filter((x) => x !== st);
              events.push({ type: 'STATUS_REMOVED', targetId: ally.id, status: st });
            }
          }
        }
      } else if (spell.formula.effectType === 'ac_override' && ally && spell.formula.applyStatus) {
        if (spell.formula.nonStackingGroup === 'base_ac_spell') {
          ally.activeStatuses = ally.activeStatuses.filter(
            (s) => s !== 'armor_spell' && s !== 'shield_spell'
          );
        }
        ally.activeStatuses.push(spell.formula.applyStatus);
        events.push({ type: 'STATUS_APPLIED', targetId: ally.id, status: spell.formula.applyStatus });
      } else if (spell.formula.effectType === 'buff' && ally && spell.formula.applyStatus) {
        if (!ally.activeStatuses.includes(spell.formula.applyStatus)) {
          ally.activeStatuses.push(spell.formula.applyStatus);
        }
        events.push({ type: 'STATUS_APPLIED', targetId: ally.id, status: spell.formula.applyStatus });
      } else if (spell.formula.effectType === 'debuff' && monster) {
        if (isTargetImmuneToSpell(spell, { isUndead: monster.isUndead })) {
          if (spell.formula.applyStatus) {
            events.push({
              type: 'STATUS_APPLIED',
              targetId: monster.instanceId,
              status: spell.formula.applyStatus,
              immune: true,
            });
          }
          continue;
        }
        if (spell.formula.applyStatus && !monster.activeStatuses.includes(spell.formula.applyStatus)) {
          monster.activeStatuses.push(spell.formula.applyStatus);
          events.push({
            type: 'STATUS_APPLIED',
            targetId: monster.instanceId,
            status: spell.formula.applyStatus,
          });
        }
        if (spell.formula.moraleDelta) {
          monster.morale = Math.max(2, monster.morale + spell.formula.moraleDelta);
          const moraleRes = resolveMoraleCheck(
            monster.morale,
            this.bundle.globalRules.moraleCheckDice,
            this.rng
          );
          if (moraleRes.broken) {
            monster.moraleBroken = true;
          }
          events.push({
            type: moraleRes.broken ? 'MORALE_BROKEN' : 'MORALE_CHECK',
            targetId: monster.instanceId,
            roll2d6: moraleRes.roll2d6,
            moraleThreshold: monster.morale,
            broken: moraleRes.broken,
          });
        }
      } else if (spell.formula.effectType === 'cure_status' && ally && spell.formula.removeStatus) {
        if (spell.id === 'raise_dead') {
          const race = this.bundle.races.find((r) => r.id === ally.raceId);
          if (isTargetImmuneToSpell(spell, { raceDef: race })) {
            events.push({ type: 'STATUS_APPLIED', targetId: ally.id, status: 'dead', immune: true });
            continue;
          }
        }
        for (const st of spell.formula.removeStatus) {
          if (ally.activeStatuses.includes(st)) {
            ally.activeStatuses = ally.activeStatuses.filter((x) => x !== st);
            events.push({ type: 'STATUS_REMOVED', targetId: ally.id, status: st });
          }
        }
        if (ally.currentHp <= 0 && spell.id === 'raise_dead') {
          ally.currentHp = Math.max(1, rollDiceExpression(spell.formula.dice ?? '1d4', this.rng).total);
        }
      }
    }

    this.notify();
    return { ok: true, events };
  }

  useItem(req: { actorId: string; itemId: string; targetId?: string }): ActionOutcome {
    const events: RpgEvent[] = [];
    const actor = this.party.find((m) => m.id === req.actorId);
    if (!actor) return { ok: false, errorCode: 'ACTOR_NOT_FOUND', events };
    const item = this.bundle.items.find((i) => i.id === req.itemId);
    if (!item) return { ok: false, errorCode: 'ITEM_NOT_FOUND', events };

    if (item.category === 'scroll' && item.linkedSpellId) {
      return this.castSpell({
        casterId: req.actorId,
        spellId: item.linkedSpellId,
        targetIds: req.targetId ? [req.targetId] : this.encounter.map((m) => m.instanceId),
        source: 'scroll',
      });
    }

    const target = this.party.find((m) => m.id === (req.targetId ?? req.actorId));
    if (!target) return { ok: false, errorCode: 'TARGET_NOT_FOUND', events };

    if (item.consumableEffect?.healDice) {
      const amount = Math.max(1, rollDiceExpression(item.consumableEffect.healDice, this.rng).total);
      target.currentHp = Math.min(target.maxHp, target.currentHp + amount);
      events.push({
        type: 'HEAL',
        sourceId: actor.id,
        targetId: target.id,
        amount,
        targetCurrentHp: target.currentHp,
      });
    }

    if (item.consumableEffect?.cureStatus) {
      for (const st of item.consumableEffect.cureStatus) {
        if (target.activeStatuses.includes(st)) {
          target.activeStatuses = target.activeStatuses.filter((x) => x !== st);
          events.push({ type: 'STATUS_REMOVED', targetId: target.id, status: st });
        }
      }
    }

    this.notify();
    return { ok: true, events };
  }

  rollCheck(req: { actorId: string; checkRuleId: string; dcOverride?: number }): CheckOutcome {
    const actor = this.party.find((m) => m.id === req.actorId);
    const rule = this.bundle.checkRules.find((r) => r.id === req.checkRuleId);
    if (!actor || !rule) {
      return {
        ok: false,
        errorCode: !actor ? 'ACTOR_NOT_FOUND' : 'CHECK_RULE_NOT_FOUND',
        actorId: req.actorId,
        checkRuleId: req.checkRuleId,
        formula: rule?.formula ?? '',
        dc: req.dcOverride ?? 10,
        rollTotal: 0,
        rawSummary: '0',
        success: false,
      };
    }

    const race = this.bundle.races.find((r) => r.id === actor.raceId);
    const effStats = computeEffectiveStats(actor, race);
    const maxLevel = Math.max(...Object.values(actor.levels), 1);

    const vars: Record<string, number> = {
      strMod: getStrDamageMod(effStats.STR),
      dexMod: getGenericStatMod(effStats.DEX),
      conMod: getGenericStatMod(effStats.CON),
      intMod: getGenericStatMod(effStats.INT),
      wisMod: getGenericStatMod(effStats.WIS),
      chaMod: getGenericStatMod(effStats.CHA),
      moraleMod: actor.morale - 8,
      level: maxLevel,
    };

    const result = evaluateCheckFormula(rule.formula, vars, this.rng);
    const dc = req.dcOverride ?? rule.defaultDc;

    return {
      ok: true,
      actorId: actor.id,
      checkRuleId: rule.id,
      formula: rule.formula,
      dc,
      rollTotal: result.total,
      rawSummary: result.rawSummary,
      success: result.total >= dc,
    };
  }

  awardPartyXp(baseXp: number): LevelUpOutcome[] {
    const outcomes: LevelUpOutcome[] = [];
    for (const member of this.party) {
      if (member.activeStatuses.includes('dead')) continue;
      const results = applyXpWithProgression(this.bundle, member, baseXp, this.rng);
      for (const r of results) {
        outcomes.push({
          memberId: member.id,
          memberName: member.name,
          ...r,
        });
      }
    }
    this.notify();
    return outcomes;
  }

  // 5. Persistence
  serializeState(): string {
    return JSON.stringify({
      party: this.party,
      encounter: this.encounter,
      identifiedItemIds: Array.from(this.identifiedItemIds),
    });
  }

  hydrateState(json: string): void {
    const parsed = JSON.parse(json) as {
      party?: CharacterSheetState[];
      encounter?: MonsterInstance[];
      identifiedItemIds?: string[];
    };
    if (parsed.party) this.party = parsed.party;
    if (parsed.encounter) this.encounter = parsed.encounter;
    if (parsed.identifiedItemIds) this.identifiedItemIds = new Set(parsed.identifiedItemIds);
    this.notify();
  }
}
