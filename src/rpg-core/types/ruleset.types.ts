import { z } from 'zod';

export type Locale = 'en' | 'hu';
export type LocalizedText = { en: string; hu: string; [lang: string]: string };

export type PrimaryStatId = 'STR' | 'INT' | 'WIS' | 'DEX' | 'CON' | 'CHA';
export type AlignmentId =
  | 'LG' | 'NG' | 'CG'
  | 'LN' | 'TN' | 'CN'
  | 'LE' | 'NE' | 'CE';

export type DamageType =
  | 'slashing' | 'piercing' | 'bludgeoning'
  | 'fire' | 'cold' | 'lightning' | 'acid' | 'poison' | 'magic' | 'necrotic';

export type StatusEffectId =
  | 'paralyzed' | 'feared' | 'petrified' | 'poisoned' | 'blinded'
  | 'invisible' | 'improved_invisible' | 'hasted' | 'blessed'
  | 'protected_evil' | 'armor_spell' | 'shield_spell' | 'downed' | 'dead';

export type ArmorWeight = 'none' | 'leather' | 'light_metal' | 'heavy';
export type ShieldMax = 'none' | 'small' | 'medium' | 'large';
export type EquipmentSlot = 'main_hand' | 'off_hand' | 'head' | 'chest' | 'hands' | 'feet' | 'neck' | 'ring';

export interface ClassLevelRow {
  level: number;
  xpRequired: number;
  hpGainDice: string;
  thac0: number;
  spellSlots: [number, number, number, number, number, number];
}

export interface ClassDef {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  resourceType: 'mana' | 'energy' | 'none';
  primeRequisite: PrimaryStatId[];
  hitDie: 'd4' | 'd6' | 'd8' | 'd10';
  allowedArmorMax: ArmorWeight;
  allowedShieldMax: ShieldMax;
  allowedWeaponTags: string[];
  canDualWield: boolean;
  spellSchool: 'mage' | 'cleric' | 'none';
  allowedAlignments?: AlignmentId[];
  allowedRaces?: string[];
  progression: ClassLevelRow[];
}

export interface RaceDef {
  id: string;
  name: LocalizedText;
  playable: boolean;
  statModifiers: Partial<Record<PrimaryStatId, number>>;
  baseMorale: number;
  allowedClassIds: string[];
  allowedMulticlassIds: string[];
  immunities: {
    raiseDead?: boolean;
    holdPerson?: boolean;
    fear?: boolean;
    poison?: boolean;
    weightTraps?: boolean;
    arrowCorridorResist?: number;
  };
}

export interface SpellFormula {
  effectType: 'damage' | 'heal' | 'ac_override' | 'buff' | 'debuff' | 'cure_status' | 'utility';
  dice?: string;
  scalesWithCasterLevel?: boolean;
  damageType?: DamageType;
  setBaseAc?: number;
  nonStackingGroup?: string;
  applyStatus?: StatusEffectId;
  removeStatus?: StatusEffectId[];
  durationSec?: number;
  moraleDelta?: number;
  saveNegates?: boolean;
  immuneTags?: string[];
}

export interface SpellDef {
  id: string;
  name: LocalizedText;
  school: 'mage' | 'cleric';
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  category: 'offensive' | 'healing' | 'defensive' | 'support' | 'control' | 'detection';
  targetScope:
    | 'self' | 'single_ally' | 'all_allies'
    | 'single_enemy' | 'front_row_enemies' | 'all_enemies' | 'cross_aoe';
  requiresFrontRow: boolean;
  castTimeMs: number;
  formula: SpellFormula;
  description: LocalizedText;
}

export interface ItemDef {
  id: string;
  name: LocalizedText;
  category: 'weapon' | 'shield' | 'armor' | 'accessory' | 'consumable' | 'scroll' | 'quest' | 'resource';
  slot?: EquipmentSlot;
  inventoryIconId: string;
  worldVisualId: string;
  weight: number;
  goldValue: number;
  stackable: boolean;
  maxStack: number;
  cursed?: boolean;
  identifiedByDefault: boolean;
  weaponStats?: {
    damageDice: string;
    damageType: DamageType;
    magicBonus: number;
    attackSpeedMs: number;
    range: 'melee' | 'ranged';
    twoHanded: boolean;
    tags: string[];
  };
  armorStats?: {
    baseAc?: number;
    acBonus?: number;
    armorWeight: ArmorWeight;
  };
  linkedSpellId?: string;
  consumableEffect?: {
    healDice?: string;
    cureStatus?: StatusEffectId[];
    moraleBonus?: number;
  };
}

