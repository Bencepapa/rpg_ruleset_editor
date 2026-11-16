import { create } from 'zustand';
import defaultRulesetData from '../../../data/ruleset/default-ruleset.json';
import {
  CheckRuleDef,
  ClassDef,
  EditorTabId,
  ItemDef,
  Locale,
  MonsterDef,
  PartyPresetDef,
  RaceDef,
  RulesetBundle,
  RulesetBundleSchema,
  SpellDef,
  ValidationIssue,
} from '../../types/ruleset.types';
import { validateRuleset } from '../../engine/validator';

const DRAFT_STORAGE_KEY = 'rpg_core_ruleset_draft_v1';
const MAX_HISTORY = 50;

function cloneBundle(bundle: RulesetBundle): RulesetBundle {
  return JSON.parse(JSON.stringify(bundle)) as RulesetBundle;
}

export function getDefaultRulesetBundle(): RulesetBundle {
  return cloneBundle(defaultRulesetData as unknown as RulesetBundle);
}

function loadInitialBundle(): RulesetBundle {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = RulesetBundleSchema.safeParse(JSON.parse(saved));
        if (parsed.success) {
          return parsed.data as RulesetBundle;
        }
      }
    }
  } catch {
    // Ignore storage errors and fall back to default bundle
  }
  return getDefaultRulesetBundle();
}

function persistDraft(bundle: RulesetBundle): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(bundle));
    }
  } catch {
    // Ignore quota errors
  }
}

function getDefaultSelectedMap(bundle: RulesetBundle): Record<EditorTabId, string> {
  return {
    stats: bundle.checkRules[0]?.id ?? '',
    classes: bundle.classes[0]?.id ?? '',
    races: bundle.races[0]?.id ?? '',
    spells: bundle.spells[0]?.id ?? '',
    items: bundle.items[0]?.id ?? '',
    monsters: bundle.monsters[0]?.id ?? '',
    party: bundle.partyPresets[0]?.id ?? '',
    translations: '',
    test: '',
  };
}

interface RulesetEditorState {
  bundle: RulesetBundle;
  past: RulesetBundle[];
  future: RulesetBundle[];
  dirty: boolean;
  locale: Locale;
  activeTab: EditorTabId;
  selectedEntityId: Record<EditorTabId, string>;
  searchQuery: string;
  validationIssues: ValidationIssue[];

  setLocale: (locale: Locale) => void;
  setActiveTab: (tab: EditorTabId) => void;
  setSelectedEntityId: (tab: EditorTabId, id: string) => void;
  setSearchQuery: (q: string) => void;
  updateBundle: (updater: (draft: RulesetBundle) => void) => void;
  undo: () => void;
  redo: () => void;
  importBundle: (bundle: RulesetBundle) => void;
  resetToDefault: () => void;
  markSaved: () => void;
  addEntity: (tab: EditorTabId) => void;
  duplicateEntity: (tab: EditorTabId, entityId: string) => void;
  deleteEntity: (tab: EditorTabId, entityId: string) => void;
  addSupportedLocale: (code: string) => void;
}

const initialBundle = loadInitialBundle();

