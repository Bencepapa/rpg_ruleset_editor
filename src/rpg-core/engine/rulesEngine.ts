import {
  CharacterSheetState,
  ClassDef,
  ClassLevelRow,
  ComputedCharacterSheet,
  DamageType,
  ItemDef,
  MonsterInstance,
  PrimaryStatId,
  RaceDef,
  RulesetBundle,
  SpellDef,
} from '../types/ruleset.types';
import { RngFn, rollDiceExpression } from './dice';

export function getStrAttackMod(str: number): number {
  if (str <= 3) return -3;
  if (str <= 5) return -2;
  if (str <= 7) return -1;
  if (str <= 15) return 0;
  if (str <= 17) return 1;
  if (str === 18) return 2;
  return 3;
}

export function getStrDamageMod(str: number): number {
  if (str <= 3) return -1;
  if (str <= 5) return -1;
  if (str <= 15) return 0;
  if (str === 16) return 1;
  if (str === 17) return 1;
  if (str === 18) return 2;
  return 3;
}

export function getDexAcMod(dex: number): number {
  if (dex <= 3) return -4;
  if (dex === 4) return -3;
  if (dex === 5) return -2;
  if (dex === 6) return -1;
  if (dex <= 14) return 0;
  if (dex === 15) return 1;
  if (dex === 16) return 2;
  if (dex === 17) return 3;
  return 4;
}

export function getConHpMod(con: number, isWarrior: boolean): number {
  if (con <= 3) return -2;
  if (con <= 6) return -1;
  if (con <= 14) return 0;
  if (con === 15) return 1;
  if (con === 16) return 2;
  if (con === 17) return isWarrior ? 3 : 2;
  return isWarrior ? 4 : 2;
}

export function getGenericStatMod(stat: number): number {
  if (stat <= 5) return -2;
  if (stat <= 8) return -1;
  if (stat <= 12) return 0;
  if (stat <= 15) return 1;
  if (stat <= 17) return 2;
  return 3;
}

export function getWisBonusSlots(wis: number): number[] {
  if (wis < 13) return [0, 0, 0, 0, 0, 0];
  if (wis === 13) return [1, 0, 0, 0, 0, 0];
  if (wis === 14) return [2, 0, 0, 0, 0, 0];
  if (wis === 15) return [2, 1, 0, 0, 0, 0];
  if (wis === 16) return [2, 2, 0, 0, 0, 0];
  if (wis === 17) return [2, 2, 1, 0, 0, 0];
  return [2, 2, 1, 1, 0, 0];
}

export function getScribeSuccessPercent(intStat: number): number {
  if (intStat <= 9) return 35;
  if (intStat <= 12) return 45;
  if (intStat <= 14) return 55;
  if (intStat <= 16) return 65;
  if (intStat === 17) return 75;
  return 85;
}

export function getClassLevelRow(classDef: ClassDef, level: number): ClassLevelRow {
  const clamped = Math.max(1, Math.min(level, classDef.progression.length));
  return classDef.progression.find((r) => r.level === clamped) ?? classDef.progression[0];
}

export function getPrimaryClassDef(bundle: RulesetBundle, member: CharacterSheetState): ClassDef | undefined {
  for (const cid of member.classIds) {
    const found = bundle.classes.find((c) => c.id === cid);
    if (found) return found;
  }
  return bundle.classes[0];
}

export function computeEffectiveStats(
  member: CharacterSheetState,
  race?: RaceDef
): Record<PrimaryStatId, number> {
  const mods = race?.statModifiers ?? {};
  const clamp = (val: number) => Math.max(3, Math.min(25, val));
  return {
    STR: clamp(member.stats.STR + (mods.STR ?? 0)),
    INT: clamp(member.stats.INT + (mods.INT ?? 0)),
    WIS: clamp(member.stats.WIS + (mods.WIS ?? 0)),
    DEX: clamp(member.stats.DEX + (mods.DEX ?? 0)),
    CON: clamp(member.stats.CON + (mods.CON ?? 0)),
    CHA: clamp(member.stats.CHA + (mods.CHA ?? 0)),
  };
}

