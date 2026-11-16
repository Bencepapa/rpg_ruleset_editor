import React, { useState } from 'react';
import { Dices, Play, Plus, Swords, Trash2 } from 'lucide-react';
import { BatchSimResult, runBatchSimulation } from '../../engine/batchSimulator';
import { evaluateCheckFormula, rollDiceExpression } from '../../engine/dice';
import {
  computeCharacterSheet,
  computeEffectiveStats,
  getGenericStatMod,
  getStrDamageMod,
  resolveThac0Attack,
} from '../../engine/rulesEngine';
import { RpgRuntime } from '../../runtime/RpgRuntime';
import { t } from '../i18n';
import { useRulesetEditorStore } from '../store/useRulesetEditorStore';
import { SharedNumberField } from '../components/SharedNumberField';
import { SectionHeader, SelectField, TextField } from '../components/FormControls';

interface CheckRollLog {
  label: string;
  formula: string;
  rawSummary: string;
  total: number;
  target: number;
  passed: boolean;
  detail: string;
}

export const QuickTestPanel: React.FC<{ liveRuntime?: RpgRuntime }> = ({ liveRuntime }) => {
  const { bundle, locale } = useRulesetEditorStore();

  const [partySource, setPartySource] = useState<string>(
    liveRuntime ? '__live__' : bundle.partyPresets[0]?.id ?? ''
  );
  const [enemyIds, setEnemyIds] = useState<string[]>([
    'orc_warrior',
    'orc_warrior',
    'skeleton_guard',
  ]);
  const [addMonsterId, setAddMonsterId] = useState<string>(bundle.monsters[0]?.id ?? 'orc_warrior');
  const [simResult, setSimResult] = useState<BatchSimResult | null>(null);

  const activePartyMembers =
    partySource === '__live__' && liveRuntime
      ? liveRuntime.getActiveParty()
      : bundle.partyPresets.find((p) => p.id === partySource)?.members ??
        bundle.partyPresets[0]?.members ??
        [];

  const [selectedCharId, setSelectedCharId] = useState<string>(
    activePartyMembers[0]?.id ?? ''
  );
  const [checkMode, setCheckMode] = useState<string>(bundle.checkRules[0]?.id ?? 'PICK_LOCK');
  const [customFormula, setCustomFormula] = useState<string>('1d20 + 3');
  const [dcOverride, setDcOverride] = useState<number>(14);
  const [targetAc, setTargetAc] = useState<number>(5);
  const [rollHistory, setRollHistory] = useState<CheckRollLog[]>([]);

  const handleRunSim = () => {
    if (activePartyMembers.length === 0 || enemyIds.length === 0) return;
    const result = runBatchSimulation({
      bundle,
      partyMembers: activePartyMembers,
      monsterIds: enemyIds,
      iterations: 50,
      seed: Math.floor(Math.random() * 100000),
    });
    setSimResult(result);
  };

  const handleRoll = () => {
    const actor =
      activePartyMembers.find((m) => m.id === selectedCharId) ?? activePartyMembers[0];

    if (checkMode === '__custom__') {
      const res = rollDiceExpression(customFormula);
      setRollHistory((prev) => [
        {
          label: 'Custom Formula',
          formula: customFormula,
          rawSummary: res.rawSummary,
          total: res.total,
          target: dcOverride,
          passed: res.total >= dcOverride,
          detail: `Rolled ${res.total} vs DC ${dcOverride}`,
        },
        ...prev.slice(0, 7),
      ]);
      return;
    }

    if (!actor) return;

    if (checkMode === '__thac0__') {
      const sheet = computeCharacterSheet(bundle, actor);
      const weapon = actor.equipped.main_hand
        ? bundle.items.find((i) => i.id === actor.equipped.main_hand)
        : undefined;
      const res = resolveThac0Attack({
        modifiedThac0: sheet.modifiedThac0,
        effectiveTargetAc: targetAc,
        damageDice: weapon?.weaponStats?.damageDice ?? '1d4',
        damageType: weapon?.weaponStats?.damageType ?? 'bludgeoning',
        strDamageMod: sheet.strDamageMod,
        weaponMagicBonus: weapon?.weaponStats?.magicBonus ?? 0,
        targetResistances: {},
      });
      setRollHistory((prev) => [
        {
          label: `${actor.name} · THAC0 Attack`,
          formula: `THAC0 ${sheet.modifiedThac0} vs AC ${targetAc}`,
          rawSummary: `d20=[${res.d20Roll}] (need >= ${res.requiredRoll})`,
          total: res.d20Roll,
          target: res.requiredRoll,
          passed: res.hit,
          detail: res.hit
            ? `${res.isCrit ? 'CRITICAL HIT' : 'HIT'} for ${res.finalDamage} damage`
            : `${res.isCritMiss ? 'CRITICAL MISS' : 'MISS'}`,
        },
        ...prev.slice(0, 7),
      ]);
      return;
    }

    const rule = bundle.checkRules.find((r) => r.id === checkMode);
    if (!rule) return;
    const race = bundle.races.find((r) => r.id === actor.raceId);
    const effStats = computeEffectiveStats(actor, race);
    const maxLevel = Math.max(...Object.values(actor.levels), 1);
    const vars: Record<string, number> = {
      strMod: getStrDamageMod(effStats.STR),
      dexMod: getGenericStatMod(effStats.DEX),
      conMod: getGenericStatMod(effStats.CON),
      intMod: getGenericStatMod(effStats.INT),
      wisMod: getGenericStatMod(effStats.WIS),
      chaMod: getGenericStatMod(effStats.CHA),
      moraleMod: actor.morale - 8,
      level: maxLevel,
    };
    const res = evaluateCheckFormula(rule.formula, vars);
    setRollHistory((prev) => [
      {
        label: `${actor.name} · ${rule.name[locale]}`,
        formula: rule.formula,
        rawSummary: res.rawSummary,
        total: res.total,
        target: dcOverride,
        passed: res.total >= dcOverride,
        detail: `${res.total >= dcOverride ? 'SUCCESS' : 'FAIL'} (${res.total} vs DC ${dcOverride})`,
      },
      ...prev.slice(0, 7),
    ]);
  };

  return (
    <div className="p-3 md:p-6 max-w-5xl flex flex-col gap-4 md:gap-6">
      {/* 50-Run Batch Auto-Battle */}
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-4">
        <SectionHeader
          title={locale === 'hu' ? '50 körös automatikus csata szimulátor' : '50-Run Batch Auto-Battle Simulator'}
          subtitle="Headless deterministic combat benchmark"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label={locale === 'hu' ? 'Csapat' : 'Party Roster'}
            value={partySource}
            options={[
              ...(liveRuntime ? [{ value: '__live__', label: 'Live Active Dungeon Party' }] : []),
              ...bundle.partyPresets.map((p) => ({ value: p.id, label: p.name[locale] })),
            ]}
            onChange={setPartySource}
          />

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <SelectField
                label={locale === 'hu' ? 'Ellenség hozzáadása' : 'Add Monster to Encounter'}
                value={addMonsterId}
                options={bundle.monsters.map((m) => ({
                  value: m.id,
                  label: `${m.name[locale]} (HD ${m.levelOrHd})`,
                }))}
                onChange={setAddMonsterId}
              />
            </div>
            <button
              type="button"
              onClick={() => setEnemyIds((prev) => [...prev, addMonsterId])}
              aria-label="Add monster"
              className="h-8 px-3 rounded bg-[#17191B] border border-[#665B48] text-[#C6A365] hover:border-[#C6A365] flex items-center gap-1 text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-[#17191B] p-3 rounded border border-[#665B48]/50">
          <span className="text-xs text-[#B2ADA0] mr-1">
            Encounter ({enemyIds.length}):
          </span>
          {enemyIds.length === 0 ? (
            <span className="text-xs text-[#B74541]">Add at least 1 monster to simulate.</span>
          ) : (
            enemyIds.map((mid, idx) => {
              const m = bundle.monsters.find((x) => x.id === mid);
              return (
                <button
                  key={`${mid}_${idx}`}
                  type="button"
                  onClick={() => setEnemyIds((prev) => prev.filter((_, i) => i !== idx))}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#292A28] border border-[#665B48] text-xs text-[#EEE3CA] hover:border-[#B74541] cursor-pointer"
                >
                  <span>{m?.name[locale] ?? mid}</span>
                  <Trash2 className="w-3 h-3 text-[#B74541]" />
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={enemyIds.length === 0 || activePartyMembers.length === 0}
            onClick={handleRunSim}
            className="flex items-center gap-2 px-4 py-2 rounded bg-[#C6A365] text-[#17191B] text-xs font-semibold hover:bg-[#d6b67c] disabled:opacity-40 cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            <span>{t(locale, 'run50Battles')}</span>
          </button>
          {simResult && (
            <span className="text-xs font-mono tabular-nums text-[#B2ADA0]">
              {simResult.iterations} runs completed in {simResult.elapsedMs} ms
            </span>
          )}
        </div>

        {simResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <div className="bg-[#17191B] border border-[#665B48]/60 rounded p-3">
              <div className="text-xs text-[#B2ADA0]">{t(locale, 'winRate')}</div>
              <div className="text-2xl font-mono tabular-nums font-semibold text-[#C6A365] mt-1">
                {simResult.winRatePercent}%
              </div>
              <div className="text-[11px] font-mono tabular-nums text-[#B2ADA0] mt-0.5">
                {simResult.partyWins}W · {simResult.partyLosses}L
              </div>
            </div>
            <div className="bg-[#17191B] border border-[#665B48]/60 rounded p-3">
              <div className="text-xs text-[#B2ADA0]">{t(locale, 'avgRounds')}</div>
              <div className="text-2xl font-mono tabular-nums font-semibold text-[#EEE3CA] mt-1">
                {simResult.avgRounds}
              </div>
            </div>
            <div className="bg-[#17191B] border border-[#665B48]/60 rounded p-3">
              <div className="text-xs text-[#B2ADA0]">{t(locale, 'partyDeaths')}</div>
              <div className="text-2xl font-mono tabular-nums font-semibold text-[#B74541] mt-1">
                {simResult.totalPartyDeaths}
              </div>
            </div>
            <div className="bg-[#17191B] border border-[#665B48]/60 rounded p-3">
              <div className="text-xs text-[#B2ADA0]">{t(locale, 'moraleBreaks')}</div>
              <div className="text-2xl font-mono tabular-nums font-semibold text-[#3C8EB8] mt-1">
                {simResult.enemyMoraleBreaks}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Basic Dice & Check Roller */}
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-4">
        <SectionHeader
          title={locale === 'hu' ? 'Alap kocka és próbadobás teszter' : 'Basic Dice & Check Roller'}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <SelectField
            label="Character"
            value={selectedCharId}
            options={activePartyMembers.map((m) => ({ value: m.id, label: m.name }))}
            onChange={setSelectedCharId}
          />
          <SelectField
            label="Check / Action"
            value={checkMode}
            options={[
              ...bundle.checkRules.map((r) => ({ value: r.id, label: `${r.name[locale]} (${r.id})` })),
              { value: '__thac0__', label: 'THAC0 Attack' },
              { value: '__custom__', label: 'Custom Dice Formula' },
            ]}
            onChange={(v) => {
              setCheckMode(v);
              const found = bundle.checkRules.find((r) => r.id === v);
              if (found) setDcOverride(found.defaultDc);
            }}
          />

          {checkMode === '__custom__' ? (
            <TextField
              label="Dice Formula"
              value={customFormula}
              mono
              onChange={setCustomFormula}
            />
          ) : checkMode === '__thac0__' ? (
            <SharedNumberField
              label="Target AC"
              value={targetAc}
              min={-10}
              max={10}
              defaultValue={5}
              onChange={setTargetAc}
            />
          ) : (
            <SharedNumberField
              label="Difficulty (DC)"
              value={dcOverride}
              min={1}
              max={100}
              defaultValue={14}
              onChange={setDcOverride}
            />
          )}

          <button
            type="button"
            onClick={handleRoll}
            className="h-8 px-4 rounded bg-[#C6A365] text-[#17191B] text-xs font-semibold hover:bg-[#d6b67c] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Dices className="w-4 h-4" />
            <span>{t(locale, 'roll')}</span>
          </button>
        </div>

        {rollHistory.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-1">
            {rollHistory.map((entry, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center justify-between gap-2 bg-[#17191B] border border-[#665B48]/50 rounded px-3 py-2 text-xs font-mono tabular-nums"
              >
                <div className="flex items-center gap-2">
                  <Play className="w-3 h-3 text-[#C6A365]" />
                  <span className="text-[#EEE3CA] font-semibold">{entry.label}</span>
                  <span className="text-[#B2ADA0]">{entry.formula}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#B2ADA0]">{entry.rawSummary}</span>
                  <span className="text-[#EEE3CA] font-bold">= {entry.total}</span>
                  <span
                    className={`font-semibold ${
                      entry.passed ? 'text-[#C6A365]' : 'text-[#B74541]'
                    }`}
                  >
                    {entry.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
