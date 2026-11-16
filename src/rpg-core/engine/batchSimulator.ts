import { CharacterSheetState, RulesetBundle } from '../types/ruleset.types';
import { createSeededRng } from './dice';
import { getActiveMonsterCount, pickMonsterTarget } from './rulesEngine';
import { RpgRuntime } from '../runtime/RpgRuntime';

export interface BatchSimRequest {
  bundle: RulesetBundle;
  partyMembers: CharacterSheetState[];
  monsterIds: string[];
  iterations: number;
  seed?: number;
}

export interface BatchSimResult {
  iterations: number;
  elapsedMs: number;
  partyWins: number;
  partyLosses: number;
  winRatePercent: number;
  avgRounds: number;
  totalPartyDeaths: number;
  enemyMoraleBreaks: number;
}

export function runBatchSimulation(req: BatchSimRequest): BatchSimResult {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const iterations = Math.max(1, Math.min(500, req.iterations || 50));
  const rng = createSeededRng(req.seed ?? 1337);

  let partyWins = 0;
  let partyLosses = 0;
  let totalRounds = 0;
  let totalPartyDeaths = 0;
  let enemyMoraleBreaks = 0;

  for (let i = 0; i < iterations; i++) {
    const runtime = new RpgRuntime(req.bundle, rng);
    runtime.loadParty(req.partyMembers);
    runtime.fullRestoreParty();
    runtime.spawnEncounter(req.monsterIds);

    let rounds = 0;
    const maxRounds = 30;

    while (rounds < maxRounds) {
      rounds++;
      const party = runtime.getActiveParty();
      const monsters = runtime.getActiveEncounter();

      // Party turns
      for (const member of party) {
        if (member.currentHp <= 0 || member.activeStatuses.includes('downed')) continue;
        const activeMonsters = monsters.filter((m) => m.currentHp > 0 && !m.moraleBroken);
        if (activeMonsters.length === 0) break;

        // Simple smart action: healer heals if someone < 45% HP, else cast offensive spell or attack
        const woundedAlly = party.find(
          (a) => a.currentHp > 0 && a.currentHp < a.maxHp * 0.45
        );
        const healSpellId = member.memorizedSpellIds.find((sid) => {
          const s = req.bundle.spells.find((sp) => sp.id === sid);
          return s?.formula.effectType === 'heal';
        });

        if (woundedAlly && healSpellId) {
          runtime.castSpell({
            casterId: member.id,
            spellId: healSpellId,
            targetIds: [woundedAlly.id],
            source: 'memorized',
          });
          continue;
        }

        const offSpellId = member.memorizedSpellIds.find((sid) => {
          const s = req.bundle.spells.find((sp) => sp.id === sid);
          if (!s || s.formula.effectType !== 'damage') return false;
          if (s.requiresFrontRow && member.row !== 'front') return false;
          return true;
        });

        if (offSpellId) {
          const sDef = req.bundle.spells.find((sp) => sp.id === offSpellId)!;
          const targetIds =
            sDef.targetScope === 'all_enemies' || sDef.targetScope === 'front_row_enemies'
              ? activeMonsters.map((m) => m.instanceId)
              : [activeMonsters[0].instanceId];
          runtime.castSpell({
            casterId: member.id,
            spellId: offSpellId,
            targetIds,
            source: 'memorized',
          });
          continue;
        }

        runtime.performAttack({
          attackerId: member.id,
          targetId: activeMonsters[0].instanceId,
        });
      }

      if (getActiveMonsterCount(monsters) === 0) {
        partyWins++;
        break;
      }

      // Monster turns
      for (const mon of monsters) {
        if (mon.currentHp <= 0 || mon.moraleBroken) continue;
        const target = pickMonsterTarget(party, rng);
        if (!target) break;
        runtime.performAttack({
          attackerId: mon.instanceId,
          targetId: target.id,
        });
      }

      const livingParty = party.filter((m) => m.currentHp > 0);
      if (livingParty.length === 0) {
        partyLosses++;
        break;
      }
    }

    const finalParty = runtime.getActiveParty();
    const finalMonsters = runtime.getActiveEncounter();

    if (getActiveMonsterCount(finalMonsters) > 0 && finalParty.some((m) => m.currentHp > 0)) {
      // Timed out after maxRounds: count whoever has more remaining HP% or call loss
      partyLosses++;
    }

    totalRounds += rounds;
    totalPartyDeaths += finalParty.filter((m) => m.currentHp <= 0).length;
    enemyMoraleBreaks += finalMonsters.filter((m) => m.moraleBroken).length;
  }

  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    iterations,
    elapsedMs: Math.max(0.1, Number((end - start).toFixed(2))),
    partyWins,
    partyLosses,
    winRatePercent: Math.round((partyWins / iterations) * 100),
    avgRounds: Number((totalRounds / iterations).toFixed(1)),
    totalPartyDeaths,
    enemyMoraleBreaks,
  };
}
