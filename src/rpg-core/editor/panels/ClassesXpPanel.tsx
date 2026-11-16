import React, { useMemo, useState } from 'react';
import { AlignmentId, PrimaryStatId } from '../../types/ruleset.types';
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

const CLASS_COLORS: Record<string, string> = {
  fighter: '#C6A365',
  ranger: '#7FA96B',
  paladin: '#EEE3CA',
  cleric: '#D98A4E',
  mage: '#3C8EB8',
  thief: '#B74541',
};

const ALL_STATS: PrimaryStatId[] = ['STR', 'INT', 'WIS', 'DEX', 'CON', 'CHA'];
const ALL_ALIGNMENTS: AlignmentId[] = ['LG', 'NG', 'CG', 'LN', 'TN', 'CN', 'LE', 'NE', 'CE'];

export const ClassesXpPanel: React.FC = () => {
  const { bundle, locale, selectedEntityId, setSelectedEntityId, updateBundle } =
    useRulesetEditorStore();
  const activeClass =
    bundle.classes.find((c) => c.id === selectedEntityId.classes) ?? bundle.classes[0];
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);

  const chartData = useMemo(() => {
    const maxXp = Math.max(
      100000,
      ...bundle.classes.flatMap((c) => c.progression.map((r) => r.xpRequired))
    );
    const width = 680;
    const height = 210;
    const padL = 62;
    const padR = 18;
    const padT = 16;
    const padB = 28;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const toX = (lvl: number) => padL + ((lvl - 1) / 12) * plotW;
    const toY = (xp: number) => padT + plotH - (xp / maxXp) * plotH;

    return { maxXp, width, height, padL, padR, padT, padB, plotW, plotH, toX, toY };
  }, [bundle.classes]);

  if (!activeClass) {
    return <div className="p-6 text-xs text-[#B2ADA0]">{t(locale, 'noSelection')}</div>;
  }

  const updateClass = (fn: (cls: typeof activeClass) => void) => {
    updateBundle((draft) => {
      const target = draft.classes.find((c) => c.id === activeClass.id);
      if (target) fn(target);
    });
  };

  return (
    <div className="p-3 md:p-6 max-w-6xl flex flex-col gap-4 md:gap-6">
      {/* Interactive SVG XP Curve Graph */}
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 mb-3 border-b border-[#665B48]/50">
          <h2 className="font-display text-base font-bold text-[#C6A365]">
            {locale === 'hu' ? 'XP Fejlődési Görbe (1–13. szint)' : 'XP Curve Comparison (Levels 1–13)'}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {bundle.classes.map((cls) => {
              const color = CLASS_COLORS[cls.id] ?? '#B2ADA0';
              const isSelected = cls.id === activeClass.id;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedEntityId('classes', cls.id)}
                  className={`flex items-center gap-1.5 cursor-pointer ${
                    isSelected ? 'text-[#EEE3CA] font-semibold underline' : 'text-[#B2ADA0] hover:text-[#EEE3CA]'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: color }} />
                  <span>{cls.name[locale]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartData.width} ${chartData.height}`}
            className="w-full h-auto aspect-[680/210] sm:h-56 select-none"
            role="img"
            aria-label="Class XP progression curve"
          >
            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const y = chartData.padT + chartData.plotH * (1 - frac);
              const val = Math.round(chartData.maxXp * frac);
              return (
                <g key={frac}>
                  <line
                    x1={chartData.padL}
                    x2={chartData.width - chartData.padR}
                    y1={y}
                    y2={y}
                    stroke="#665B48"
                    strokeOpacity={0.3}
                    strokeDasharray="3 3"
                  />
                  <text
                    x={chartData.padL - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#B2ADA0"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                  </text>
                </g>
              );
            })}

            {/* Level X-axis labels */}
            {Array.from({ length: 13 }, (_, idx) => idx + 1).map((lvl) => {
              const x = chartData.toX(lvl);
              return (
                <g key={lvl}>
                  <text
                    x={x}
                    y={chartData.height - 8}
                    textAnchor="middle"
                    fill={hoveredLevel === lvl ? '#C6A365' : '#B2ADA0'}
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    L{lvl}
                  </text>
                </g>
              );
            })}

            {/* Class curves */}
            {bundle.classes.map((cls) => {
              const color = CLASS_COLORS[cls.id] ?? '#B2ADA0';
              const isSelected = cls.id === activeClass.id;
              const points = cls.progression
                .slice(0, 13)
                .map((r) => `${chartData.toX(r.level)},${chartData.toY(r.xpRequired)}`)
                .join(' ');
              return (
                <polyline
                  key={cls.id}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSelected ? 2.8 : 1.3}
                  strokeOpacity={isSelected ? 1 : 0.45}
                  points={points}
                />
              );
            })}

            {/* Active class data points */}
            {activeClass.progression.slice(0, 13).map((row) => {
              const cx = chartData.toX(row.level);
              const cy = chartData.toY(row.xpRequired);
              return (
                <circle
                  key={row.level}
                  cx={cx}
                  cy={cy}
                  r={hoveredLevel === row.level ? 5 : 3}
                  fill={CLASS_COLORS[activeClass.id] ?? '#C6A365'}
                  stroke="#17191B"
                  strokeWidth={1.5}
                  onMouseEnter={() => setHoveredLevel(row.level)}
                  onMouseLeave={() => setHoveredLevel(null)}
                />
              );
            })}
          </svg>
        </div>
        {hoveredLevel !== null && (
          <div className="mt-1 text-xs font-mono tabular-nums text-[#EEE3CA]">
            Level {hoveredLevel}:{' '}
            {activeClass.progression
              .find((r) => r.level === hoveredLevel)
              ?.xpRequired.toLocaleString()}{' '}
            XP · THAC0{' '}
            {activeClass.progression.find((r) => r.level === hoveredLevel)?.thac0}
          </div>
        )}
      </section>

      {/* Class Metadata */}
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-4">
        <SectionHeader title={activeClass.name[locale]} subtitle={`id: ${activeClass.id}`} />
        <LocalizedField
          label={locale === 'hu' ? 'Kaszt neve' : 'Class Name'}
          locale={locale}
          value={activeClass.name}
          onChange={(next) => updateClass((c) => { c.name = next; })}
        />
        <LocalizedField
          label={locale === 'hu' ? 'Leírás' : 'Description'}
          locale={locale}
          value={activeClass.description}
          multiline
          onChange={(next) => updateClass((c) => { c.description = next; })}
        />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SelectField
            label="Resource Type"
            value={activeClass.resourceType}
            options={[
              { value: 'none', label: 'none (No Mana Bar)' },
              { value: 'mana', label: 'mana' },
              { value: 'energy', label: 'energy' },
            ]}
            onChange={(v) => updateClass((c) => { c.resourceType = v as typeof c.resourceType; })}
          />
          <SelectField
            label="Hit Die"
            value={activeClass.hitDie}
            options={[
              { value: 'd4', label: 'd4' },
              { value: 'd6', label: 'd6' },
              { value: 'd8', label: 'd8' },
              { value: 'd10', label: 'd10' },
            ]}
            onChange={(v) => updateClass((c) => { c.hitDie = v as typeof c.hitDie; })}
          />
          <SelectField
            label="Max Armor"
            value={activeClass.allowedArmorMax}
            options={[
              { value: 'none', label: 'none' },
              { value: 'leather', label: 'leather' },
              { value: 'light_metal', label: 'light_metal' },
              { value: 'heavy', label: 'heavy' },
            ]}
            onChange={(v) => updateClass((c) => { c.allowedArmorMax = v as typeof c.allowedArmorMax; })}
          />
          <SelectField
            label="Max Shield"
            value={activeClass.allowedShieldMax}
            options={[
              { value: 'none', label: 'none' },
              { value: 'small', label: 'small' },
              { value: 'medium', label: 'medium' },
              { value: 'large', label: 'large' },
            ]}
            onChange={(v) => updateClass((c) => { c.allowedShieldMax = v as typeof c.allowedShieldMax; })}
          />
          <SelectField
            label="Spell School"
            value={activeClass.spellSchool}
            options={[
              { value: 'none', label: 'none' },
              { value: 'mage', label: 'mage' },
              { value: 'cleric', label: 'cleric' },
            ]}
            onChange={(v) => updateClass((c) => { c.spellSchool = v as typeof c.spellSchool; })}
          />
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-[#B2ADA0]">Prime Requisite:</span>
            {ALL_STATS.map((stat) => (
              <ToggleCheckbox
                key={stat}
                label={stat}
                checked={activeClass.primeRequisite.includes(stat)}
                onChange={(chk) =>
                  updateClass((c) => {
                    c.primeRequisite = chk
                      ? [...c.primeRequisite, stat]
                      : c.primeRequisite.filter((s) => s !== stat);
                  })
                }
              />
            ))}
          </div>
          <ToggleCheckbox
            label="Can Dual-Wield"
            checked={activeClass.canDualWield}
            onChange={(chk) => updateClass((c) => { c.canDualWield = chk; })}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <span className="text-xs text-[#B2ADA0]">Allowed Alignments (empty = all):</span>
          {ALL_ALIGNMENTS.map((al) => (
            <ToggleCheckbox
              key={al}
              label={al}
              checked={activeClass.allowedAlignments?.includes(al) ?? false}
              onChange={(chk) =>
                updateClass((c) => {
                  const curr = c.allowedAlignments ?? [];
                  const next = chk ? [...curr, al] : curr.filter((x) => x !== al);
                  c.allowedAlignments = next.length > 0 ? next : undefined;
                })
              }
            />
          ))}
        </div>

        <TextField
          label="Allowed Weapon Tags (comma separated)"
          value={activeClass.allowedWeaponTags.join(', ')}
          mono
          onChange={(v) =>
            updateClass((c) => {
              c.allowedWeaponTags = v
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            })
          }
        />
      </section>

      {/* Levels 1-13 Matrix */}
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5">
        <SectionHeader
          title={locale === 'hu' ? 'Szinttábla (1–13. szint)' : 'Levels 1–13 Progression Matrix'}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse font-mono tabular-nums">
            <thead>
              <tr className="border-b border-[#665B48] text-[#B2ADA0] text-left">
                <th className="py-2 pr-3">Lvl</th>
                <th className="py-2 pr-3">XP Required</th>
                <th className="py-2 pr-3">HP Gain</th>
                <th className="py-2 pr-3">THAC0</th>
                <th className="py-2 pr-2 text-center">T1</th>
                <th className="py-2 pr-2 text-center">T2</th>
                <th className="py-2 pr-2 text-center">T3</th>
                <th className="py-2 pr-2 text-center">T4</th>
                <th className="py-2 pr-2 text-center">T5</th>
                <th className="py-2 text-center">T6</th>
              </tr>
            </thead>
            <tbody>
              {activeClass.progression.map((row, idx) => (
                <tr key={row.level} className="border-b border-[#665B48]/30 hover:bg-[#17191B]/40">
                  <td className="py-1.5 pr-3 text-[#C6A365] font-semibold">{row.level}</td>
                  <td className="py-1.5 pr-3 w-36">
                    <SharedNumberField
                      compact
                      value={row.xpRequired}
                      min={0}
                      step={500}
                      fineStep={50}
                      ariaLabel={`Level ${row.level} XP required`}
                      onChange={(v) =>
                        updateClass((c) => {
                          c.progression[idx].xpRequired = v;
                        })
                      }
                    />
                  </td>
                  <td className="py-1.5 pr-3 w-28">
                    <input
                      type="text"
                      aria-label={`Level ${row.level} HP gain`}
                      value={row.hpGainDice}
                      onChange={(e) =>
                        updateClass((c) => {
                          c.progression[idx].hpGainDice = e.target.value;
                        })
                      }
                      className="w-full h-7 px-2 bg-[#17191B] border border-[#665B48]/70 focus:border-[#C6A365] rounded text-xs text-[#EEE3CA] outline-none"
                    />
                  </td>
                  <td className="py-1.5 pr-3 w-24">
                    <SharedNumberField
                      compact
                      value={row.thac0}
                      min={1}
                      max={20}
                      ariaLabel={`Level ${row.level} THAC0`}
                      onChange={(v) =>
                        updateClass((c) => {
                          c.progression[idx].thac0 = v;
                        })
                      }
                    />
                  </td>
                  {[0, 1, 2, 3, 4, 5].map((tierIdx) => (
                    <td key={tierIdx} className="py-1.5 pr-2 w-16">
                      <SharedNumberField
                        compact
                        value={row.spellSlots[tierIdx]}
                        min={0}
                        max={9}
                        ariaLabel={`Level ${row.level} Tier ${tierIdx + 1} slots`}
                        onChange={(v) =>
                          updateClass((c) => {
                            c.progression[idx].spellSlots[tierIdx] = v;
                          })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