export function computeCharacterSheet(
  bundle: RulesetBundle,
  member: CharacterSheetState
): ComputedCharacterSheet {
  const race = bundle.races.find((r) => r.id === member.raceId);
  const effectiveStats = computeEffectiveStats(member, race);

  const classDefs = member.classIds
    .map((id) => bundle.classes.find((c) => c.id === id))
    .filter((c): c is ClassDef => Boolean(c));

  const isWarrior = classDefs.some((c) =>
    ['fighter', 'ranger', 'paladin'].includes(c.id)
  );

  let bestBaseThac0 = 20;
  const maxSpellSlots: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
  let resourceType: 'mana' | 'energy' | 'none' = 'none';
  let hasPrimeXpBonus = false;

  for (const cls of classDefs) {
    const lvl = member.levels[cls.id] ?? 1;
    const row = getClassLevelRow(cls, lvl);
    if (row && row.thac0 < bestBaseThac0) {
      bestBaseThac0 = row.thac0;
    }
    if (cls.resourceType !== 'none') {
      resourceType = cls.resourceType;
    }
    if (row) {
      const wisBonus = cls.spellSchool === 'cleric' ? getWisBonusSlots(effectiveStats.WIS) : [0, 0, 0, 0, 0, 0];
      for (let tierIdx = 0; tierIdx < 6; tierIdx++) {
        const baseSlot = row.spellSlots[tierIdx] ?? 0;
        if (baseSlot > 0) {
          maxSpellSlots[tierIdx] += baseSlot + (wisBonus[tierIdx] ?? 0);
        }
      }
    }
    if (
      cls.primeRequisite.length > 0 &&
      cls.primeRequisite.every(
        (statId) => effectiveStats[statId] >= bundle.globalRules.primeRequisiteXpThreshold
      )
    ) {
      hasPrimeXpBonus = true;
    }
  }

  const strAttackMod = getStrAttackMod(effectiveStats.STR);
  const strDamageMod = getStrDamageMod(effectiveStats.STR);
  const dexAcMod = getDexAcMod(effectiveStats.DEX);
  const conHpMod = getConHpMod(effectiveStats.CON, isWarrior);

  const itemMap = new Map<string, ItemDef>(bundle.items.map((i) => [i.id, i]));
  const mainWeapon = member.equipped.main_hand ? itemMap.get(member.equipped.main_hand) : undefined;
  const weaponMagicBonus = mainWeapon?.weaponStats?.magicBonus ?? 0;
  const blessedBonus = member.activeStatuses.includes('blessed') ? 1 : 0;

  // Base AC starts at 10 (unarmored), replaced by chest armor or base AC spells (non-stacking: take best/lowest)
  let baseAc = 10;
  const chestItem = member.equipped.chest ? itemMap.get(member.equipped.chest) : undefined;
  if (chestItem?.armorStats?.baseAc !== undefined) {
    baseAc = Math.min(baseAc, chestItem.armorStats.baseAc);
  }
  if (member.activeStatuses.includes('armor_spell')) {
    baseAc = Math.min(baseAc, 6);
  }
  if (member.activeStatuses.includes('shield_spell')) {
    baseAc = Math.min(baseAc, 4);
  }

  let shieldAndMiscBonus = 0;
  for (const slot of ['off_hand', 'head', 'hands', 'feet', 'neck', 'ring'] as const) {
    const eqId = member.equipped[slot];
    if (!eqId) continue;
    const eq = itemMap.get(eqId);
    if (eq?.armorStats?.acBonus) {
      shieldAndMiscBonus += eq.armorStats.acBonus;
    }
  }

  const protEvilBonus = member.activeStatuses.includes('protected_evil') ? 2 : 0;
  const effectiveAc = baseAc - dexAcMod - shieldAndMiscBonus - protEvilBonus;
  const modifiedThac0 = bestBaseThac0 - strAttackMod - weaponMagicBonus - blessedBonus;

  const isAlive =
    member.currentHp > 0 &&
    !member.activeStatuses.includes('dead') &&
    !member.activeStatuses.includes('downed');

  return {
    state: member,
    effectiveStats,
    strAttackMod,
    strDamageMod,
    dexAcMod,
    conHpMod,
    wisBonusSlots: getWisBonusSlots(effectiveStats.WIS),
    baseThac0: bestBaseThac0,
    modifiedThac0,
    effectiveAc,
    maxSpellSlots,
    resourceType,
    hasPrimeXpBonus,
    isAlive,
  };
}

