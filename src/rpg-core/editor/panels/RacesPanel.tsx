import React from 'react';
import { PrimaryStatId } from '../../types/ruleset.types';
import { t } from '../i18n';
import { useRulesetEditorStore } from '../store/useRulesetEditorStore';
import { SharedNumberField } from '../components/SharedNumberField';
import { LocalizedField, SectionHeader, TextField, ToggleCheckbox } from '../components/FormControls';

const STATS: PrimaryStatId[] = ['STR', 'INT', 'WIS', 'DEX', 'CON', 'CHA'];

export const RacesPanel: React.FC = () => {
  const { bundle, locale, selectedEntityId, updateBundle } = useRulesetEditorStore();
  const race = bundle.races.find((r) => r.id === selectedEntityId.races) ?? bundle.races[0];

  if (!race) {
    return <div className="p-6 text-xs text-[#B2ADA0]">{t(locale, 'noSelection')}</div>;
  }

  const updateRace = (fn: (r: typeof race) => void) => {
    updateBundle((draft) => {
      const target = draft.races.find((x) => x.id === race.id);
      if (target) fn(target);
    });
  };

  return (
    <div className="p-3 md:p-6 max-w-4xl flex flex-col gap-4 md:gap-6">
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-4">
        <SectionHeader title={race.name[locale]} subtitle={`id: ${race.id}`} />
        <LocalizedField
          label={locale === 'hu' ? 'Faj neve' : 'Race Name'}
          locale={locale}
          value={race.name}
          onChange={(next) => updateRace((r) => { r.name = next; })}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <SharedNumberField
            label="Base Morale (2..12)"
            value={race.baseMorale}
            min={2}
            max={12}
            defaultValue={8}
            onChange={(v) => updateRace((r) => { r.baseMorale = v; })}
          />
          <div className="pb-1.5">
            <ToggleCheckbox
              label={locale === 'hu' ? 'Játszható faj' : 'Playable Race'}
              checked={race.playable}
              onChange={(chk) => updateRace((r) => { r.playable = chk; })}
            />
          </div>
        </div>

        <div>
          <div className="text-xs text-[#B2ADA0] mb-2">Stat Modifiers</div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {STATS.map((stat) => (
              <SharedNumberField
                key={stat}
                label={stat}
                value={race.statModifiers[stat] ?? 0}
                min={-6}
                max={6}
                defaultValue={0}
                onChange={(v) =>
                  updateRace((r) => {
                    if (v === 0) {
                      delete r.statModifiers[stat];
                    } else {
                      r.statModifiers[stat] = v;
                    }
                  })
                }
              />
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-[#B2ADA0] mb-2">Allowed Single Classes</div>
          <div className="flex flex-wrap gap-4">
            {bundle.classes.map((cls) => (
              <ToggleCheckbox
                key={cls.id}
                label={cls.name[locale]}
                checked={race.allowedClassIds.includes(cls.id)}
                onChange={(chk) =>
                  updateRace((r) => {
                    r.allowedClassIds = chk
                      ? [...r.allowedClassIds, cls.id]
                      : r.allowedClassIds.filter((x) => x !== cls.id);
                  })
                }
              />
            ))}
          </div>
        </div>

        <TextField
          label="Allowed Multiclass IDs (comma separated)"
          value={race.allowedMulticlassIds.join(', ')}
          mono
          onChange={(v) =>
            updateRace((r) => {
              r.allowedMulticlassIds = v
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            })
          }
        />

        <div className="pt-2 border-t border-[#665B48]/40">
          <div className="text-xs text-[#B2ADA0] mb-2">Racial Immunities & Traits</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-center">
            <ToggleCheckbox
              label="Immune to Raise Dead (Elf)"
              checked={Boolean(race.immunities.raiseDead)}
              onChange={(chk) => updateRace((r) => { r.immunities.raiseDead = chk || undefined; })}
            />
            <ToggleCheckbox
              label="Immune to Hold Person"
              checked={Boolean(race.immunities.holdPerson)}
              onChange={(chk) => updateRace((r) => { r.immunities.holdPerson = chk || undefined; })}
            />
            <ToggleCheckbox
              label="Immune to Fear"
              checked={Boolean(race.immunities.fear)}
              onChange={(chk) => updateRace((r) => { r.immunities.fear = chk || undefined; })}
            />
            <ToggleCheckbox
              label="Immune to Poison"
              checked={Boolean(race.immunities.poison)}
              onChange={(chk) => updateRace((r) => { r.immunities.poison = chk || undefined; })}
            />
            <ToggleCheckbox
              label="Weight Trap Immunity (Skeleton)"
              checked={Boolean(race.immunities.weightTraps)}
              onChange={(chk) => updateRace((r) => { r.immunities.weightTraps = chk || undefined; })}
            />
            <SharedNumberField
              label="Arrow Corridor Resist (0..1)"
              value={race.immunities.arrowCorridorResist ?? 0}
              min={0}
              max={1}
              step={0.05}
              fineStep={0.05}
              defaultValue={0}
              onChange={(v) =>
                updateRace((r) => {
                  r.immunities.arrowCorridorResist = v > 0 ? v : undefined;
                })
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
};
