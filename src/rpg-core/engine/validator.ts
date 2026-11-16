import { RulesetBundle, RulesetBundleSchema, ValidationIssue } from '../types/ruleset.types';

export function validateRuleset(bundle: RulesetBundle): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const parsed = RulesetBundleSchema.safeParse(bundle);
  if (!parsed.success) {
    for (const err of parsed.error.issues.slice(0, 10)) {
      issues.push({
        id: `schema_${err.path.join('_')}`,
        severity: 'error',
        tab: 'stats',
        message: {
          en: `Schema error at ${err.path.join('.')}: ${err.message}`,
          hu: `Séma hiba (${err.path.join('.')}): ${err.message}`,
        },
      });
    }
  }

  const classMap = new Map(bundle.classes.map((c) => [c.id, c]));
  const raceMap = new Map(bundle.races.map((r) => [r.id, r]));
  const spellMap = new Map(bundle.spells.map((s) => [s.id, s]));
  const itemMap = new Map(bundle.items.map((i) => [i.id, i]));

  // Validate Classes
  for (const cls of bundle.classes) {
    if (cls.progression.length < 13) {
      issues.push({
        id: `cls_prog_len_${cls.id}`,
        severity: 'warning',
        tab: 'classes',
        entityId: cls.id,
        message: {
          en: `Class "${cls.name.en}" has ${cls.progression.length} progression rows (expected 13).`,
          hu: `A(z) "${cls.name.hu}" kaszt fejlődési táblája ${cls.progression.length} soros (13 ajánlott).`,
        },
      });
    }
    for (let i = 1; i < cls.progression.length; i++) {
      if (cls.progression[i].xpRequired < cls.progression[i - 1].xpRequired) {
        issues.push({
          id: `cls_xp_order_${cls.id}_${i}`,
          severity: 'error',
          tab: 'classes',
          entityId: cls.id,
          message: {
            en: `Class "${cls.name.en}" level ${cls.progression[i].level} XP must not decrease.`,
            hu: `A(z) "${cls.name.hu}" kaszt ${cls.progression[i].level}. szintű XP értéke nem csökkenhet.`,
          },
        });
      }
    }
    if (cls.id === 'paladin' && (!cls.allowedAlignments || cls.allowedAlignments.some((a) => a !== 'LG'))) {
      issues.push({
        id: `paladin_align_${cls.id}`,
        severity: 'error',
        tab: 'classes',
        entityId: cls.id,
        message: {
          en: `Paladin alignment must be restricted to Lawful Good (LG).`,
          hu: `A Paladin jelleme kizárólag Törvényes Jó (LG) lehet.`,
        },
      });
    }
  }

  // Validate Items (2-asset rule & linked spells)
  for (const item of bundle.items) {
    if (!item.inventoryIconId.trim()) {
      issues.push({
        id: `item_icon_${item.id}`,
        severity: 'error',
        tab: 'items',
        entityId: item.id,
        message: {
          en: `Missing inventoryIconId on item "${item.name.en}".`,
          hu: `Hiányzó inventoryIconId a(z) "${item.name.hu}" tárgyon.`,
        },
      });
    }
    if (!item.worldVisualId.trim()) {
      issues.push({
        id: `item_world_${item.id}`,
        severity: 'error',
        tab: 'items',
        entityId: item.id,
        message: {
          en: `Missing worldVisualId on item "${item.name.en}".`,
          hu: `Hiányzó worldVisualId a(z) "${item.name.hu}" tárgyon.`,
        },
      });
    }
    if (item.category === 'scroll' && (!item.linkedSpellId || !spellMap.has(item.linkedSpellId))) {
      issues.push({
        id: `item_scroll_${item.id}`,
        severity: 'error',
        tab: 'items',
        entityId: item.id,
        message: {
          en: `Scroll "${item.name.en}" references missing spell "${item.linkedSpellId ?? ''}".`,
          hu: `A(z) "${item.name.hu}" tekercs érvénytelen varázslatra hivatkozik.`,
        },
      });
    }
  }

  // Validate Monsters
  for (const mon of bundle.monsters) {
    if (!mon.actorVisualId.trim()) {
      issues.push({
        id: `mon_visual_${mon.id}`,
        severity: 'error',
        tab: 'monsters',
        entityId: mon.id,
        message: {
          en: `Monster "${mon.name.en}" is missing actorVisualId.`,
          hu: `A(z) "${mon.name.hu}" szörnynél hiányzik az actorVisualId.`,
        },
      });
    }
    if (mon.attacks.length === 0) {
      issues.push({
        id: `mon_attacks_${mon.id}`,
        severity: 'warning',
        tab: 'monsters',
        entityId: mon.id,
        message: {
          en: `Monster "${mon.name.en}" has no defined attacks.`,
          hu: `A(z) "${mon.name.hu}" szörnynek nincs megadott támadása.`,
        },
      });
    }
    for (const loot of mon.lootTable) {
      if (!itemMap.has(loot.itemId)) {
        issues.push({
          id: `mon_loot_${mon.id}_${loot.itemId}`,
          severity: 'error',
          tab: 'monsters',
          entityId: mon.id,
          message: {
            en: `Monster "${mon.name.en}" loot references unknown item "${loot.itemId}".`,
            hu: `A(z) "${mon.name.hu}" zsákmánya ismeretlen tárgyra hivatkozik: "${loot.itemId}".`,
          },
        });
      }
    }
  }

  // Validate Party Presets
  for (const preset of bundle.partyPresets) {
    for (const member of preset.members) {
      if (!raceMap.has(member.raceId)) {
        issues.push({
          id: `party_race_${preset.id}_${member.id}`,
          severity: 'error',
          tab: 'party',
          entityId: preset.id,
          message: {
            en: `${member.name} references unknown race "${member.raceId}".`,
            hu: `${member.name} ismeretlen fajra hivatkozik: "${member.raceId}".`,
          },
        });
      }
      for (const cid of member.classIds) {
        const cls = classMap.get(cid);
        if (!cls) {
          issues.push({
            id: `party_cls_${preset.id}_${member.id}_${cid}`,
            severity: 'error',
            tab: 'party',
            entityId: preset.id,
            message: {
              en: `${member.name} references unknown class "${cid}".`,
              hu: `${member.name} ismeretlen kasztra hivatkozik: "${cid}".`,
            },
          });
          continue;
        }
        if (cls.allowedAlignments && !cls.allowedAlignments.includes(member.alignment)) {
          issues.push({
            id: `party_align_${preset.id}_${member.id}`,
            severity: 'error',
            tab: 'party',
            entityId: preset.id,
            message: {
              en: `${member.name} (${cls.name.en}) alignment must be ${cls.allowedAlignments.join('/')}.`,
              hu: `${member.name} (${cls.name.hu}) jelleme csak ${cls.allowedAlignments.join('/')} lehet.`,
            },
          });
        }
        if (cls.allowedRaces && !cls.allowedRaces.includes(member.raceId)) {
          issues.push({
            id: `party_cls_race_${preset.id}_${member.id}`,
            severity: 'error',
            tab: 'party',
            entityId: preset.id,
            message: {
              en: `${member.name}: ${cls.name.en} is restricted to ${cls.allowedRaces.join(', ')}.`,
              hu: `${member.name}: a(z) ${cls.name.hu} csak ${cls.allowedRaces.join(', ')} faj lehet.`,
            },
          });
        }
      }
    }
  }

  return issues;
}