export interface MonsterAttackDef {
  name: LocalizedText;
  damageDice: string;
  damageType: DamageType;
  attackSpeedMs: number;
}

export interface MonsterLootEntry {
  itemId: string;
  dropChance: number;
  minQty: number;
  maxQty: number;
}

export interface MonsterDef {
  id: string;
  name: LocalizedText;
  actorVisualId: string;
  isUndead: boolean;
  levelOrHd: number;
  maxHpDice: string;
  baseAc: number;
  thac0: number;
  morale: number;
  xpReward: number;
  attacks: MonsterAttackDef[];
  resistances: Partial<Record<DamageType, number>>;
  lootTable: MonsterLootEntry[];
}

export interface CheckRuleDef {
  id: string;
  name: LocalizedText;
  formula: string;
  defaultDc: number;
}

export interface CharacterSheetState {
  id: string;
  name: string;
  portraitId: string;
  raceId: string;
  classIds: string[];
  alignment: AlignmentId;
  row: 'front' | 'back';
  levels: Record<string, number>;
  xp: Record<string, number>;
  stats: Record<PrimaryStatId, number>;
  currentHp: number;
  maxHp: number;
  morale: number;
  equipped: Partial<Record<EquipmentSlot, string>>;
  spellbookIds: string[];
  memorizedSpellIds: string[];
  activeStatuses: StatusEffectId[];
}

export interface PartyPresetDef {
  id: string;
  name: LocalizedText;
  members: CharacterSheetState[];
}

export interface GlobalRulesDef {
  primeRequisiteXpThreshold: number;
  primeRequisiteXpBonus: number;
  critHitD20: number;
  critMissD20: number;
  moraleCheckDice: string;
}

export interface RulesetBundle {
  schemaVersion: '1.0.0';
  rulesetId: string;
  supportedLocales?: string[];
  title: LocalizedText;
  globalRules: GlobalRulesDef;
  classes: ClassDef[];
  races: RaceDef[];
  spells: SpellDef[];
  items: ItemDef[];
  monsters: MonsterDef[];
  checkRules: CheckRuleDef[];
  partyPresets: PartyPresetDef[];
}

export type EditorTabId =
  | 'stats'
  | 'classes'
  | 'races'
  | 'spells'
  | 'items'
  | 'monsters'
  | 'party'
  | 'translations'
  | 'test';

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  tab: EditorTabId;
  entityId?: string;
  message: LocalizedText;
}

export interface ComputedCharacterSheet {
  state: CharacterSheetState;
  effectiveStats: Record<PrimaryStatId, number>;
  strAttackMod: number;
  strDamageMod: number;
  dexAcMod: number;
  conHpMod: number;
  wisBonusSlots: number[];
  baseThac0: number;
  modifiedThac0: number;
  effectiveAc: number;
  maxSpellSlots: [number, number, number, number, number, number];
  resourceType: 'mana' | 'energy' | 'none';
  hasPrimeXpBonus: boolean;
  isAlive: boolean;
}

export interface MonsterInstance {
  instanceId: string;
  monsterId: string;
  name: LocalizedText;
  isUndead: boolean;
  currentHp: number;
  maxHp: number;
  ac: number;
  thac0: number;
  morale: number;
  moraleBroken: boolean;
  xpReward: number;
  row: 'front' | 'back';
  activeStatuses: StatusEffectId[];
  resistances: Partial<Record<DamageType, number>>;
  attacks: MonsterAttackDef[];
}

export interface ComputedMonsterStatus {
  instance: MonsterInstance;
  effectiveAc: number;
  effectiveThac0: number;
  isAlive: boolean;
}

export interface ComputedItemTooltip {
  item: ItemDef;
  isIdentified: boolean;
  displayMagicBonus: number | null;
  summaryLines: string[];
}

// --- Zod Validation Schemas ---

export const LocalizedTextSchema = z
  .object({
    en: z.string(),
    hu: z.string(),
  })
  .catchall(z.string());

