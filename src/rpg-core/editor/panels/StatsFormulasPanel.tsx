import React from 'react';
import { t } from '../i18n';
import { useRulesetEditorStore } from '../store/useRulesetEditorStore';
import { SharedNumberField } from '../components/SharedNumberField';
import { LocalizedField, SectionHeader, TextField } from '../components/FormControls';

export const StatsFormulasPanel: React.FC = () => {
  const { bundle, locale, selectedEntityId, updateBundle } = useRulesetEditorStore();
  const activeRuleId = selectedEntityId.stats;
  const activeRule = bundle.checkRules.find((r) => r.id === activeRuleId) ?? bundle.checkRules[0];

  return (
    <div className="p-3 md:p-6 max-w-5xl flex flex-col gap-4 md:gap-8">
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5">
        <SectionHeader
          title={locale === 'hu' ? 'Globális AD&D 2e szabályok' : 'Global AD&D 2e Rules'}
          subtitle={bundle.rulesetId}
        />
        <div className="flex flex-col gap-4">
          <LocalizedField
            label={locale === 'hu' ? 'Szabálykönyv címe' : 'Ruleset Title'}
            locale={locale}
            value={bundle.title}
            onChange={(next) => updateBundle((d) => { d.title = next; })}
          />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SharedNumberField
              label={locale === 'hu' ? 'Fő tulajdonság küszöb' : 'Prime Req Threshold'}
              value={bundle.globalRules.primeRequisiteXpThreshold}
              min={3}
              max={25}
              defaultValue={16}
              onChange={(v) => updateBundle((d) => { d.globalRules.primeRequisiteXpThreshold = v; })}
            />
            <SharedNumberField
              label={locale === 'hu' ? 'Fő tul. XP bónusz' : 'Prime Req XP Bonus'}
              value={bundle.globalRules.primeRequisiteXpBonus}
              min={0}
              max={1}
              step={0.05}
              fineStep={0.01}
              defaultValue={0.1}
              onChange={(v) => updateBundle((d) => { d.globalRules.primeRequisiteXpBonus = v; })}
            />
            <SharedNumberField
              label={locale === 'hu' ? 'Kritikus találat (d20)' : 'Crit Hit (d20)'}
              value={bundle.globalRules.critHitD20}
              min={1}
              max={20}
              defaultValue={20}
              onChange={(v) => updateBundle((d) => { d.globalRules.critHitD20 = v; })}
            />
            <SharedNumberField
              label={locale === 'hu' ? 'Kritikus hiba (d20)' : 'Crit Miss (d20)'}
              value={bundle.globalRules.critMissD20}
              min={1}
              max={20}
              defaultValue={1}
              onChange={(v) => updateBundle((d) => { d.globalRules.critMissD20 = v; })}
            />
            <TextField
              label={locale === 'hu' ? 'Morál próba kocka' : 'Morale Check Dice'}
              value={bundle.globalRules.moraleCheckDice}
              mono
              onChange={(v) => updateBundle((d) => { d.globalRules.moraleCheckDice = v; })}
            />
          </div>
        </div>
      </section>

      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5">
        <SectionHeader
          title={locale === 'hu' ? 'Kiválasztott próba szabály' : 'Selected Check Formula'}
          subtitle={activeRule?.id}
        />
        {!activeRule ? (
          <p className="text-xs text-[#B2ADA0]">{t(locale, 'noSelection')}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextField
                label="Rule ID"
                value={activeRule.id}
                mono
                onChange={(v) =>
                  updateBundle((d) => {
                    const target = d.checkRules.find((r) => r.id === activeRule.id);
                    if (target) target.id = v;
                  })
                }
              />
              <TextField
                label={locale === 'hu' ? 'Képlet' : 'Formula'}
                value={activeRule.formula}
                mono
                onChange={(v) =>
                  updateBundle((d) => {
                    const target = d.checkRules.find((r) => r.id === activeRule.id);
                    if (target) target.formula = v;
                  })
                }
              />
              <SharedNumberField
                label={locale === 'hu' ? 'Alap DC' : 'Default DC'}
                value={activeRule.defaultDc}
                min={1}
                max={100}
                defaultValue={12}
                onChange={(v) =>
                  updateBundle((d) => {
                    const target = d.checkRules.find((r) => r.id === activeRule.id);
                    if (target) target.defaultDc = v;
                  })
                }
              />
            </div>
            <LocalizedField
              label={locale === 'hu' ? 'Szabály neve' : 'Rule Name'}
              locale={locale}
              value={activeRule.name}
              onChange={(next) =>
                updateBundle((d) => {
                  const target = d.checkRules.find((r) => r.id === activeRule.id);
                  if (target) target.name = next;
                })
              }
            />
            <p className="text-xs text-[#B2ADA0]">
              {locale === 'hu'
                ? 'Használható változók: strMod, dexMod, conMod, intMod, wisMod, chaMod, moraleMod, level.'
                : 'Supported formula variables: strMod, dexMod, conMod, intMod, wisMod, chaMod, moraleMod, level.'}
            </p>
          </div>
        )}
      </section>

      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5">
        <SectionHeader
          title={locale === 'hu' ? 'AD&D 2e THAC0 & Tulajdonság Mátrix' : 'AD&D 2e Combat & Stat Reference'}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-xs">
          <div className="font-mono tabular-nums space-y-1.5 text-[#EEE3CA] break-words">
            <div className="text-[#C6A365] font-semibold mb-2">THAC0 & AC Formula</div>
            <div>modifiedThac0 = baseThac0 - strAttackMod - weaponMagic - blessed</div>
            <div>effectiveAc = baseArmorAc - dexAcMod - shieldBonus - ringBonus</div>
            <div>requiredD20 = modifiedThac0 - effectiveAc</div>
            <div className="text-[#B2ADA0]">Natural 20 always hits · Natural 1 always misses</div>
          </div>
          <div className="font-mono tabular-nums space-y-1.5 text-[#EEE3CA]">
            <div className="text-[#C6A365] font-semibold mb-2">Prime Stat Breakpoints</div>
            <div>STR 16/17: +1 hit, +1 dmg · STR 18: +2 hit, +2 dmg</div>
            <div>DEX 15..18: -1 to -4 AC bonus (descending)</div>
            <div>CON 15..18: +1..+2 HP/lvl (+3/+4 for Warriors)</div>
            <div>WIS 13..18: Bonus Cleric Tier 1–4 Spell Slots</div>
          </div>
        </div>
      </section>
    </div>
  );
};
