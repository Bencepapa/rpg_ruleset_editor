import React, { useEffect, useState } from 'react';
import { HeartPulse, Shield, Sparkles } from 'lucide-react';
import { RpgRuntime } from '../../runtime/RpgRuntime';
import { AlignmentId, CharacterSheetState, PrimaryStatId } from '../../types/ruleset.types';
import { computeCharacterSheet } from '../../engine/rulesEngine';
import { t } from '../i18n';
import { useRulesetEditorStore } from '../store/useRulesetEditorStore';
import { SharedNumberField } from '../components/SharedNumberField';
import { LocalizedField, SectionHeader, SelectField, TextField } from '../components/FormControls';

const STATS: PrimaryStatId[] = ['STR', 'INT', 'WIS', 'DEX', 'CON', 'CHA'];
const ALIGNMENTS: AlignmentId[] = ['LG', 'NG', 'CG', 'LN', 'TN', 'CN', 'LE', 'NE', 'CE'];

export const PartyPresetsPanel: React.FC<{ liveRuntime?: RpgRuntime }> = ({ liveRuntime }) => {
  const { bundle, locale, selectedEntityId, updateBundle } = useRulesetEditorStore();
  const preset =
    bundle.partyPresets.find((p) => p.id === selectedEntityId.party) ?? bundle.partyPresets[0];
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!liveRuntime) return;
    return liveRuntime.subscribe(() => setTick((n) => n + 1));
  }, [liveRuntime]);

  const liveParty = liveRuntime?.getActiveParty() ?? [];

  const renderMemberCard = (
    member: CharacterSheetState,
    onPatch: (patch: Partial<CharacterSheetState>) => void,
    isLive: boolean
  ) => {
    const computed = computeCharacterSheet(bundle, member);
    const weapons = bundle.items.filter((i) => i.category === 'weapon');
    const armors = bundle.items.filter((i) => i.category === 'armor');
    const shields = bundle.items.filter((i) => i.category === 'shield' || i.category === 'weapon');

    return (
      <div
        key={`${isLive ? 'live' : 'preset'}_${member.id}`}
        className="bg-[#17191B] border border-[#665B48]/70 rounded p-4 flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#665B48]/40">
          <div className="flex items-center gap-3">
            <span className="font-display text-sm font-bold text-[#EEE3CA]">{member.name}</span>
            <span className="text-xs text-[#B2ADA0] font-mono tabular-nums">
              {member.classIds.join('/')} · AC {computed.effectiveAc} · THAC0 {computed.modifiedThac0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPatch({ row: member.row === 'front' ? 'back' : 'front' })}
              className={`px-2 py-0.5 text-xs font-mono rounded border cursor-pointer ${
                member.row === 'front'
                  ? 'border-[#C6A365] text-[#C6A365] bg-[#292A28]'
                  : 'border-[#665B48] text-[#B2ADA0] bg-[#292A28]'
              }`}
            >
              {member.row.toUpperCase()} ROW
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <TextField
            label="Name"
            value={member.name}
            onChange={(v) => onPatch({ name: v })}
          />
          <SelectField
            label="Race"
            value={member.raceId}
            options={bundle.races.map((r) => ({ value: r.id, label: r.name[locale] }))}
            onChange={(v) => onPatch({ raceId: v })}
          />
          <SelectField
            label="Primary Class"
            value={member.classIds[0] ?? 'fighter'}
            options={bundle.classes.map((c) => ({ value: c.id, label: c.name[locale] }))}
            onChange={(v) => {
              const rest = member.classIds.slice(1);
              const nextLvl = member.levels[member.classIds[0]] ?? 1;
              onPatch({
                classIds: [v, ...rest],
                levels: { ...member.levels, [v]: member.levels[v] ?? nextLvl },
              });
            }}
          />
          <SelectField
            label="Alignment"
            value={member.alignment}
            options={ALIGNMENTS.map((a) => ({ value: a, label: a }))}
            onChange={(v) => onPatch({ alignment: v as AlignmentId })}
          />
          <SharedNumberField
            label="HP (Current)"
            value={member.currentHp}
            min={0}
            max={member.maxHp}
            defaultValue={member.maxHp}
            onChange={(v) => onPatch({ currentHp: v })}
          />
        </div>

        <div className="grid grid-cols-3 md:grid-cols-8 gap-2">
          {STATS.map((stat) => (
            <SharedNumberField
              key={stat}
              label={stat}
              value={member.stats[stat]}
              min={3}
              max={25}
              defaultValue={14}
              onChange={(v) =>
                onPatch({ stats: { ...member.stats, [stat]: v } })
              }
            />
          ))}
          <SharedNumberField
            label="Max HP"
            value={member.maxHp}
            min={1}
            max={500}
            onChange={(v) => onPatch({ maxHp: v, currentHp: Math.min(member.currentHp, v) })}
          />
          <SharedNumberField
            label="Morale"
            value={member.morale}
            min={2}
            max={12}
            onChange={(v) => onPatch({ morale: v })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <SelectField
            label="Main Hand"
            value={member.equipped.main_hand ?? ''}
            options={[
              { value: '', label: '(unarmed)' },
              ...weapons.map((w) => ({ value: w.id, label: w.name[locale] })),
            ]}
            onChange={(v) =>
              onPatch({ equipped: { ...member.equipped, main_hand: v || undefined } })
            }
          />
          <SelectField
            label="Chest Armor"
            value={member.equipped.chest ?? ''}
            options={[
              { value: '', label: '(none)' },
              ...armors.map((a) => ({ value: a.id, label: a.name[locale] })),
            ]}
            onChange={(v) =>
              onPatch({ equipped: { ...member.equipped, chest: v || undefined } })
            }
          />
          <SelectField
            label="Off Hand / Shield"
            value={member.equipped.off_hand ?? ''}
            options={[
              { value: '', label: '(none)' },
              ...shields.map((s) => ({ value: s.id, label: s.name[locale] })),
            ]}
            onChange={(v) =>
              onPatch({ equipped: { ...member.equipped, off_hand: v || undefined } })
            }
          />
        </div>

        {computed.resourceType !== 'none' && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-[#3C8EB8] font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Memorized ({member.memorizedSpellIds.length}):
            </span>
            {member.memorizedSpellIds.map((sid, idx) => {
              const s = bundle.spells.find((sp) => sp.id === sid);
              return (
                <button
                  key={`${sid}_${idx}`}
                  type="button"
                  title="Click to unmemorize"
                  onClick={() => {
                    const next = [...member.memorizedSpellIds];
                    next.splice(idx, 1);
                    onPatch({ memorizedSpellIds: next });
                  }}
                  className="px-2 py-0.5 rounded bg-[#292A28] border border-[#3C8EB8]/50 text-[#EEE3CA] hover:border-[#B74541] cursor-pointer"
                >
                  {s?.name[locale] ?? sid} ×
                </button>
              );
            })}
            <select
              aria-label={`Add memorized spell for ${member.name}`}
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                onPatch({ memorizedSpellIds: [...member.memorizedSpellIds, e.target.value] });
              }}
              className="h-6 px-2 bg-[#292A28] border border-[#665B48]/70 rounded text-xs text-[#C6A365]"
            >
              <option value="">+ Add Spell...</option>
              {bundle.spells.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name[locale]} ({s.school} T{s.tier})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-3 md:p-6 max-w-5xl flex flex-col gap-4 md:gap-8">
      {/* Live Runtime Section */}
      {liveRuntime && (
        <section className="bg-[#292A28] border border-[#C6A365]/70 rounded p-3.5 md:p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#665B48]/50">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#C6A365]" />
              <h2 className="font-display text-base font-bold text-[#C6A365]">
                {t(locale, 'activeDungeonParty')}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {preset && (
                <button
                  type="button"
                  onClick={() => liveRuntime.loadParty(preset.members)}
                  className="px-3 py-1.5 rounded border border-[#665B48] bg-[#17191B] text-xs text-[#EEE3CA] hover:border-[#C6A365] cursor-pointer"
                >
                  {t(locale, 'loadPresetToLive')}
                </button>
              )}
              <button
                type="button"
                onClick={() => liveRuntime.fullRestoreParty()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#B74541] text-[#EEE3CA] text-xs font-semibold hover:bg-[#c85550] cursor-pointer"
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>{t(locale, 'fullHealRestore')}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {liveParty.map((member) =>
              renderMemberCard(
                member,
                (patch) => liveRuntime.patchActiveMember(member.id, patch),
                true
              )
            )}
          </div>
        </section>
      )}

      {/* Selected Party Preset */}
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-4">
        <SectionHeader
          title={preset ? preset.name[locale] : 'Party Preset'}
          subtitle={preset ? `${preset.members.length} members` : undefined}
        />
        {!preset ? (
          <p className="text-xs text-[#B2ADA0]">{t(locale, 'noSelection')}</p>
        ) : (
          <>
            <LocalizedField
              label={locale === 'hu' ? 'Sablon neve' : 'Preset Name'}
              locale={locale}
              value={preset.name}
              onChange={(next) =>
                updateBundle((draft) => {
                  const target = draft.partyPresets.find((p) => p.id === preset.id);
                  if (target) target.name = next;
                })
              }
            />
            <div className="flex flex-col gap-3">
              {preset.members.map((member) =>
                renderMemberCard(
                  member,
                  (patch) =>
                    updateBundle((draft) => {
                      const targetPreset = draft.partyPresets.find((p) => p.id === preset.id);
                      const idx = targetPreset?.members.findIndex((m) => m.id === member.id) ?? -1;
                      if (targetPreset && idx >= 0) {
                        targetPreset.members[idx] = { ...targetPreset.members[idx], ...patch };
                      }
                    }),
                  false
                )
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
