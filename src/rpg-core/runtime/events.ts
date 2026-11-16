import { DamageType, LocalizedText, StatusEffectId } from '../types/ruleset.types';

export type ActionErrorCode =
  | 'ACTOR_NOT_FOUND'
  | 'TARGET_NOT_FOUND'
  | 'ACTOR_UNABLE'
  | 'SPELL_NOT_FOUND'
  | 'SPELL_NOT_MEMORIZED'
  | 'INVALID_ROW'
  | 'ITEM_NOT_FOUND'
  | 'INSUFFICIENT_CHARGES'
  | 'CHECK_RULE_NOT_FOUND';

export interface CombatDamageEvent {
  type: 'DAMAGE';
  sourceId: string;
  targetId: string;
  amount: number;
  damageType: DamageType;
  isCrit: boolean;
  targetRemainingHp: number;
  targetDefeated: boolean;
}

export interface CombatMissEvent {
  type: 'MISS';
  sourceId: string;
  targetId: string;
  d20Roll: number;
  requiredRoll: number;
  isCritMiss: boolean;
}

export interface HealEvent {
  type: 'HEAL';
  sourceId: string;
  targetId: string;
  amount: number;
  targetCurrentHp: number;
}

export interface StatusAppliedEvent {
  type: 'STATUS_APPLIED';
  targetId: string;
  status: StatusEffectId;
  immune?: boolean;
}

export interface StatusRemovedEvent {
  type: 'STATUS_REMOVED';
  targetId: string;
  status: StatusEffectId;
}

export interface MoraleCheckEvent {
  type: 'MORALE_CHECK' | 'MORALE_BROKEN';
  targetId: string;
  roll2d6: number;
  moraleThreshold: number;
  broken: boolean;
}

export interface SpellCastEvent {
  type: 'SPELL_CAST';
  casterId: string;
  spellId: string;
  spellName: LocalizedText;
  source: 'memorized' | 'scroll';
  targetIds: string[];
}

export type RpgEvent =
  | CombatDamageEvent
  | CombatMissEvent
  | HealEvent
  | StatusAppliedEvent
  | StatusRemovedEvent
  | MoraleCheckEvent
  | SpellCastEvent;

export interface ActionOutcome {
  ok: boolean;
  errorCode?: ActionErrorCode;
  message?: string;
  events: RpgEvent[];
}

export interface CheckOutcome {
  ok: boolean;
  errorCode?: ActionErrorCode;
  actorId: string;
  checkRuleId: string;
  formula: string;
  dc: number;
  rollTotal: number;
  rawSummary: string;
  success: boolean;
}

export interface LevelUpOutcome {
  memberId: string;
  memberName: string;
  classId: string;
  awardedXp: number;
  primeRequisiteBonusApplied: boolean;
  previousLevel: number;
  newLevel: number;
  hpGained: number;
}

export interface RestOutcomeEvent {
  memberId: string;
  memberName: string;
  hpRecovered: number;
  memorizedCount: number;
}
