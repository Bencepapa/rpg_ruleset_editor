import React, { useMemo, useState } from 'react';
import { Globe, Plus, Search } from 'lucide-react';
import { t } from '../i18n';
import { useRulesetEditorStore } from '../store/useRulesetEditorStore';
import {
  TranslationCategory,
  extractTranslationEntries,
  getLocaleCoverage,
  getSupportedLocales,
  updateTranslationByKey,
} from '../translationsExtractor';
import { SectionHeader, SelectField, ToggleCheckbox } from '../components/FormControls';

const CATEGORY_LABELS: Record<TranslationCategory, { en: string; hu: string }> = {
  general: { en: 'General', hu: 'Általános' },
  stats: { en: 'Rules & Checks', hu: 'Szabályok' },
  classes: { en: 'Classes', hu: 'Kasztok' },
  races: { en: 'Races', hu: 'Fajok' },
  spells: { en: 'Spells', hu: 'Varázslatok' },
  items: { en: 'Items', hu: 'Tárgyak' },
  monsters: { en: 'Monsters', hu: 'Szörnyek' },
  party: { en: 'Party Presets', hu: 'Csapatok' },
};

export const TranslationsPanel: React.FC = () => {
  const { bundle, locale, updateBundle, addSupportedLocale } = useRulesetEditorStore();
  const locales = useMemo(() => getSupportedLocales(bundle), [bundle]);
  const allEntries = useMemo(() => extractTranslationEntries(bundle), [bundle]);

  const [sourceLang, setSourceLang] = useState<string>('en');
  const [targetLang, setTargetLang] = useState<string>('hu');
  const [newLangInput, setNewLangInput] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [missingOnly, setMissingOnly] = useState<boolean>(false);

  const effectiveTarget = locales.includes(targetLang) ? targetLang : locales[1] ?? 'hu';
  const effectiveSource = locales.includes(sourceLang) ? sourceLang : 'en';

  const targetCoverage = useMemo(
    () => getLocaleCoverage(allEntries, effectiveTarget),
    [allEntries, effectiveTarget]
  );

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEntries.filter((entry) => {
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;
      const targetText = entry.value[effectiveTarget] ?? '';
      if (missingOnly && targetText.trim().length > 0) return false;
      if (!q) return true;
      const sourceText = entry.value[effectiveSource] ?? '';
      return (
        entry.key.toLowerCase().includes(q) ||
        entry.entityLabel.toLowerCase().includes(q) ||
        sourceText.toLowerCase().includes(q) ||
        targetText.toLowerCase().includes(q)
      );
    });
  }, [allEntries, categoryFilter, effectiveSource, effectiveTarget, missingOnly, search]);

  const handleAddLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newLangInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (cleaned.length < 2 || cleaned.length > 8) return;
    addSupportedLocale(cleaned);
    setTargetLang(cleaned);
    setNewLangInput('');
  };

  return (
    <div className="p-3 md:p-6 max-w-6xl flex flex-col gap-4 md:gap-5">
      {/* Header & Language Controls */}
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-4">
        <SectionHeader
          title={t(locale, 'translationsTitle')}
          subtitle={`${allEntries.length} ${locale === 'hu' ? 'bejegyzés' : 'entries'} · ${locales.length} ${locale === 'hu' ? 'nyelv' : 'languages'}`}
        />

        {/* Language Coverage Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {locales.map((code) => {
            const cov = getLocaleCoverage(allEntries, code);
            const active = code === effectiveTarget;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setTargetLang(code)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono tabular-nums cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#C6A365] text-[#17191B] border-[#C6A365] font-semibold'
                    : 'bg-[#17191B] text-[#EEE3CA] border-[#665B48]/70 hover:border-[#C6A365]'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>{code.toUpperCase()}</span>
                <span className={active ? 'text-[#17191B]/80' : 'text-[#B2ADA0]'}>
                  {cov.percent}%
                </span>
              </button>
            );
          })}

          <form onSubmit={handleAddLanguage} className="inline-flex items-center gap-1 ml-auto">
            <input
              type="text"
              value={newLangInput}
              onChange={(e) => setNewLangInput(e.target.value)}
              placeholder={t(locale, 'addLangPlaceholder')}
              aria-label={t(locale, 'addLangBtn')}
              maxLength={8}
              className="w-28 h-7 px-2 bg-[#17191B] border border-[#665B48]/70 focus:border-[#C6A365] rounded text-xs font-mono text-[#EEE3CA] outline-none"
            />
            <button
              type="submit"
              className="h-7 px-2.5 rounded bg-[#17191B] border border-[#665B48] text-xs text-[#C6A365] hover:border-[#C6A365] inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t(locale, 'addLangBtn')}</span>
            </button>
          </form>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <SelectField
            label={t(locale, 'sourceLang')}
            value={effectiveSource}
            options={locales.map((l) => ({ value: l, label: l.toUpperCase() }))}
            onChange={setSourceLang}
          />
          <SelectField
            label={t(locale, 'targetLang')}
            value={effectiveTarget}
            options={locales.map((l) => ({ value: l, label: l.toUpperCase() }))}
            onChange={setTargetLang}
          />
          <SelectField
            label={locale === 'hu' ? 'Modul' : 'Module'}
            value={categoryFilter}
            options={[
              { value: 'all', label: t(locale, 'allCategories') },
              ...(Object.keys(CATEGORY_LABELS) as TranslationCategory[]).map((cat) => ({
                value: cat,
                label: CATEGORY_LABELS[cat][locale],
              })),
            ]}
            onChange={setCategoryFilter}
          />
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[#B2ADA0]">{locale === 'hu' ? 'Szűrés' : 'Search'}</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#B2ADA0] absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(locale, 'filterStringsPlaceholder')}
                className="w-full h-8 pl-8 pr-2.5 bg-[#17191B] border border-[#665B48]/70 focus:border-[#C6A365] rounded text-xs text-[#EEE3CA] outline-none"
              />
            </div>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#665B48]/40 text-xs">
          <div className="flex items-center gap-3 font-mono tabular-nums text-[#B2ADA0]">
            <span>
              {effectiveTarget.toUpperCase()}: {targetCoverage.translated}/{targetCoverage.total} ({targetCoverage.percent}%)
            </span>
            {targetCoverage.missing > 0 && (
              <span className="text-[#C6A365]">
                {targetCoverage.missing} {locale === 'hu' ? 'hiányzik' : 'missing'}
              </span>
            )}
          </div>
          <ToggleCheckbox
            label={t(locale, 'missingOnly')}
            checked={missingOnly}
            onChange={setMissingOnly}
          />
        </div>
      </section>

      {/* Translation Rows */}
      <section className="bg-[#292A28] border border-[#665B48]/70 rounded p-3.5 md:p-5 flex flex-col gap-2">
        <div className="hidden md:grid md:grid-cols-[220px_1fr_1fr] gap-3 pb-2 border-b border-[#665B48]/60 text-[11px] font-semibold uppercase tracking-wider text-[#B2ADA0]">
          <span>{locale === 'hu' ? 'Kulcs / Kontextus' : 'Key / Context'}</span>
          <span>{effectiveSource.toUpperCase()}</span>
          <span>{effectiveTarget.toUpperCase()}</span>
        </div>

        {filteredEntries.length === 0 ? (
          <p className="text-xs text-[#B2ADA0] py-6 text-center">
            {locale === 'hu' ? 'Nincs a szűrésnek megfelelő kifejezés.' : 'No matching translation strings.'}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-[#665B48]/35">
            {filteredEntries.map((entry) => {
              const sourceVal = entry.value[effectiveSource] ?? '';
              const targetVal = entry.value[effectiveTarget] ?? '';
              const isMissing = targetVal.trim().length === 0;

              return (
                <div
                  key={entry.key}
                  className="py-2.5 grid grid-cols-1 md:grid-cols-[220px_1fr_1fr] gap-2 md:gap-3 items-start"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#17191B] border border-[#665B48]/60 text-[#C6A365]">
                        {CATEGORY_LABELS[entry.category][locale]}
                      </span>
                      <span className="text-xs font-medium text-[#EEE3CA]">{entry.fieldLabel}</span>
                    </div>
                    <div className="text-[11px] font-mono text-[#B2ADA0] truncate mt-0.5" title={entry.key}>
                      {entry.key}
                    </div>
                  </div>

                  <div className="text-xs text-[#B2ADA0] bg-[#17191B]/60 border border-[#665B48]/30 rounded px-2.5 py-1.5 min-h-8 break-words">
                    {sourceVal || <span className="italic opacity-50">—</span>}
                  </div>

                  <div>
                    {entry.multiline ? (
                      <textarea
                        rows={2}
                        aria-label={`${entry.key} (${effectiveTarget})`}
                        value={targetVal}
                        placeholder={sourceVal}
                        onChange={(e) => {
                          const next = e.target.value;
                          updateBundle((draft) => {
                            updateTranslationByKey(draft, entry.key, effectiveTarget, next);
                          });
                        }}
                        className={`w-full p-2 bg-[#17191B] border rounded text-xs text-[#EEE3CA] outline-none resize-y focus:border-[#C6A365] ${
                          isMissing ? 'border-[#C6A365]/60' : 'border-[#665B48]/70'
                        }`}
                      />
                    ) : (
                      <input
                        type="text"
                        aria-label={`${entry.key} (${effectiveTarget})`}
                        value={targetVal}
                        placeholder={sourceVal}
                        onChange={(e) => {
                          const next = e.target.value;
                          updateBundle((draft) => {
                            updateTranslationByKey(draft, entry.key, effectiveTarget, next);
                          });
                        }}
                        className={`w-full h-8 px-2.5 bg-[#17191B] border rounded text-xs text-[#EEE3CA] outline-none focus:border-[#C6A365] ${
                          isMissing ? 'border-[#C6A365]/60' : 'border-[#665B48]/70'
                        }`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
