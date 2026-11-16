/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, HeartPulse, Shield, Swords, Users } from 'lucide-react';
import {
  RpgRuntime,
  StatsEditorModal,
  computeCharacterSheet,
  useRulesetEditorStore,
} from './rpg-core';

export default function App() {
  const { bundle, locale, markSaved } = useRulesetEditorStore();
  const [editorOpen, setEditorOpen] = useState(true);
  const [runtimeTick, setRuntimeTick] = useState(0);
  const [combatLog, setCombatLog] = useState<string[]>([]);

  const runtime = useMemo(() => {
    const rt = new RpgRuntime(bundle);
    rt.spawnEncounter(['orc_warrior', 'orc_warrior', 'skeleton_guard']);
    return rt;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return runtime.subscribe(() => setRuntimeTick((n) => n + 1));
  }, [runtime]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setEditorOpen(true);
    }
  }, []);

  // Keep runtime synced on explicit save or live edits
  const handleSaveToProject = async () => {
    runtime.reloadRuleset(bundle);
    markSaved();
  };

  void runtimeTick;
  const party = runtime.getActiveParty();
  const encounter = runtime.getActiveEncounter();

  const appendLog = (line: string) => {
    setCombatLog((prev) => [line, ...prev.slice(0, 9)]);
  };

  const handleQuickStrike = (attackerId: string) => {
    const target = encounter.find((m) => m.currentHp > 0 && !m.moraleBroken);
    if (!target) {
      appendLog('All enemies defeated or routed. Spawn a new encounter to continue.');
      return;
    }
    const outcome = runtime.performAttack({ attackerId, targetId: target.instanceId });
    for (const ev of outcome.events) {
      if (ev.type === 'DAMAGE') {
        appendLog(
          `${attackerId} hit ${target.name[locale]} for ${ev.amount} ${ev.damageType} damage (${ev.targetRemainingHp}/${target.maxHp} HP)`
        );
      } else if (ev.type === 'MISS') {
        appendLog(`${attackerId} missed ${target.name[locale]} (d20=${ev.d20Roll}, need ${ev.requiredRoll})`);
      } else if (ev.type === 'MORALE_BROKEN') {
        appendLog(`${target.name[locale]} failed morale (2d6=${ev.roll2d6} > ${ev.moraleThreshold}) and fled!`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#17191B] text-[#EEE3CA] flex flex-col">
      {/* Standalone Host Bar (mirrors voidcrew EditorBar integration) */}
      <header className="min-h-14 border-b border-[#665B48] bg-[#292A28] px-3 md:px-6 py-2 md:py-0 flex flex-wrap items-center justify-between gap-2 md:gap-6">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-[#C6A365]" />
          <h1 className="font-display text-sm md:text-base font-bold text-[#EEE3CA] tracking-wide whitespace-nowrap">
            AD&amp;D 2e RPG Core
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => {
              runtime.spawnEncounter(['orc_warrior', 'orc_warrior', 'skeleton_guard']);
              appendLog('Spawned Orc & Skeleton Patrol.');
            }}
            className="px-2.5 md:px-3 py-1.5 rounded border border-[#665B48] bg-[#17191B] text-xs text-[#EEE3CA] hover:border-[#C6A365] whitespace-nowrap cursor-pointer"
          >
            Respawn Encounter
          </button>
          <button
            type="button"
            onClick={() => {
              runtime.fullRestoreParty();
              appendLog('Party fully restored.');
            }}
            className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded border border-[#665B48] bg-[#17191B] text-xs text-[#EEE3CA] hover:border-[#B74541] whitespace-nowrap cursor-pointer"
          >
            <HeartPulse className="w-3.5 h-3.5 text-[#B74541]" />
            <span>Restore Party</span>
          </button>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded bg-[#C6A365] text-[#17191B] text-xs font-semibold hover:bg-[#d6b67c] whitespace-nowrap cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Stats Editor</span>
          </button>
        </div>
      </header>

      {/* Standalone Live Runtime Sandbox */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#665B48]/50 pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C6A365]" />
              <h2 className="font-display text-sm font-bold text-[#C6A365]">Active Party</h2>
            </div>
            <span className="text-xs font-mono text-[#B2ADA0]">{party.length} members</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {party.map((member) => {
              const sheet = computeCharacterSheet(bundle, member);
              return (
                <div
                  key={member.id}
                  className="bg-[#17191B] border border-[#665B48]/60 rounded p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#EEE3CA]">
                      <span>{member.name}</span>
                      <span className="text-xs font-mono text-[#B2ADA0]">
                        {member.classIds.join('/')} · {member.row}
                      </span>
                    </div>
                    <div className="text-xs font-mono tabular-nums text-[#B2ADA0] mt-0.5">
                      HP {member.currentHp}/{member.maxHp} · AC {sheet.effectiveAc} · THAC0{' '}
                      {sheet.modifiedThac0}
                      {sheet.resourceType !== 'none'
                        ? ` · Spells ${member.memorizedSpellIds.length}`
                        : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickStrike(member.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#C6A365] text-[#17191B] text-xs font-semibold hover:bg-[#d6b67c] shrink-0 cursor-pointer"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>Attack</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#665B48]/50 pb-2">
            <h2 className="font-display text-sm font-bold text-[#C6A365]">Active Encounter</h2>
            <span className="text-xs font-mono text-[#B2ADA0]">{encounter.length} hostiles</span>
          </div>

          <div className="flex flex-col gap-2">
            {encounter.map((mon) => (
              <div
                key={mon.instanceId}
                className="bg-[#17191B] border border-[#665B48]/60 rounded p-3 flex items-center justify-between text-xs font-mono tabular-nums"
              >
                <span className="text-[#EEE3CA] font-sans font-medium">
                  {mon.name[locale]} ({mon.row})
                </span>
                <span className={mon.currentHp === 0 || mon.moraleBroken ? 'text-[#B74541]' : 'text-[#B2ADA0]'}>
                  {mon.moraleBroken
                    ? 'ROUTED'
                    : mon.currentHp === 0
                    ? 'DEFEATED'
                    : `HP ${mon.currentHp}/${mon.maxHp} · AC ${mon.ac} · Morale ${mon.morale}`}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-2 pt-3 border-t border-[#665B48]/50">
            <div className="text-xs text-[#B2ADA0] mb-1.5">Runtime Event Feed</div>
            <div className="bg-[#17191B] border border-[#665B48]/50 rounded p-2.5 h-36 overflow-y-auto font-mono text-[11px] text-[#EEE3CA] space-y-1">
              {combatLog.length === 0 ? (
                <div className="text-[#B2ADA0]">Click Attack on any party member or open Stats Editor.</div>
              ) : (
                combatLog.map((line, idx) => <div key={idx}>{line}</div>)
              )}
            </div>
          </div>
        </section>
      </main>

      <StatsEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        liveRuntime={runtime}
        onSaveToProject={handleSaveToProject}
      />
    </div>
  );
}
