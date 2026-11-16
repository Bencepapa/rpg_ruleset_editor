import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Redo2,
  RotateCcw,
  Save,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { EditorTabId, RulesetBundle, RulesetBundleSchema } from '../../types/ruleset.types';
import { TAB_LABELS, t } from '../i18n';
import { useRulesetEditorStore } from '../store/useRulesetEditorStore';

interface EditorTopBarProps {
  onClose: () => void;
  onSaveToProject?: (bundle: RulesetBundle) => Promise<void>;
}

const ALL_TABS: EditorTabId[] = [
  'stats',
  'classes',
  'races',
  'spells',
  'items',
  'monsters',
  'party',
  'translations',
  'test',
];

export const EditorTopBar: React.FC<EditorTopBarProps> = ({ onClose, onSaveToProject }) => {
  const {
    bundle,
    past,
    future,
    dirty,
    locale,
    activeTab,
    validationIssues,
    setLocale,
    setActiveTab,
    setSelectedEntityId,
    undo,
    redo,
    importBundle,
    resetToDefault,
    markSaved,
  } = useRulesetEditorStore();

  const [issuesOpen, setIssuesOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const errorCount = validationIssues.filter((i) => i.severity === 'error').length;
  const warnCount = validationIssues.filter((i) => i.severity === 'warning').length;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bundle.rulesetId || 'ruleset'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const parsed = RulesetBundleSchema.safeParse(json);
      if (!parsed.success) {
        setImportError(parsed.error.issues[0]?.message ?? 'Invalid ruleset JSON');
        return;
      }
      setImportError(null);
      importBundle(parsed.data as RulesetBundle);
    } catch {
      setImportError('Failed to parse JSON file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (onSaveToProject) {
        await onSaveToProject(bundle);
      }
      markSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="relative shrink-0 bg-[#292A28] border-b border-[#665B48] flex flex-col lg:flex-row lg:h-12 lg:items-center lg:justify-between lg:px-3 lg:gap-2">
      {/* Mobile Row 1: Title + Actions | Desktop: Title + Tabs (left) & Actions (right) */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 lg:p-0 lg:min-w-0 lg:flex-1">
        <span className="font-display text-xs sm:text-sm font-bold text-[#C6A365] tracking-wide whitespace-nowrap shrink-0">
          <span className="sm:hidden">Ruleset</span>
          <span className="hidden sm:inline">{t(locale, 'editorTitle')}</span>
        </span>
        <nav
          aria-label="Editor modules"
          className="hidden lg:flex items-center gap-0.5 overflow-x-auto"
        >
          {ALL_TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#C6A365] text-[#17191B]'
                    : 'text-[#B2ADA0] hover:text-[#EEE3CA] hover:bg-[#17191B]/60'
                }`}
              >
                {TAB_LABELS[tab][locale]}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {importError && (
            <span className="hidden sm:inline text-xs text-[#B74541] mr-1 truncate max-w-[160px]" title={importError}>
              {importError}
            </span>
          )}

          <div className="relative">
            <button
              type="button"
              aria-expanded={issuesOpen}
              aria-label={
                errorCount + warnCount > 0
                  ? `${errorCount + warnCount} ${t(locale, 'issues')}`
                  : t(locale, 'noIssues')
              }
              onClick={() => setIssuesOpen((v) => !v)}
              className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs font-mono tabular-nums rounded border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                errorCount > 0
                  ? 'bg-[#B74541]/20 border-[#B74541] text-[#EEE3CA]'
                  : warnCount > 0
                  ? 'bg-[#C6A365]/15 border-[#C6A365] text-[#EEE3CA]'
                  : 'bg-[#17191B] border-[#665B48]/70 text-[#B2ADA0] hover:text-[#EEE3CA]'
              }`}
            >
              {errorCount > 0 || warnCount > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-[#C6A365]" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A365]" />
              )}
              <span className={errorCount + warnCount > 0 ? 'inline' : 'hidden sm:inline'}>
                {errorCount + warnCount > 0
                  ? `${errorCount + warnCount}`
                  : t(locale, 'noIssues')}
              </span>
              {errorCount + warnCount > 0 && (
                <span className="hidden sm:inline">{t(locale, 'issues')}</span>
              )}
            </button>

            {issuesOpen && (
              <div className="fixed inset-x-3 top-12 sm:inset-x-auto sm:absolute sm:right-0 sm:top-10 z-50 sm:w-96 max-h-80 overflow-y-auto bg-[#17191B] border border-[#665B48] rounded shadow-2xl p-3">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#665B48]/50">
                <span className="text-xs font-semibold text-[#EEE3CA]">
                  {t(locale, 'validationPopoverTitle')}
                </span>
                <button
                  type="button"
                  onClick={() => setIssuesOpen(false)}
                  aria-label="Close validation list"
                  className="text-[#B2ADA0] hover:text-[#EEE3CA] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {validationIssues.length === 0 ? (
                <p className="text-xs text-[#B2ADA0] py-2">{t(locale, 'allRulesValid')}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {validationIssues.map((issue) => (
                    <li key={issue.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab(issue.tab);
                          if (issue.entityId) {
                            setSelectedEntityId(issue.tab, issue.entityId);
                          }
                          setIssuesOpen(false);
                        }}
                        className="w-full text-left p-2 rounded bg-[#292A28] hover:bg-[#353430] border border-[#665B48]/50 text-xs transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span
                            className={`font-semibold ${
                              issue.severity === 'error' ? 'text-[#B74541]' : 'text-[#C6A365]'
                            }`}
                          >
                            {issue.severity.toUpperCase()}
                          </span>
                          <span className="text-[#B2ADA0] font-mono">
                            {TAB_LABELS[issue.tab][locale]}
                          </span>
                        </div>
                        <p className="text-[#EEE3CA] leading-snug">{issue.message[locale]}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={undo}
          disabled={past.length === 0}
          aria-label={t(locale, 'undo')}
          title={`${t(locale, 'undo')} (Ctrl+Z)`}
          className="p-1 sm:p-1.5 rounded border border-[#665B48]/60 bg-[#17191B] text-[#EEE3CA] disabled:opacity-35 hover:border-[#C6A365] cursor-pointer disabled:cursor-not-allowed"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={future.length === 0}
          aria-label={t(locale, 'redo')}
          title={`${t(locale, 'redo')} (Ctrl+Y)`}
          className="p-1 sm:p-1.5 rounded border border-[#665B48]/60 bg-[#17191B] text-[#EEE3CA] disabled:opacity-35 hover:border-[#C6A365] cursor-pointer disabled:cursor-not-allowed"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          className="hidden"
          aria-label={t(locale, 'importJson')}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title={t(locale, 'importJson')}
          aria-label={t(locale, 'importJson')}
          className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs rounded border border-[#665B48]/70 bg-[#17191B] text-[#EEE3CA] hover:border-[#C6A365] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-[#C6A365]" />
          <span className="hidden 2xl:inline">{t(locale, 'importJson')}</span>
        </button>

        <button
          type="button"
          onClick={handleExport}
          title={t(locale, 'exportJson')}
          aria-label={t(locale, 'exportJson')}
          className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs rounded border border-[#665B48]/70 bg-[#17191B] text-[#EEE3CA] hover:border-[#C6A365] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#C6A365]" />
          <span className="hidden 2xl:inline">{t(locale, 'exportJson')}</span>
        </button>

        <button
          type="button"
          onClick={resetToDefault}
          title={t(locale, 'resetDefault')}
          aria-label={t(locale, 'resetDefault')}
          className="hidden sm:block p-1.5 rounded border border-[#665B48]/60 bg-[#17191B] text-[#B2ADA0] hover:text-[#EEE3CA] hover:border-[#C6A365] cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs font-semibold rounded bg-[#C6A365] text-[#17191B] hover:bg-[#d6b67c] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{dirty ? `${t(locale, 'save')}*` : t(locale, 'saved')}</span>
        </button>

        <div className="flex items-center bg-[#17191B] border border-[#665B48]/70 rounded overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setLocale('hu')}
            className={`px-1.5 sm:px-2 py-1 text-[11px] font-mono cursor-pointer ${
              locale === 'hu' ? 'bg-[#C6A365] text-[#17191B] font-semibold' : 'text-[#B2ADA0] hover:text-[#EEE3CA]'
            }`}
          >
            HU
          </button>
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`px-1.5 sm:px-2 py-1 text-[11px] font-mono cursor-pointer ${
              locale === 'en' ? 'bg-[#C6A365] text-[#17191B] font-semibold' : 'text-[#B2ADA0] hover:text-[#EEE3CA]'
            }`}
          >
            EN
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t(locale, 'close')}
          className="p-1 sm:p-1.5 rounded border border-[#665B48]/70 bg-[#17191B] text-[#EEE3CA] hover:border-[#B74541] hover:text-[#B74541] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        </div>
      </div>

      {/* Mobile / Tablet Row 2: Swipeable horizontal tabs */}
      <nav
        aria-label="Editor modules mobile"
        className="flex lg:hidden items-center gap-1 px-2.5 py-1.5 border-t border-[#665B48]/50 overflow-x-auto"
      >
        {ALL_TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'bg-[#C6A365] text-[#17191B]'
                  : 'text-[#B2ADA0] hover:text-[#EEE3CA] hover:bg-[#17191B]/60'
              }`}
            >
              {TAB_LABELS[tab][locale]}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
