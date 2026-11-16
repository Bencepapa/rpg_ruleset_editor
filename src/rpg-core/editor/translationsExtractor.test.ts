import test from 'node:test';
import assert from 'node:assert/strict';
import defaultRulesetData from '../../data/ruleset/default-ruleset.json';
import { RulesetBundle } from '../types/ruleset.types';
import {
  extractTranslationEntries,
  getLocaleCoverage,
  getSupportedLocales,
  updateTranslationByKey,
} from './translationsExtractor';

function cloneBundle(): RulesetBundle {
  return JSON.parse(JSON.stringify(defaultRulesetData)) as RulesetBundle;
}

test('extractTranslationEntries gathers every translatable bundle string', () => {
  const bundle = cloneBundle();
  const entries = extractTranslationEntries(bundle);

  const expectedAttackCount = bundle.monsters.reduce((acc, m) => acc + m.attacks.length, 0);
  const expectedCount =
    1 + // bundle.title
    bundle.checkRules.length +
    bundle.classes.length * 2 +
    bundle.races.length +
    bundle.spells.length * 2 +
    bundle.items.length +
    bundle.monsters.length +
    expectedAttackCount +
    bundle.partyPresets.length;

  assert.equal(entries.length, expectedCount);
  assert.ok(entries.some((e) => e.key === 'bundle.title'));
  assert.ok(entries.some((e) => e.key === 'class.fighter.description'));
  assert.ok(entries.some((e) => e.key === 'monster.orc_warrior.attack.0.name'));
});

test('getLocaleCoverage and updateTranslationByKey handle extra languages dynamically', () => {
  const bundle = cloneBundle();
  bundle.supportedLocales = ['en', 'hu', 'de'];

  const initialEntries = extractTranslationEntries(bundle);
  assert.equal(getLocaleCoverage(initialEntries, 'en').missing, 0);
  assert.equal(getLocaleCoverage(initialEntries, 'hu').missing, 0);
  assert.equal(getLocaleCoverage(initialEntries, 'de').translated, 0);
  assert.equal(getLocaleCoverage(initialEntries, 'de').missing, initialEntries.length);

  assert.equal(updateTranslationByKey(bundle, 'class.fighter.name', 'de', 'Kämpfer'), true);
  assert.equal(updateTranslationByKey(bundle, 'monster.orc_warrior.attack.0.name', 'de', 'Axt'), true);
  assert.equal(updateTranslationByKey(bundle, 'nonexistent.key', 'de', 'x'), false);

  const updatedEntries = extractTranslationEntries(bundle);
  assert.equal(getLocaleCoverage(updatedEntries, 'de').translated, 2);
  assert.equal(bundle.classes.find((c) => c.id === 'fighter')?.name.de, 'Kämpfer');
  assert.equal(bundle.classes.find((c) => c.id === 'fighter')?.name.en, 'Fighter');
  assert.deepEqual(getSupportedLocales(bundle), ['en', 'hu', 'de']);
});