export interface AttackResolutionInput {
  modifiedThac0: number;
  effectiveTargetAc: number;
  damageDice: string;
  damageType: DamageType;
  strDamageMod: number;
  weaponMagicBonus: number;
  targetResistances: Partial<Record<DamageType, number>>;
  critHitD20?: number;
  critMissD20?: number;
}

export interface AttackResolutionResult {
  d20Roll: number;
  requiredRoll: number;
  hit: boolean;
  isCrit: boolean;
  isCritMiss: boolean;
  rawDamage: number;
  finalDamage: number;
}

export function resolveThac0Attack(
  input: AttackResolutionInput,
  rng: RngFn = Math.random
): AttackResolutionResult {
  const critHit = input.critHitD20 ?? 20;
  const critMiss = input.critMissD20 ?? 1;
  const d20Roll = Math.floor(rng() * 20) + 1;
  const requiredRoll = input.modifiedThac0 - input.effectiveTargetAc;

  let hit: boolean;
  let isCrit = false;
  let isCritMiss = false;

  if (d20Roll === critHit) {
    hit = true;
    isCrit = true;
  } else if (d20Roll === critMiss) {
    hit = false;
    isCritMiss = true;
  } else {
    hit = d20Roll >= requiredRoll;
  }

  if (!hit) {
    return {
      d20Roll,
      requiredRoll,
      hit: false,
      isCrit,
      isCritMiss,
      rawDamage: 0,
      finalDamage: 0,
    };
  }

  const diceRoll = rollDiceExpression(input.damageDice, rng).total;
  const rawDamage = diceRoll + input.strDamageMod + input.weaponMagicBonus;
  const resist = input.targetResistances[input.damageType] ?? 0;
  const multiplier = Math.max(0, 1 - resist);
  const finalDamage = resist >= 1 ? 0 : Math.max(1, Math.floor(rawDamage * multiplier));

  return {
    d20Roll,
    requiredRoll,
    hit: true,
    isCrit,
    isCritMiss,
    rawDamage,
    finalDamage,
  };
}

export function calculateSpellDamage(
  spell: SpellDef,
  casterLevel: number,
  targetResistances: Partial<Record<DamageType, number>>,
  rng: RngFn = Math.random
): number {
  const dice = spell.formula.dice;
  if (!dice) return 0;

  let raw = 0;
  if (spell.formula.scalesWithCasterLevel) {
    if (spell.id === 'magic_missile') {
      const missiles = Math.min(5, 1 + Math.floor((casterLevel - 1) / 2));
      for (let i = 0; i < missiles; i++) {
        raw += rollDiceExpression(dice, rng).total;
      }
    } else {
      for (let i = 0; i < Math.max(1, casterLevel); i++) {
        raw += rollDiceExpression(dice, rng).total;
      }
    }
  } else {
    raw = rollDiceExpression(dice, rng).total;
  }

  const dmgType = spell.formula.damageType ?? 'magic';
  const resist = targetResistances[dmgType] ?? 0;
  if (resist >= 1) return 0;
  return Math.max(1, Math.floor(raw * Math.max(0, 1 - resist)));
}

export function resolveMoraleCheck(
  currentMorale: number,
  moraleCheckDice: string = '2d6',
  rng: RngFn = Math.random
): { roll2d6: number; broken: boolean } {
  const roll2d6 = rollDiceExpression(moraleCheckDice, rng).total;
  return {
    roll2d6,
    broken: roll2d6 > currentMorale,
  };
}

