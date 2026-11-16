import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DamageType, MonsterDef } from '../../types/ruleset.types';
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

export const MonstersPanel: React.FC = () => {
  const { bundle, locale, selectedEntityId, updateBundle } = useRulesetEditorStore();
  const monster = bundle.monsters.find((m) => m.id === selectedEntityId.monsters) ?? bundle.monsters[0];

  if (!monster) {
    return <div className="p-6 text-xs text-[#B2ADA0]">{t(locale, 'noSelection')}</div>;
  }

  const updateMonster = (fn: (m: MonsterDef) => void) => {
    updateBundle((draft) => {
      const target = draft.monsters.find((x) => x.id === monster.id);
      if (target) fn(target);
    });
  };

  return (
    <div className="p-3 md:p-6 max-w-5xl flex flex-col gap-4 md:gap-6">
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-4">
        <SectionHeader
          title={monster.name[locale]}
          subtitle={`HD ${monster.levelOrHd} · AC ${monster.baseAc} · THAC0 ${monster.thac0}`}
        />

        <LocalizedField
          label={locale === 'hu' ? 'Szörny neve' : 'Monster Name'}
          locale={locale}
          value={monster.name}
          onChange={(next) => updateMonster((m) => { m.name = next; })}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <TextField
            label="Actor Visual ID (3D Model)"
            value={monster.actorVisualId}
            mono
            onChange={(v) => updateMonster((m) => { m.actorVisualId = v; })}
          />
          <TextField
            label="Max HP Dice"
            value={monster.maxHpDice}
            mono
            onChange={(v) => updateMonster((m) => { m.maxHpDice = v; })}
          />
          <div className="pb-1.5">
            <ToggleCheckbox
              label="Is Undead (Immune to Hold/Fear)"
              checked={monster.isUndead}
              onChange={(chk) => updateMonster((m) => { m.isUndead = chk; })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SharedNumberField
            label="Level / Hit Dice"
            value={monster.levelOrHd}
            min={0}
            max={30}
            defaultValue={1}
            onChange={(v) => updateMonster((m) => { m.levelOrHd = v; })}
          />
          <SharedNumberField
            label="Base AC"
            value={monster.baseAc}
            min={-10}
            max={10}
            defaultValue={6}
            onChange={(v) => updateMonster((m) => { m.baseAc = v; })}
          />
          <SharedNumberField
            label="THAC0"
            value={monster.thac0}
            min={1}
            max={20}
            defaultValue={19}
            onChange={(v) => updateMonster((m) => { m.thac0 = v; })}
          />
          <SharedNumberField
            label="Morale (2..12)"
            value={monster.morale}
            min={2}
            max={12}
            defaultValue={8}
            onChange={(v) => updateMonster((m) => { m.morale = v; })}
          />
          <SharedNumberField
            label="XP Reward"
            value={monster.xpReward}
            min={0}
            max={50000}
            step={25}
            defaultValue={65}
            onChange={(v) => updateMonster((m) => { m.xpReward = v; })}
          />
        </div>
      </section>

      {/* Attacks */}
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#665B48]/50 pb-2">
          <h3 className="font-display text-sm font-bold text-[#C6A365]">Attacks</h3>
          <button
            type="button"
            onClick={() =>
              updateMonster((m) => {
                m.attacks.push({
                  name: { en: 'Strike', hu: 'Csapás' },
                  damageDice: '1d6',
                  damageType: 'slashing',
                  attackSpeedMs: 1500,
                });
              })
            }
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-[#C6A365] text-[#17191B] font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Attack</span>
          </button>
        </div>

        {monster.attacks.map((atk, idx) => (
          <div
            key={idx}
            className="grid grid-cols-1 md:grid-cols-5 gap-2.5 items-end bg-[#17191B]/60 p-3 rounded border border-[#665B48]/40"
          >
            <LocalizedField
              label={locale === 'hu' ? 'Támadás neve' : 'Attack Name'}
              locale={locale}
              value={atk.name}
              onChange={(next) => updateMonster((m) => { m.attacks[idx].name = next; })}
            />
            <TextField
              label="Damage Dice"
              value={atk.damageDice}
              mono
              onChange={(v) => updateMonster((m) => { m.attacks[idx].damageDice = v; })}
            />
            <SelectField
              label="Type"
              value={atk.damageType}
              options={DAMAGE_TYPES.map((dt) => ({ value: dt, label: dt }))}
              onChange={(v) => updateMonster((m) => { m.attacks[idx].damageType = v as DamageType; })}
            />
            <SharedNumberField
              label="Speed (ms)"
              value={atk.attackSpeedMs}
              min={300}
              max={5000}
              step={50}
              onChange={(v) => updateMonster((m) => { m.attacks[idx].attackSpeedMs = v; })}
            />
            <button
              type="button"
              onClick={() => updateMonster((m) => { m.attacks.splice(idx, 1); })}
              aria-label={`Remove attack ${idx + 1}`}
              className="h-8 px-2.5 rounded border border-[#665B48]/70 text-[#B74541] hover:border-[#B74541] flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </section>

      {/* Resistances */}
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-3">
        <SectionHeader
          title="Damage Resistances (-1.0 vuln .. 1.0 immune)"
          subtitle="0 = normal, 0.5 = 50% resist, 1 = immune"
        />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {DAMAGE_TYPES.map((dt) => (
            <SharedNumberField
              key={dt}
              label={dt}
              value={monster.resistances[dt] ?? 0}
              min={-1}
              max={1}
              step={0.25}
              fineStep={0.05}
              defaultValue={0}
              onChange={(v) =>
                updateMonster((m) => {
                  if (v === 0) delete m.resistances[dt];
                  else m.resistances[dt] = v;
                })
              }
            />
          ))}
        </div>
      </section>

      {/* Loot Table */}
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#665B48]/50 pb-2">
          <h3 className="font-display text-sm font-bold text-[#C6A365]">Loot Table</h3>
          <button
            type="button"
            onClick={() =>
              updateMonster((m) => {
                const firstItem = bundle.items[0]?.id ?? 'potion_healing';
                m.lootTable.push({ itemId: firstItem, dropChance: 0.25, minQty: 1, maxQty: 1 });
              })
            }
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-[#C6A365] text-[#17191B] font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Drop</span>
          </button>
        </div>

        {monster.lootTable.length === 0 ? (
          <p className="text-xs text-[#B2ADA0]">No loot entries configured.</p>
        ) : (
          monster.lootTable.map((entry, idx) => (
            <div
              key={idx}
              className="grid grid-cols-2 md:grid-cols-5 gap-2.5 items-end bg-[#17191B]/60 p-3 rounded border border-[#665B48]/40"
            >
              <SelectField
                label="Item"
                value={entry.itemId}
                options={bundle.items.map((it) => ({ value: it.id, label: it.name[locale] }))}
                onChange={(v) => updateMonster((m) => { m.lootTable[idx].itemId = v; })}
              />
              <SharedNumberField
                label="Drop Chance (0..1)"
                value={entry.dropChance}
                min={0}
                max={1}
                step={0.05}
                fineStep={0.01}
                onChange={(v) => updateMonster((m) => { m.lootTable[idx].dropChance = v; })}
              />
              <SharedNumberField
                label="Min Qty"
                value={entry.minQty}
                min={1}
                max={99}
                onChange={(v) => updateMonster((m) => { m.lootTable[idx].minQty = v; })}
              />
              <SharedNumberField
                label="Max Qty"
                value={entry.maxQty}
                min={1}
                max={99}
                onChange={(v) => updateMonster((m) => { m.lootTable[idx].maxQty = v; })}
              />
              <button
                type="button"
                onClick={() => updateMonster((m) => { m.lootTable.splice(idx, 1); })}
                aria-label={`Remove loot ${idx + 1}`}
                className="h-8 px-2.5 rounded border border-[#665B48]/70 text-[#B74541] hover:border-[#B74541] flex items-center justify-center cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
};