export const useRulesetEditorStore = create<RulesetEditorState>((set, get) => ({
  bundle: initialBundle,
  past: [],
  future: [],
  dirty: false,
  locale: 'en',
  activeTab: 'classes',
  selectedEntityId: getDefaultSelectedMap(initialBundle),
  searchQuery: '',
  validationIssues: validateRuleset(initialBundle),

  setLocale: (locale) => set({ locale }),
  setActiveTab: (activeTab) => set({ activeTab, searchQuery: '' }),
  setSelectedEntityId: (tab, id) =>
    set((state) => ({
      selectedEntityId: { ...state.selectedEntityId, [tab]: id },
    })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  updateBundle: (updater) => {
    const prev = get().bundle;
    const next = cloneBundle(prev);
    updater(next);
    const past = [...get().past.slice(-(MAX_HISTORY - 1)), prev];
    const validationIssues = validateRuleset(next);
    persistDraft(next);
    set({
      bundle: next,
      past,
      future: [],
      dirty: true,
      validationIssues,
    });
  },

  undo: () => {
    const { past, bundle, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const nextPast = past.slice(0, -1);
    const nextFuture = [bundle, ...future.slice(0, MAX_HISTORY - 1)];
    persistDraft(previous);
    set({
      bundle: previous,
      past: nextPast,
      future: nextFuture,
      dirty: true,
      validationIssues: validateRuleset(previous),
    });
  },

  redo: () => {
    const { past, bundle, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    const nextFuture = future.slice(1);
    const nextPast = [...past.slice(-(MAX_HISTORY - 1)), bundle];
    persistDraft(next);
    set({
      bundle: next,
      past: nextPast,
      future: nextFuture,
      dirty: true,
      validationIssues: validateRuleset(next),
    });
  },

  importBundle: (imported) => {
    const clean = cloneBundle(imported);
    const prev = get().bundle;
    persistDraft(clean);
    set({
      bundle: clean,
      past: [...get().past.slice(-(MAX_HISTORY - 1)), prev],
      future: [],
      dirty: true,
      selectedEntityId: getDefaultSelectedMap(clean),
      validationIssues: validateRuleset(clean),
    });
  },

  resetToDefault: () => {
    const def = getDefaultRulesetBundle();
    const prev = get().bundle;
    persistDraft(def);
    set({
      bundle: def,
      past: [...get().past.slice(-(MAX_HISTORY - 1)), prev],
      future: [],
      dirty: true,
      selectedEntityId: getDefaultSelectedMap(def),
      validationIssues: validateRuleset(def),
    });
  },

  markSaved: () => {
    persistDraft(get().bundle);
    set({ dirty: false });
  },

  addEntity: (tab) => {
    const uid = Math.random().toString(36).slice(2, 6);
    let createdId = '';
    get().updateBundle((draft) => {
      if (tab === 'stats') {
        createdId = `CHECK_${uid.toUpperCase()}`;
        const rule: CheckRuleDef = {
          id: createdId,
          name: { en: 'New Check Rule', hu: 'Új próba szabály' },
          formula: '1d20 + dexMod',
          defaultDc: 12,
        };
        draft.checkRules.push(rule);
      } else if (tab === 'classes') {
        createdId = `class_${uid}`;
        const template = draft.classes[0];
        const cls: ClassDef = {
          ...(template ? cloneBundle(template as unknown as RulesetBundle) as unknown as ClassDef : {
            resourceType: 'none',
            primeRequisite: ['STR'],
            hitDie: 'd8',
            allowedArmorMax: 'heavy',
            allowedShieldMax: 'medium',
            allowedWeaponTags: ['sword'],
            canDualWield: false,
            spellSchool: 'none',
            progression: Array.from({ length: 13 }, (_, idx) => ({
              level: idx + 1,
              xpRequired: idx === 0 ? 0 : idx * 2000,
              hpGainDice: idx < 9 ? '1d8' : '+2',
              thac0: Math.max(8, 20 - idx),
              spellSlots: [0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number],
            })),
          }),
          id: createdId,
          name: { en: 'New Class', hu: 'Új kaszt' },
          description: { en: 'Custom adventurer class.', hu: 'Egyedi kalandozó kaszt.' },
        };
        draft.classes.push(cls);
      } else if (tab === 'races') {
        createdId = `race_${uid}`;
        const race: RaceDef = {
          id: createdId,
          name: { en: 'New Race', hu: 'Új faj' },
          playable: true,
          statModifiers: {},
          baseMorale: 8,
          allowedClassIds: ['fighter'],
          allowedMulticlassIds: [],
          immunities: {},
        };
        draft.races.push(race);
      } else if (tab === 'spells') {
        createdId = `spell_${uid}`;
        const spell: SpellDef = {
          id: createdId,
          name: { en: 'New Spell', hu: 'Új varázslat' },
          school: 'mage',
          tier: 1,
          category: 'offensive',
          targetScope: 'single_enemy',
          requiresFrontRow: false,
          castTimeMs: 500,
          formula: { effectType: 'damage', dice: '1d6', damageType: 'magic' },
          description: { en: 'Arcane spell effect.', hu: 'Arkán varázslat hatás.' },
        };
        draft.spells.push(spell);
      } else if (tab === 'items') {
        createdId = `item_${uid}`;
        const item: ItemDef = {
          id: createdId,
          name: { en: 'New Item', hu: 'Új tárgy' },
          category: 'weapon',
          slot: 'main_hand',
          inventoryIconId: `icon_${createdId}`,
          worldVisualId: `mesh_${createdId}`,
          weight: 3,
          goldValue: 10,
          stackable: false,
          maxStack: 1,
          identifiedByDefault: true,
          weaponStats: {
            damageDice: '1d6',
            damageType: 'slashing',
            magicBonus: 0,
            attackSpeedMs: 1400,
            range: 'melee',
            twoHanded: false,
            tags: ['sword'],
          },
        };
        draft.items.push(item);
      } else if (tab === 'monsters') {
        createdId = `monster_${uid}`;
        const mon: MonsterDef = {
          id: createdId,
          name: { en: 'New Monster', hu: 'Új szörny' },
          actorVisualId: `actor_${createdId}`,
          isUndead: false,
          levelOrHd: 2,
          maxHpDice: '2d8',
          baseAc: 6,
          thac0: 19,
          morale: 8,
          xpReward: 65,
          attacks: [
            { name: { en: 'Claw', hu: 'Karom' }, damageDice: '1d6', damageType: 'slashing', attackSpeedMs: 1500 },
          ],
          resistances: {},
          lootTable: [],
        };
        draft.monsters.push(mon);
      } else if (tab === 'party') {
        createdId = `party_${uid}`;
        const base = draft.partyPresets[0];
        const preset: PartyPresetDef = {
          id: createdId,
          name: { en: 'New Party Preset', hu: 'Új csapat sablon' },
          members: base ? JSON.parse(JSON.stringify(base.members)) : [],
        };
        draft.partyPresets.push(preset);
      }
    });
    if (createdId) {
      get().setSelectedEntityId(tab, createdId);
    }
  },

  duplicateEntity: (tab, entityId) => {
    const uid = Math.random().toString(36).slice(2, 5);
    let newId = '';
    get().updateBundle((draft) => {
      const copyWithSuffix = <T extends { id: string; name: { en: string; hu: string } }>(
        list: T[],
        transform?: (copy: T) => void
      ) => {
        const orig = list.find((e) => e.id === entityId);
        if (!orig) return;
        const copy = JSON.parse(JSON.stringify(orig)) as T;
        newId = `${orig.id}_${uid}`;
        copy.id = newId;
        copy.name = { en: `${orig.name.en} (Copy)`, hu: `${orig.name.hu} (Másolat)` };
        transform?.(copy);
        list.push(copy);
      };

      if (tab === 'stats') copyWithSuffix(draft.checkRules);
      else if (tab === 'classes') copyWithSuffix(draft.classes);
      else if (tab === 'races') copyWithSuffix(draft.races);
      else if (tab === 'spells') copyWithSuffix(draft.spells);
      else if (tab === 'items') copyWithSuffix(draft.items);
      else if (tab === 'monsters') copyWithSuffix(draft.monsters);
      else if (tab === 'party') copyWithSuffix(draft.partyPresets);
    });
    if (newId) {
      get().setSelectedEntityId(tab, newId);
    }
  },

  deleteEntity: (tab, entityId) => {
    let fallbackId = '';
    get().updateBundle((draft) => {
      const removeFrom = <T extends { id: string }>(arr: T[]): T[] => {
        const filtered = arr.filter((x) => x.id !== entityId);
        fallbackId = filtered[0]?.id ?? '';
        return filtered;
      };
      if (tab === 'stats') draft.checkRules = removeFrom(draft.checkRules);
      else if (tab === 'classes') draft.classes = removeFrom(draft.classes);
      else if (tab === 'races') draft.races = removeFrom(draft.races);
      else if (tab === 'spells') draft.spells = removeFrom(draft.spells);
      else if (tab === 'items') draft.items = removeFrom(draft.items);
      else if (tab === 'monsters') draft.monsters = removeFrom(draft.monsters);
      else if (tab === 'party') draft.partyPresets = removeFrom(draft.partyPresets);
    });
    get().setSelectedEntityId(tab, fallbackId);
  },

  addSupportedLocale: (rawCode) => {
    const code = rawCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (code.length < 2 || code.length > 8) return;
    get().updateBundle((draft) => {
      const existing = new Set<string>(['en', 'hu', ...(draft.supportedLocales ?? [])]);
      existing.add(code);
      draft.supportedLocales = Array.from(existing);
    });
  },
}));
