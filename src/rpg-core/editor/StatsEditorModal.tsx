import React, { useEffect } from 'react';
import { EditorTabId, RulesetBundle } from '../types/ruleset.types';
import { RpgRuntime } from '../runtime/RpgRuntime';
import { useRulesetEditorStore } from './store/useRulesetEditorStore';
import { EditorTopBar } from './components/EditorTopBar';
import { EntitySidebar } from './components/EntitySidebar';
import { StatsFormulasPanel } from './panels/StatsFormulasPanel';
import { ClassesXpPanel } from './panels/ClassesXpPanel';
import { RacesPanel } from './panels/RacesPanel';
import { SpellsPanel } from './panels/SpellsPanel';
import { ItemsPanel } from './panels/ItemsPanel';
import { MonstersPanel } from './panels/MonstersPanel';
import { PartyPresetsPanel } from './panels/PartyPresetsPanel';
import { TranslationsPanel } from './panels/TranslationsPanel';
import { QuickTestPanel } from './panels/QuickTestPanel';

export interface StatsEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveRuntime?: RpgRuntime;
  initialTab?: EditorTabId;
  initialEntityId?: string;
  onSaveToProject?: (bundle: RulesetBundle) => Promise<void>;
}

export const StatsEditorModal: React.FC<StatsEditorModalProps> = ({
  isOpen,
  onClose,
  liveRuntime,
  initialTab,
  initialEntityId,
  onSaveToProject,
}) => {
  const { bundle, activeTab, setActiveTab, setSelectedEntityId, undo, redo } =
    useRulesetEditorStore();

  useEffect(() => {
    if (!isOpen) return;
    if (initialTab) {
      setActiveTab(initialTab);
      if (initialEntityId) {
        setSelectedEntityId(initialTab, initialEntityId);
      }
    }
  }, [isOpen, initialTab, initialEntityId, setActiveTab, setSelectedEntityId]);

  useEffect(() => {
    if (liveRuntime) {
      liveRuntime.reloadRuleset(bundle);
    }
  }, [bundle, liveRuntime]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, undo, redo]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AD&D 2e Ruleset & Stats Editor"
      className="fixed inset-0 z-50 bg-[#17191B]/95 text-[#EEE3CA] flex flex-col overflow-hidden"
    >
      <EditorTopBar onClose={onClose} onSaveToProject={onSaveToProject} />

      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        <EntitySidebar tab={activeTab} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#17191B] min-w-0">
          {activeTab === 'stats' && <StatsFormulasPanel />}
          {activeTab === 'classes' && <ClassesXpPanel />}
          {activeTab === 'races' && <RacesPanel />}
          {activeTab === 'spells' && <SpellsPanel />}
          {activeTab === 'items' && <ItemsPanel />}
          {activeTab === 'monsters' && <MonstersPanel />}
          {activeTab === 'party' && <PartyPresetsPanel liveRuntime={liveRuntime} />}
          {activeTab === 'translations' && <TranslationsPanel />}
          {activeTab === 'test' && <QuickTestPanel liveRuntime={liveRuntime} />}
        </main>
      </div>
    </div>
  );
};
