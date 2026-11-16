import React from 'react';
import { DamageType, StatusEffectId } from '../../types/ruleset.types';
import { t } from '../i18n';
import { useRulesetEditorStore } from '../store/useRulesetEditorStore';
import { SharedNumberField } from '../components/SharedNumberField';
import {
  LocalizedField,
  SectionHeader,
  SelectField,
  TextField,
  ToggleCheckbox,
} from '../components/FormControls';

const DAMAGE_TYPES: DamageType[] = [
  'slashing', 'piercing', 'bludgeoning',
  'fire', 'cold', 'lightning', 'acid', 'poison', 'magic', 'necrotic',
];

const STATUS_EFFECTS: StatusEffectId[] = [
  'paralyzed', 'feared', 'petrified', 'poisoned', 'blinded',
  'invisible', 'improved_invisible', 'hasted', 'blessed',
  'protected_evil', 'armor_spell', 'shield_spell', 'downed', 'dead',
];

export const SpellsPanel: React.FC = () => {
  const { bundle, locale, selectedEntityId, updateBundle } = useRulesetEditorStore();
  const spell = bundle.spells.find((s) => s.id === selectedEntityId.spells) ?? bundle.spells[0];

  if (!spell) {
    return <div className="p-6 text-xs text-[#B2ADA0]">{t(locale, 'noSelection')}</div>;
  }

  const updateSpell = (fn: (s: typeof spell) => void) => {
    updateBundle((draft) => {
      const target = draft.spells.find((x) => x.id === spell.id);
      if (target) fn(target);
    });
  };

  return (
    <div className="p-3 md:p-6 max-w-4xl flex flex-col gap-4 md:gap-6">
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-4">
        <SectionHeader
          title={spell.name[locale]}
          subtitle={`${spell.school.toUpperCase()} · Tier ${spell.tier} · ${spell.id}`}
        />

        <LocalizedField
          label={locale === 'hu' ? 'Varázslat neve' : 'Spell Name'}
          locale={locale}
          value={spell.name}
          onChange={(next) => updateSpell((s) => { s.name = next; })}
        />
        <LocalizedField
          label={locale === 'hu' ? 'Leírás' : 'Description'}
          locale={locale}
          value={spell.description}
          multiline
          onChange={(next) => updateSpell((s) => { s.description = next; })}
        />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SelectField
            label="School"
            value={spell.school}
            options={[
              { value: 'mage', label: 'Mage' },
              { value: 'cleric', label: 'Cleric' },
            ]}
            onChange={(v) => updateSpell((s) => { s.school = v as typeof s.school; })}
          />
          <SelectField
            label="Tier"
            value={String(spell.tier)}
            options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `Tier ${n}` }))}
            onChange={(v) => updateSpell((s) => { s.tier = Number(v) as typeof s.tier; })}
          />
          <SelectField
            label="Category"
            value={spell.category}
            options={[
              { value: 'offensive', label: 'offensive' },
              { value: 'healing', label: 'healing' },
              { value: 'defensive', label: 'defensive' },
              { value: 'support', label: 'support' },
              { value: 'control', label: 'control' },
              { value: 'detection', label: 'detection' },
            ]}
            onChange={(v) => updateSpell((s) => { s.category = v as typeof s.category; })}
          />
          <SelectField
            label="Target Scope"
            value={spell.targetScope}
            options={[
              { value: 'self', label: 'self' },
              { value: 'single_ally', label: 'single_ally' },
              { value: 'all_allies', label: 'all_allies' },
              { value: 'single_enemy', label: 'single_enemy' },
              { value: 'front_row_enemies', label: 'front_row_enemies' },
              { value: 'all_enemies', label: 'all_enemies' },
              { value: 'cross_aoe', label: 'cross_aoe' },
            ]}
            onChange={(v) => updateSpell((s) => { s.targetScope = v as typeof s.targetScope; })}
          />
          <SharedNumberField
            label="Cast Time (ms)"
            value={spell.castTimeMs}
            min={0}
            max={10000}
            step={50}
            defaultValue={500}
            onChange={(v) => updateSpell((s) => { s.castTimeMs = v; })}
          />
        </div>

        <div className="flex flex-wrap gap-6 pt-1">
          <ToggleCheckbox
            label="Requires Front Row (Touch Spell)"
            checked={spell.requiresFrontRow}
            onChange={(chk) => updateSpell((s) => { s.requiresFrontRow = chk; })}
          />
          <ToggleCheckbox
            label="Scales With Caster Level"
            checked={Boolean(spell.formula.scalesWithCasterLevel)}
            onChange={(chk) => updateSpell((s) => { s.formula.scalesWithCasterLevel = chk || undefined; })}
          />
          <ToggleCheckbox
            label="Save Negates"
            checked={Boolean(spell.formula.saveNegates)}
            onChange={(chk) => updateSpell((s) => { s.formula.saveNegates = chk || undefined; })}
          />
        </div>
      </section>

      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-4">
        <SectionHeader title={locale === 'hu' ? 'Varázslat képlet' : 'Spell Formula'} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SelectField
            label="Effect Type"
            value={spell.formula.effectType}
            options={[
              { value: 'damage', label: 'damage' },
              { value: 'heal', label: 'heal' },
              { value: 'ac_override', label: 'ac_override' },
              { value: 'buff', label: 'buff' },
              { value: 'debuff', label: 'debuff' },
              { value: 'cure_status', label: 'cure_status' },
              { value: 'utility', label: 'utility' },
            ]}
            onChange={(v) => updateSpell((s) => { s.formula.effectType = v as typeof s.formula.effectType; })}
          />
          <TextField
            label="Dice Expression"
            value={spell.formula.dice ?? ''}
            mono
            placeholder="e.g. 1d8"
            onChange={(v) => updateSpell((s) => { s.formula.dice = v || undefined; })}
          />
          <SelectField
            label="Damage Type"
            value={spell.formula.damageType ?? ''}
            options={[
              { value: '', label: '(none)' },
              ...DAMAGE_TYPES.map((dt) => ({ value: dt, label: dt })),
            ]}
            onChange={(v) => updateSpell((s) => { s.formula.damageType = (v || undefined) as DamageType | undefined; })}
          />
          <SelectField
            label="Apply Status"
            value={spell.formula.applyStatus ?? ''}
            options={[
              { value: '', label: '(none)' },
              ...STATUS_EFFECTS.map((st) => ({ value: st, label: st })),
            ]}
            onChange={(v) => updateSpell((s) => { s.formula.applyStatus = (v || undefined) as StatusEffectId | undefined; })}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SharedNumberField
            label="Set Base AC (0 = off)"
            value={spell.formula.setBaseAc ?? 0}
            min={0}
            max={10}
            defaultValue={0}
            onChange={(v) => updateSpell((s) => { s.formula.setBaseAc = v > 0 ? v : undefined; })}
          />
          <TextField
            label="Non-Stacking Group"
            value={spell.formula.nonStackingGroup ?? ''}
            mono
            onChange={(v) => updateSpell((s) => { s.formula.nonStackingGroup = v || undefined; })}
          />
          <SharedNumberField
            label="Duration (sec)"
            value={spell.formula.durationSec ?? 0}
            min={0}
            max={3600}
            step={15}
            defaultValue={0}
            onChange={(v) => updateSpell((s) => { s.formula.durationSec = v > 0 ? v : undefined; })}
          />
          <SharedNumberField
            label="Morale Delta"
            value={spell.formula.moraleDelta ?? 0}
            min={-10}
            max={10}
            defaultValue={0}
            onChange={(v) => updateSpell((s) => { s.formula.moraleDelta = v !== 0 ? v : undefined; })}
          />
        </div>

        <TextField
          label="Immune Tags (comma separated)"
          value={(spell.formula.immuneTags ?? []).join(', ')}
          mono
          onChange={(v) =>
            updateSpell((s) => {
              const tags = v.split(',').map((x) => x.trim()).filter(Boolean);
              s.formula.immuneTags = tags.length > 0 ? tags : undefined;
            })
          }
        />
      </section>
    </div>
  );
};