export function applyXpWithProgression(
  bundle: RulesetBundle,
  member: CharacterSheetState,
  baseXp: number,
  rng: RngFn = Math.random
): Array<{
  classId: string;
  awardedXp: number;
  primeRequisiteBonusApplied: boolean;
  previousLevel: number;
  newLevel: number;
  hpGained: number;
}> {
  const race = bundle.races.find((r) => r.id === member.raceId);
  const effStats = computeEffectiveStats(member, race);
  const classCount = Math.max(1, member.classIds.length);
  const splitBaseXp = Math.floor(baseXp / classCount);
  const outcomes: Array<{
    classId: string;
    awardedXp: number;
    primeRequisiteBonusApplied: boolean;
    previousLevel: number;
    newLevel: number;
    hpGained: number;
  }> = [];

  for (const cid of member.classIds) {
    const cls = bundle.classes.find((c) => c.id === cid);
    if (!cls) continue;

    const qualifiesBonus =
      cls.primeRequisite.length > 0 &&
      cls.primeRequisite.every(
        (statId) => effStats[statId] >= bundle.globalRules.primeRequisiteXpThreshold
      );

    const multiplier = qualifiesBonus ? 1 + bundle.globalRules.primeRequisiteXpBonus : 1;
    const awardedXp = Math.floor(splitBaseXp * multiplier);
    const previousLevel = member.levels[cid] ?? 1;
    const newTotalXp = (member.xp[cid] ?? 0) + awardedXp;
    member.xp[cid] = newTotalXp;

    let newLevel = previousLevel;
    for (const row of cls.progression) {
      if (newTotalXp >= row.xpRequired && row.level > newLevel) {
        newLevel = row.level;
      }
    }

    let hpGained = 0;
    if (newLevel > previousLevel) {
      const isWarrior = ['fighter', 'ranger', 'paladin'].includes(cls.id);
      const conMod = getConHpMod(effStats.CON, isWarrior);
      for (let lvl = previousLevel + 1; lvl <= newLevel; lvl++) {
        const row = getClassLevelRow(cls, lvl);
        const rolled = rollDiceExpression(row.hpGainDice, rng).total;
        const perLevel = Math.max(1, Math.floor((rolled + (row.hpGainDice.startsWith('+') ? 0 : conMod)) / classCount));
        hpGained += perLevel;
      }
      member.levels[cid] = newLevel;
      member.maxHp += hpGained;
      member.currentHp = Math.min(member.maxHp, member.currentHp + hpGained);
    }

    outcomes.push({
      classId: cid,
      awardedXp,
      primeRequisiteBonusApplied: qualifiesBonus,
      previousLevel,
      newLevel,
      hpGained,
    });
  }

  return outcomes;
}

export function isTargetImmuneToSpell(
  spell: SpellDef,
  target: { isUndead?: boolean; raceDef?: RaceDef }
): boolean {
  const tags = spell.formula.immuneTags ?? [];
  if (target.isUndead && tags.includes('undead')) {
    return true;
  }
  if (spell.id === 'raise_dead' && target.raceDef?.immunities.raiseDead) {
    return true;
  }
  if (
    (spell.id === 'hold_person_mage' || spell.id === 'hold_person_cleric') &&
    target.raceDef?.immunities.holdPerson
  ) {
    return true;
  }
  if (spell.id === 'fear' && target.raceDef?.immunities.fear) {
    return true;
  }
  return false;
}

export function pickMonsterTarget(party: CharacterSheetState[], rng: RngFn = Math.random): CharacterSheetState | undefined {
  const living = party.filter(
    (m) => m.currentHp > 0 && !m.activeStatuses.includes('dead') && !m.activeStatuses.includes('downed')
  );
  if (living.length === 0) return undefined;
  const front = living.filter((m) => m.row === 'front');
  const pool = front.length > 0 ? front : living;
  return pool[Math.floor(rng() * pool.length)];
}

export function getActiveMonsterCount(monsters: MonsterInstance[]): number {
  return monsters.filter((m) => m.currentHp > 0 && !m.moraleBroken).length;
}