export const PrimaryStatIdSchema = z.enum(['STR', 'INT', 'WIS', 'DEX', 'CON', 'CHA']);
export const AlignmentIdSchema = z.enum(['LG', 'NG', 'CG', 'LN', 'TN', 'CN', 'LE', 'NE', 'CE']);
export const DamageTypeSchema = z.enum([
  'slashing', 'piercing', 'bludgeoning',
  'fire', 'cold', 'lightning', 'acid', 'poison', 'magic', 'necrotic',
]);

export const StatusEffectIdSchema = z.enum([
  'paralyzed', 'feared', 'petrified', 'poisoned', 'blinded',
  'invisible', 'improved_invisible', 'hasted', 'blessed',
  'protected_evil', 'armor_spell', 'shield_spell', 'downed', 'dead',
]);

export const ClassLevelRowSchema = z.object({
  level: z.number().int().min(1).max(20),
  xpRequired: z.number().int().min(0),
  hpGainDice: z.string(),
  thac0: z.number().int().min(1).max(20),
  spellSlots: z.tuple([
    z.number().int().min(0),
    z.number().int().min(0),
    z.number().int().min(0),
    z.number().int().min(0),
    z.number().int().min(0),
    z.number().int().min(0),
  ]),
});

export const ClassDefSchema = z.object({
  id: z.string().min(1),
  name: LocalizedTextSchema,
  description: LocalizedTextSchema,
  resourceType: z.enum(['mana', 'energy', 'none']),
  primeRequisite: z.array(PrimaryStatIdSchema),
  hitDie: z.enum(['d4', 'd6', 'd8', 'd10']),
  allowedArmorMax: z.enum(['none', 'leather', 'light_metal', 'heavy']),
  allowedShieldMax: z.enum(['none', 'small', 'medium', 'large']),
  allowedWeaponTags: z.array(z.string()),
  canDualWield: z.boolean(),
  spellSchool: z.enum(['mage', 'cleric', 'none']),
  allowedAlignments: z.array(AlignmentIdSchema).optional(),
  allowedRaces: z.array(z.string()).optional(),
  progression: z.array(ClassLevelRowSchema),
});

export const RaceDefSchema = z.object({
  id: z.string().min(1),
  name: LocalizedTextSchema,
  playable: z.boolean(),
  statModifiers: z.record(z.string(), z.number()),
  baseMorale: z.number().min(2).max(12),
  allowedClassIds: z.array(z.string()),
  allowedMulticlassIds: z.array(z.string()),
  immunities: z.object({
    raiseDead: z.boolean().optional(),
    holdPerson: z.boolean().optional(),
    fear: z.boolean().optional(),
    poison: z.boolean().optional(),
    weightTraps: z.boolean().optional(),
    arrowCorridorResist: z.number().optional(),
  }),
});

export const SpellDefSchema = z.object({
  id: z.string().min(1),
  name: LocalizedTextSchema,
  school: z.enum(['mage', 'cleric']),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  category: z.enum(['offensive', 'healing', 'defensive', 'support', 'control', 'detection']),
  targetScope: z.enum([
    'self', 'single_ally', 'all_allies',
    'single_enemy', 'front_row_enemies', 'all_enemies', 'cross_aoe',
  ]),
  requiresFrontRow: z.boolean(),
  castTimeMs: z.number().min(0),
  formula: z.object({
    effectType: z.enum(['damage', 'heal', 'ac_override', 'buff', 'debuff', 'cure_status', 'utility']),
    dice: z.string().optional(),
    scalesWithCasterLevel: z.boolean().optional(),
    damageType: DamageTypeSchema.optional(),
    setBaseAc: z.number().optional(),
    nonStackingGroup: z.string().optional(),
    applyStatus: StatusEffectIdSchema.optional(),
    removeStatus: z.array(StatusEffectIdSchema).optional(),
    durationSec: z.number().optional(),
    moraleDelta: z.number().optional(),
    saveNegates: z.boolean().optional(),
    immuneTags: z.array(z.string()).optional(),
  }),
  description: LocalizedTextSchema,
});

