import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RulesetBundle } from '../types/ruleset.types';
import { createSeededRng } from './dice';
import {
  computeCharacterSheet,
  resolveMoraleCheck,
  resolveThac0Attack,
} from './rulesEngine';
import { validateRuleset } from './validator';
import { RpgRuntime } from '../runtime/RpgRuntime';
import { runBatchSimulation } from './batchSimulator';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultBundle = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../data/ruleset/default-ruleset.json'), 'utf-8')
) as RulesetBundle;

test('default-ruleset.json passes validator with zero errors and has 44 spells', () => {
  assert.equal(defaultBundle.spells.length, 44);
  assert.equal(defaultBundle.classes.length, 6);
  assert.equal(defaultBundle.races.length, 6);
  const issues = validateRuleset(defaultBundle);
  const errors = issues.filter((i) => i.severity === 'error');
  assert.equal(errors.length, 0, JSON.stringify(errors));
});

test('THAC0 attack resolution handles auto-hit 20, auto-miss 1, and descending AC math', () => {
  // d20 = 20 -> auto hit
  const critHit = resolveThac0Attack(
    {
      modifiedThac0: 20,
      effectiveTargetAc: -10,
      damageDice: '1d8',
      damageType: 'slashing',
      strDamageMod: 1,
      weaponMagicBonus: 0,
      targetResistances: {},
    },
    () => 0.99 // d20 = 20
  );
  assert.equal(critHit.hit, true);
  assert.equal(critHit.isCrit, true);

  // d20 = 1 -> auto miss
  const critMiss = resolveThac0Attack(
    {
      modifiedThac0: 5,
      effectiveTargetAc: 10,
      damageDice: '1d8',
      damageType: 'slashing',
      strDamageMod: 0,
      weaponMagicBonus: 0,
      targetResistances: {},
    },
    () => 0.0 // d20 = 1
  );
  assert.equal(critMiss.hit, false);
  assert.equal(critMiss.isCritMiss, true);

  // THAC0 16 vs AC 4 -> requiredRoll = 12
  const normalHit = resolveThac0Attack(
    {
      modifiedThac0: 16,
      effectiveTargetAc: 4,
      damageDice: '1d8',
      damageType: 'piercing',
      strDamageMod: 2,
      weaponMagicBonus: 1,
      targetResistances: { piercing: 0.75 },
    },
    () => 0.55 // d20 = 12, d8 = 5 -> raw = 5+2+1 = 8, 75% resist = floor(8*0.25) = 2
  );
  assert.equal(normalHit.requiredRoll, 12);
  assert.equal(normalHit.hit, true);
  assert.equal(normalHit.finalDamage, 2);
});

test('Descending AC and Vancian spellcasting / front-row touch validation work properly', () => {
  const runtime = new RpgRuntime(defaultBundle, createSeededRng(7));
  runtime.spawnEncounter(['orc_warrior']);

  // Aldric has Chainmail (base 5) + Medium Shield (+1) + DEX 14 (0) = AC 4
  const aldricSheet = runtime.getCharacterSheet('char_aldric');
  assert.equal(aldricSheet.effectiveAc, 4);

  // Lyra is in back row; give her Shocking Grasp (requiresFrontRow = true)
  runtime.patchActiveMember('char_lyra', {
    memorizedSpellIds: ['shocking_grasp', 'magic_missile'],
  });

  const touchFail = runtime.castSpell({
    casterId: 'char_lyra',
    spellId: 'shocking_grasp',
    targetIds: ['orc_warrior_1'],
    source: 'memorized',
  });
  assert.equal(touchFail.ok, false);
  assert.equal(touchFail.errorCode, 'INVALID_ROW');

  // Magic Missile consumes 1 memorized slot
  const mmCast = runtime.castSpell({
    casterId: 'char_lyra',
    spellId: 'magic_missile',
    targetIds: ['orc_warrior_1'],
    source: 'memorized',
  });
  assert.equal(mmCast.ok, true);
  const lyraAfter = runtime.getActiveParty().find((m) => m.id === 'char_lyra')!;
  assert.equal(lyraAfter.memorizedSpellIds.includes('magic_missile'), false);

  // Scroll cast bypasses memorized slots
  const scrollOutcome = runtime.useItem({
    actorId: 'char_lyra',
    itemId: 'scroll_fireball',
    targetId: 'orc_warrior_1',
  });
  assert.equal(scrollOutcome.ok, true);
});

test('Prime Requisite >= 16 grants +10% XP and Multiclass splits XP equally', () => {
  const runtime = new RpgRuntime(defaultBundle, createSeededRng(99));
  // Load Skirmish Company which has Brenna (Fighter/Mage, STR 15, INT 17)
  runtime.loadParty(defaultBundle.partyPresets[1].members);

  const outcomes = runtime.awardPartyXp(1000);
  const brennaFighter = outcomes.find((o) => o.memberId === 'char_brenna' && o.classId === 'fighter')!;
  const brennaMage = outcomes.find((o) => o.memberId === 'char_brenna' && o.classId === 'mage')!;

  // 1000 / 2 = 500 base per class. Fighter prime STR=15 (<16) -> 500. Mage prime INT=17 (>=16) -> 550 (+10%)
  assert.equal(brennaFighter.awardedXp, 500);
  assert.equal(brennaFighter.primeRequisiteBonusApplied, false);
  assert.equal(brennaMage.awardedXp, 550);
  assert.equal(brennaMage.primeRequisiteBonusApplied, true);
});

test('2d6 Morale check breaks when roll exceeds threshold', () => {
  const pass = resolveMoraleCheck(8, '2d6', () => 0.4); // each d6 = 3 -> 6 <= 8
  assert.equal(pass.broken, false);
  const fail = resolveMoraleCheck(7, '2d6', () => 0.9); // each d6 = 6 -> 12 > 7
  assert.equal(fail.broken, true);
});

test('Live overrides patchActiveMember & fullRestoreParty and batchSimulator executes cleanly', () => {
  const runtime = new RpgRuntime(defaultBundle, createSeededRng(12));
  runtime.patchActiveMember('char_aldric', { currentHp: 2, activeStatuses: ['poisoned'] });
  assert.equal(runtime.getActiveParty()[0].currentHp, 2);

  runtime.fullRestoreParty();
  assert.equal(runtime.getActiveParty()[0].currentHp, runtime.getActiveParty()[0].maxHp);
  assert.equal(runtime.getActiveParty()[0].activeStatuses.length, 0);

  const sim = runBatchSimulation({
    bundle: defaultBundle,
    partyMembers: defaultBundle.partyPresets[0].members,
    monsterIds: ['orc_warrior', 'orc_warrior', 'skeleton_guard'],
    iterations: 50,
    seed: 12345,
  });
  assert.equal(sim.iterations, 50);
  assert.equal(sim.partyWins + sim.partyLosses, 50);
  assert.ok(sim.winRatePercent >= 0 && sim.winRatePercent <= 100);
});
