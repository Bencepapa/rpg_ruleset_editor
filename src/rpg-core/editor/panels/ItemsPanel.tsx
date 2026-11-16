import React from 'react';
import { ArmorWeight, DamageType, EquipmentSlot, ItemDef } from '../../types/ruleset.types';
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

const SLOTS: EquipmentSlot[] = [
  'main_hand', 'off_hand', 'head', 'chest', 'hands', 'feet', 'neck', 'ring',
];

export const ItemsPanel: React.FC = () => {
  const { bundle, locale, selectedEntityId, updateBundle } = useRulesetEditorStore();
  const item = bundle.items.find((i) => i.id === selectedEntityId.items) ?? bundle.items[0];

  if (!item) {
    return <div className="p-6 text-xs text-[#B2ADA0]">{t(locale, 'noSelection')}</div>;
  }

  const updateItem = (fn: (it: ItemDef) => void) => {
    updateBundle((draft) => {
      const target = draft.items.find((x) => x.id === item.id);
      if (target) fn(target);
    });
  };

  return (
    <div className="p-3 md:p-6 max-w-4xl flex flex-col gap-4 md:gap-6">
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-4">
        <SectionHeader title={item.name[locale]} subtitle={`${item.category} · ${item.id}`} />

        <LocalizedField
          label={locale === 'hu' ? 'Tárgy neve' : 'Item Name'}
          locale={locale}
          value={item.name}
          onChange={(next) => updateItem((it) => { it.name = next; })}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SelectField
            label="Category"
            value={item.category}
            options={[
              { value: 'weapon', label: 'weapon' },
              { value: 'shield', label: 'shield' },
              { value: 'armor', label: 'armor' },
              { value: 'accessory', label: 'accessory' },
              { value: 'consumable', label: 'consumable' },
              { value: 'scroll', label: 'scroll' },
              { value: 'quest', label: 'quest' },
              { value: 'resource', label: 'resource' },
            ]}
            onChange={(v) => updateItem((it) => { it.category = v as ItemDef['category']; })}
          />
          <SelectField
            label="Equipment Slot"
            value={item.slot ?? ''}
            options={[
              { value: '', label: '(none / inventory)' },
              ...SLOTS.map((s) => ({ value: s, label: s })),
            ]}
            onChange={(v) => updateItem((it) => { it.slot = (v || undefined) as EquipmentSlot | undefined; })}
          />
          <SharedNumberField
            label="Weight (lbs)"
            value={item.weight}
            min={0}
            max={200}
            step={0.5}
            fineStep={0.1}
            defaultValue={1}
            onChange={(v) => updateItem((it) => { it.weight = v; })}
          />
          <SharedNumberField
            label="Gold Value (gp)"
            value={item.goldValue}
            min={0}
            max={50000}
            step={5}
            defaultValue={10}
            onChange={(v) => updateItem((it) => { it.goldValue = v; })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextField
            label="Inventory Icon ID (2D HUD)"
            value={item.inventoryIconId}
            mono
            onChange={(v) => updateItem((it) => { it.inventoryIconId = v; })}
          />
          <TextField
            label="World Visual ID (3D Floor Mesh)"
            value={item.worldVisualId}
            mono
            onChange={(v) => updateItem((it) => { it.worldVisualId = v; })}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-center pt-1">
          <ToggleCheckbox
            label="Identified By Default"
            checked={item.identifiedByDefault}
            onChange={(chk) => updateItem((it) => { it.identifiedByDefault = chk; })}
          />
          <ToggleCheckbox
            label="Cursed"
            checked={Boolean(item.cursed)}
            onChange={(chk) => updateItem((it) => { it.cursed = chk || undefined; })}
          />
          <ToggleCheckbox
            label="Stackable"
            checked={item.stackable}
            onChange={(chk) => updateItem((it) => { it.stackable = chk; })}
          />
          <SharedNumberField
            label="Max Stack"
            value={item.maxStack}
            min={1}
            max={99}
            defaultValue={1}
            onChange={(v) => updateItem((it) => { it.maxStack = v; })}
          />
        </div>
      </section>

      {/* Weapon Stats */}
      {(item.category === 'weapon' || item.weaponStats) && (
        <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#665B48]/50 pb-2">
            <h3 className="font-display text-sm font-bold text-[#C6A365]">Weapon Stats</h3>
            {!item.weaponStats && (
              <button
                type="button"
                onClick={() =>
                  updateItem((it) => {
                    it.weaponStats = {
                      damageDice: '1d8',
                      damageType: 'slashing',
                      magicBonus: 0,
                      attackSpeedMs: 1400,
                      range: 'melee',
                      twoHanded: false,
                      tags: ['sword'],
                    };
                  })
                }
                className="text-xs px-2 py-1 rounded bg-[#17191B] border border-[#665B48] text-[#C6A365] cursor-pointer"
              >
                Enable Weapon Stats
              </button>
            )}
          </div>
          {item.weaponStats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <TextField
                  label="Damage Dice"
                  value={item.weaponStats.damageDice}
                  mono
                  onChange={(v) => updateItem((it) => { if (it.weaponStats) it.weaponStats.damageDice = v; })}
                />
                <SelectField
                  label="Damage Type"
                  value={item.weaponStats.damageType}
                  options={DAMAGE_TYPES.map((dt) => ({ value: dt, label: dt }))}
                  onChange={(v) => updateItem((it) => { if (it.weaponStats) it.weaponStats.damageType = v as DamageType; })}
                />
                <SharedNumberField
                  label="Magic Bonus"
                  value={item.weaponStats.magicBonus}
                  min={-5}
                  max={5}
                  defaultValue={0}
                  onChange={(v) => updateItem((it) => { if (it.weaponStats) it.weaponStats.magicBonus = v; })}
                />
                <SharedNumberField
                  label="Attack Speed (ms)"
                  value={item.weaponStats.attackSpeedMs}
                  min={200}
                  max={5000}
                  step={50}
                  defaultValue={1400}
                  onChange={(v) => updateItem((it) => { if (it.weaponStats) it.weaponStats.attackSpeedMs = v; })}
                />
                <SelectField
                  label="Range"
                  value={item.weaponStats.range}
                  options={[
                    { value: 'melee', label: 'melee' },
                    { value: 'ranged', label: 'ranged' },
                  ]}
                  onChange={(v) => updateItem((it) => { if (it.weaponStats) it.weaponStats.range = v as 'melee' | 'ranged'; })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <TextField
                  label="Weapon Tags (comma separated)"
                  value={item.weaponStats.tags.join(', ')}
                  mono
                  onChange={(v) =>
                    updateItem((it) => {
                      if (it.weaponStats) {
                        it.weaponStats.tags = v.split(',').map((s) => s.trim()).filter(Boolean);
                      }
                    })
                  }
                />
                <div className="pt-4">
                  <ToggleCheckbox
                    label="Two-Handed"
                    checked={item.weaponStats.twoHanded}
                    onChange={(chk) => updateItem((it) => { if (it.weaponStats) it.weaponStats.twoHanded = chk; })}
                  />
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* Armor / Shield / Accessory Stats */}
      {(item.category === 'armor' || item.category === 'shield' || item.category === 'accessory' || item.armorStats) && (
        <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#665B48]/50 pb-2">
            <h3 className="font-display text-sm font-bold text-[#C6A365]">Armor & Protection</h3>
            {!item.armorStats && (
              <button
                type="button"
                onClick={() =>
                  updateItem((it) => {
                    it.armorStats = { acBonus: 1, armorWeight: 'none' };
                  })
                }
                className="text-xs px-2 py-1 rounded bg-[#17191B] border border-[#665B48] text-[#C6A365] cursor-pointer"
              >
                Enable Armor Stats
              </button>
            )}
          </div>
          {item.armorStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SharedNumberField
                label="Base AC (10 = none)"
                value={item.armorStats.baseAc ?? 10}
                min={-5}
                max={10}
                defaultValue={10}
                onChange={(v) =>
                  updateItem((it) => {
                    if (it.armorStats) it.armorStats.baseAc = v === 10 ? undefined : v;
                  })
                }
              />
              <SharedNumberField
                label="AC Bonus"
                value={item.armorStats.acBonus ?? 0}
                min={-5}
                max={5}
                defaultValue={0}
                onChange={(v) =>
                  updateItem((it) => {
                    if (it.armorStats) it.armorStats.acBonus = v === 0 ? undefined : v;
                  })
                }
              />
              <SelectField
                label="Armor Weight Class"
                value={item.armorStats.armorWeight}
                options={[
                  { value: 'none', label: 'none' },
                  { value: 'leather', label: 'leather' },
                  { value: 'light_metal', label: 'light_metal' },
                  { value: 'heavy', label: 'heavy' },
                ]}
                onChange={(v) =>
                  updateItem((it) => {
                    if (it.armorStats) it.armorStats.armorWeight = v as ArmorWeight;
                  })
                }
              />
            </div>
          )}
        </section>
      )}

      {/* Scroll / Consumable */}
      {(item.category === 'scroll' || item.category === 'consumable') && (
        <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-4">
          <SectionHeader title="Consumable / Scroll Link" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SelectField
              label="Linked Spell (Scrolls)"
              value={item.linkedSpellId ?? ''}
              options={[
                { value: '', label: '(none)' },
                ...bundle.spells.map((s) => ({ value: s.id, label: `${s.name[locale]} (${s.school} T${s.tier})` })),
              ]}
              onChange={(v) => updateItem((it) => { it.linkedSpellId = v || undefined; })}
            />
            <TextField
              label="Heal Dice (Consumable)"
              value={item.consumableEffect?.healDice ?? ''}
              mono
              placeholder="e.g. 2d4+2"
              onChange={(v) =>
                updateItem((it) => {
                  it.consumableEffect = { ...(it.consumableEffect ?? {}), healDice: v || undefined };
                })
              }
            />
            <SharedNumberField
              label="Morale Bonus"
              value={item.consumableEffect?.moraleBonus ?? 0}
              min={-4}
              max={6}
              defaultValue={0}
              onChange={(v) =>
                updateItem((it) => {
                  it.consumableEffect = {
                    ...(it.consumableEffect ?? {}),
                    moraleBonus: v !== 0 ? v : undefined,
                  };
                })
              }
            />
          </div>
        </section>
      )}
    </div>
  );
};
