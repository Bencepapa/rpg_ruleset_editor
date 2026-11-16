import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeededRng, evaluateCheckFormula, rollDiceExpression } from './dice';

test('rollDiceExpression rolls deterministic seeded dice and flat modifiers', () => {
  const rng1 = createSeededRng(42);
  const rng2 = createSeededRng(42);
  const r1 = rollDiceExpression('2d6+3', rng1);
  const r2 = rollDiceExpression('2d6+3', rng2);
  assert.equal(r1.total, r2.total);
  assert.ok(r1.total >= 5 && r1.total <= 15);
  assert.equal(r1.terms.length, 1);
  assert.equal(r1.terms[0].rolls.length, 2);
  assert.equal(r1.flatBonus, 3);
});

test('rollDiceExpression supports flat-only bonuses like +3 and negative offsets', () => {
  const r = rollDiceExpression('+3');
  assert.equal(r.total, 3);
  const rNeg = rollDiceExpression('1d1-2', () => 0);
  assert.equal(rNeg.total, -1);
});

test('evaluateCheckFormula substitutes negative and positive modifiers cleanly', () => {
  const res = evaluateCheckFormula(
    '1d20 + dexMod + level',
    { dexMod: -2, level: 5 },
    () => 0.45 // d20 = floor(0.45 * 20) + 1 = 10
  );
  assert.equal(res.total, 13);
});