export const ItemDefSchema = z.object({
  id: z.string().min(1),
  name: LocalizedTextSchema,
  category: z.enum(['weapon', 'shield', 'armor', 'accessory', 'consumable', 'scroll', 'quest', 'resource']),
  slot: z.enum(['main_hand', 'off_hand', 'head', 'chest', 'hands', 'feet', 'neck', 'ring']).optional(),
  inventoryIconId: z.string(),
  worldVisualId: z.string(),
  weight: z.number().min(0),
  goldValue: z.number().min(0),
  stackable: z.boolean(),
  maxStack: z.number().int().min(1),
  cursed: z.boolean().optional(),
  identifiedByDefault: z.boolean(),
  weaponStats: z.object({
    damageDice: z.string(),
    damageType: DamageTypeSchema,
    magicBonus: z.number(),
    attackSpeedMs: z.number().min(100),
    range: z.enum(['melee', 'ranged']),
    twoHanded: z.boolean(),
    tags: z.array(z.string()),
  }).optional(),
  armorStats: z.object({
    baseAc: z.number().optional(),
    acBonus: z.number().optional(),
    armorWeight: z.enum(['none', 'leather', 'light_metal', 'heavy']),
  }).optional(),
  linkedSpellId: z.string().optional(),
  consumableEffect: z.object({
    healDice: z.string().optional(),
    cureStatus: z.array(StatusEffectIdSchema).optional(),
    moraleBonus: z.number().optional(),
  }).optional(),
});

export const MonsterDefSchema = z.object({
  id: z.string().min(1),
  name: LocalizedTextSchema,
  actorVisualId: z.string(),
  isUndead: z.boolean(),
  levelOrHd: z.number().min(0),
  maxHpDice: z.string(),
  baseAc: z.number(),
  thac0: z.number(),
  morale: z.number().min(2).max(12),
  xpReward: z.number().min(0),
  attacks: z.array(z.object({
    name: LocalizedTextSchema,
    damageDice: z.string(),
    damageType: DamageTypeSchema,
    attackSpeedMs: z.number().min(100),
  })),
  resistances: z.record(z.string(), z.number()),
  lootTable: z.array(z.object({
    itemId: z.string(),
    dropChance: z.number().min(0).max(1),
    minQty: z.number().int().min(1),
    maxQty: z.number().int().min(1),
  })),
});

export const CheckRuleDefSchema = z.object({
  id: z.string().min(1),
  name: LocalizedTextSchema,
  formula: z.string(),
  defaultDc: z.number(),
});

export const CharacterSheetStateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  portraitId: z.string(),
  raceId: z.string(),
  classIds: z.array(z.string()).min(1),
  alignment: AlignmentIdSchema,
  row: z.enum(['front', 'back']),
  levels: z.record(z.string(), z.number().int().min(1)),
  xp: z.record(z.string(), z.number().min(0)),
  stats: z.object({
    STR: z.number().min(3).max(25),
    INT: z.number().min(3).max(25),
    WIS: z.number().min(3).max(25),
    DEX: z.number().min(3).max(25),
    CON: z.number().min(3).max(25),
    CHA: z.number().min(3).max(25),
  }),
  currentHp: z.number(),
  maxHp: z.number().min(1),
  morale: z.number().min(2).max(12),
  equipped: z.record(z.string(), z.string()),
  spellbookIds: z.array(z.string()),
  memorizedSpellIds: z.array(z.string()),
  activeStatuses: z.array(StatusEffectIdSchema),
});

export const RulesetBundleSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  rulesetId: z.string().min(1),
  supportedLocales: z.array(z.string().min(2)).optional(),
  title: LocalizedTextSchema,
  globalRules: z.object({
    primeRequisiteXpThreshold: z.number().min(3).max(25),
    primeRequisiteXpBonus: z.number().min(0).max(2),
    critHitD20: z.number().int().min(1).max(20),
    critMissD20: z.number().int().min(1).max(20),
    moraleCheckDice: z.string().min(1),
  }),
  classes: z.array(ClassDefSchema),
  races: z.array(RaceDefSchema),
  spells: z.array(SpellDefSchema),
  items: z.array(ItemDefSchema),
  monsters: z.array(MonsterDefSchema),
  checkRules: z.array(CheckRuleDefSchema),
  partyPresets: z.array(z.object({
    id: z.string().min(1),
    name: LocalizedTextSchema,
    members: z.array(CharacterSheetStateSchema),
  })),
});
