import { LocalizedText, RulesetBundle } from '../types/ruleset.types';

export type TranslationCategory =
  | 'general'
  | 'stats'
  | 'classes'
  | 'races'
  | 'spells'
  | 'items'
  | 'monsters'
  | 'party';

export interface TranslationEntry {
  key: string;
  category: TranslationCategory;
  entityId?: string;
  entityLabel: string;
  fieldLabel: string;
  multiline?: boolean;
  value: LocalizedText;
}

export function extractTranslationEntries(bundle: RulesetBundle): TranslationEntry[] {
  const entries: TranslationEntry[] = [];

  entries.push({
    key: 'bundle.title',
    category: 'general',
    entityLabel: bundle.rulesetId,
    fieldLabel: 'Ruleset Title',
    value: bundle.title,
  });

  for (const rule of bundle.checkRules) {
    entries.push({
      key: `check.${rule.id}.name`,
      category: 'stats',
      entityId: rule.id,
      entityLabel: rule.id,
      fieldLabel: 'Rule Name',
      value: rule.name,
    });
  }

  for (const cls of bundle.classes) {
    entries.push({
      key: `class.${cls.id}.name`,
      category: 'classes',
      entityId: cls.id,
      entityLabel: cls.id,
      fieldLabel: 'Name',
      value: cls.name,
    });
    entries.push({
      key: `class.${cls.id}.description`,
      category: 'classes',
      entityId: cls.id,
      entityLabel: cls.id,
      fieldLabel: 'Description',
      multiline: true,
      value: cls.description,
    });
  }

  for (const race of bundle.races) {
    entries.push({
      key: `race.${race.id}.name`,
      category: 'races',
      entityId: race.id,
      entityLabel: race.id,
      fieldLabel: 'Name',
      value: race.name,
    });
  }

  for (const spell of bundle.spells) {
    entries.push({
      key: `spell.${spell.id}.name`,
      category: 'spells',
      entityId: spell.id,
      entityLabel: `${spell.id} (T${spell.tier})`,
      fieldLabel: 'Name',
      value: spell.name,
    });
    entries.push({
      key: `spell.${spell.id}.description`,
      category: 'spells',
      entityId: spell.id,
      entityLabel: `${spell.id} (T${spell.tier})`,
      fieldLabel: 'Description',
      multiline: true,
      value: spell.description,
    });
  }

  for (const item of bundle.items) {
    entries.push({
      key: `item.${item.id}.name`,
      category: 'items',
      entityId: item.id,
      entityLabel: `${item.id} (${item.category})`,
      fieldLabel: 'Name',
      value: item.name,
    });
  }

  for (const mon of bundle.monsters) {
    entries.push({
      key: `monster.${mon.id}.name`,
      category: 'monsters',
      entityId: mon.id,
      entityLabel: mon.id,
      fieldLabel: 'Name',
      value: mon.name,
    });
    mon.attacks.forEach((atk, idx) => {
      entries.push({
        key: `monster.${mon.id}.attack.${idx}.name`,
        category: 'monsters',
        entityId: mon.id,
        entityLabel: mon.id,
        fieldLabel: `Attack #${idx + 1}`,
        value: atk.name,
      });
    });
  }

  for (const preset of bundle.partyPresets) {
    entries.push({
      key: `party.${preset.id}.name`,
      category: 'party',
      entityId: preset.id,
      entityLabel: preset.id,
      fieldLabel: 'Preset Name',
      value: preset.name,
    });
  }

  return entries;
}

export function updateTranslationByKey(
  draft: RulesetBundle,
  key: string,
  lang: string,
  nextValue: string
): boolean {
  if (key === 'bundle.title') {
    draft.title[lang] = nextValue;
    return true;
  }

  const [prefix, ...rest] = key.split('.');
  if (prefix === 'check' && rest.length >= 2) {
    const id = rest.slice(0, -1).join('.');
    const target = draft.checkRules.find((r) => r.id === id);
    if (target) {
      target.name[lang] = nextValue;
      return true;
    }
  } else if (prefix === 'class' && rest.length >= 2) {
    const field = rest[rest.length - 1];
    const id = rest.slice(0, -1).join('.');
    const target = draft.classes.find((c) => c.id === id);
    if (target && (field === 'name' || field === 'description')) {
      target[field][lang] = nextValue;
      return true;
    }
  } else if (prefix === 'race' && rest.length >= 2) {
    const id = rest.slice(0, -1).join('.');
    const target = draft.races.find((r) => r.id === id);
    if (target) {
      target.name[lang] = nextValue;
      return true;
    }
  } else if (prefix === 'spell' && rest.length >= 2) {
    const field = rest[rest.length - 1];
    const id = rest.slice(0, -1).join('.');
    const target = draft.spells.find((s) => s.id === id);
    if (target && (field === 'name' || field === 'description')) {
      target[field][lang] = nextValue;
      return true;
    }
  } else if (prefix === 'item' && rest.length >= 2) {
    const id = rest.slice(0, -1).join('.');
    const target = draft.items.find((i) => i.id === id);
    if (target) {
      target.name[lang] = nextValue;
      return true;
    }
  } else if (prefix === 'monster' && rest.length >= 2) {
    if (rest.length >= 4 && rest[rest.length - 3] === 'attack' && rest[rest.length - 1] === 'name') {
      const idx = Number(rest[rest.length - 2]);
      const id = rest.slice(0, -3).join('.');
      const target = draft.monsters.find((m) => m.id === id);
      if (target && Number.isInteger(idx) && target.attacks[idx]) {
        target.attacks[idx].name[lang] = nextValue;
        return true;
      }
    } else {
      const id = rest.slice(0, -1).join('.');
      const target = draft.monsters.find((m) => m.id === id);
      if (target) {
        target.name[lang] = nextValue;
        return true;
      }
    }
  } else if (prefix === 'party' && rest.length >= 2) {
    const id = rest.slice(0, -1).join('.');
    const target = draft.partyPresets.find((p) => p.id === id);
    if (target) {
      target.name[lang] = nextValue;
      return true;
    }
  }

  return false;
}

export function getSupportedLocales(bundle: RulesetBundle): string[] {
  const seen = new Set<string>(['en', 'hu', ...(bundle.supportedLocales ?? [])]);
  const entries = extractTranslationEntries(bundle);
  for (const entry of entries) {
    for (const lang of Object.keys(entry.value)) {
      if (lang.trim()) seen.add(lang.trim());
    }
  }
  return Array.from(seen);
}

export function getLocaleCoverage(
  entries: TranslationEntry[],
  lang: string
): { total: number; translated: number; missing: number; percent: number } {
  const total = entries.length;
  if (total === 0) return { total: 0, translated: 0, missing: 0, percent: 100 };
  let translated = 0;
  for (const entry of entries) {
    if ((entry.value[lang] ?? '').trim().length > 0) {
      translated += 1;
    }
  }
  const missing = total - translated;
  const percent = Math.round((translated / total) * 100);
  return { total, translated, missing, percent };
}
