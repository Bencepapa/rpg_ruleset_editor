import React, { useMemo } from 'react';
import { Copy, Plus, Search, Trash2 } from 'lucide-react';
import { EditorTabId } from '../../types/ruleset.types';
import { t } from '../i18n';
import { useRulesetEditorStore } from '../store/useRulesetEditorStore';

interface SidebarItem {
  id: string;
  label: string;
  sublabel?: string;
  group: string;
}

export const EntitySidebar: React.FC<{ tab: EditorTabId }> = ({ tab }) => {
  const {
    bundle,
    locale,
    selectedEntityId,
    searchQuery,
    validationIssues,
    setSelectedEntityId,
    setSearchQuery,
    addEntity,
    duplicateEntity,
    deleteEntity,
  } = useRulesetEditorStore();

  const items: SidebarItem[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matches = (id: string, name: Record<string, string>) =>
      !q ||
      id.toLowerCase().includes(q) ||
      Object.values(name).some((val) => val.toLowerCase().includes(q));

    if (tab === 'stats') {
      return bundle.checkRules
        .filter((r) => matches(r.id, r.name))
        .map((r) => ({
          id: r.id,
          label: r.name[locale] || r.name.en,
          sublabel: `DC ${r.defaultDc}`,
          group: locale === 'hu' ? 'Próba szabályok' : 'Check Rules',
        }));
    }
    if (tab === 'classes') {
      return bundle.classes
        .filter((c) => matches(c.id, c.name))
        .map((c) => ({
          id: c.id,
          label: c.name[locale] || c.name.en,
          sublabel: c.hitDie,
          group: locale === 'hu' ? 'Kasztok' : 'Classes',
        }));
    }
    if (tab === 'races') {
      return bundle.races
        .filter((r) => matches(r.id, r.name))
        .map((r) => ({
          id: r.id,
          label: r.name[locale] || r.name.en,
          sublabel: r.playable ? 'Playable' : 'NPC',
          group: r.playable
            ? locale === 'hu' ? 'Játszható fajok' : 'Playable Races'
            : locale === 'hu' ? 'Szörny / NPC fajok' : 'Monster / NPC Races',
        }));
    }
    if (tab === 'spells') {
      return bundle.spells
        .filter((s) => matches(s.id, s.name))
        .map((s) => ({
          id: s.id,
          label: s.name[locale] || s.name.en,
          sublabel: `T${s.tier}`,
          group: `${s.school === 'mage' ? 'Mage' : 'Cleric'} · Tier ${s.tier}`,
        }));
    }
    if (tab === 'items') {
      return bundle.items
        .filter((i) => matches(i.id, i.name))
        .map((i) => ({
          id: i.id,
          label: i.name[locale] || i.name.en,
          sublabel: `${i.goldValue} gp`,
          group: i.category.toUpperCase(),
        }));
    }
    if (tab === 'monsters') {
      return bundle.monsters
        .filter((m) => matches(m.id, m.name))
        .map((m) => ({
          id: m.id,
          label: m.name[locale] || m.name.en,
          sublabel: `HD ${m.levelOrHd}`,
          group: m.isUndead ? 'Undead' : 'Living',
        }));
    }
    if (tab === 'party') {
      return bundle.partyPresets
        .filter((p) => matches(p.id, p.name))
        .map((p) => ({
          id: p.id,
          label: p.name[locale] || p.name.en,
          sublabel: `${p.members.length}`,
          group: locale === 'hu' ? 'Előre összeállított csapatok' : 'Party Presets',
        }));
    }
    return [];
  }, [bundle, tab, locale, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, SidebarItem[]>();
    for (const item of items) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [items]);

  const activeId = selectedEntityId[tab];
  const issueEntityIds = new Set(
    validationIssues.filter((v) => v.tab === tab && v.entityId).map((v) => v.entityId!)
  );

  if (tab === 'test' || tab === 'translations') return null;

  return (
    <>
      {/* Mobile compact entity picker + CRUD bar */}
      <div className="md:hidden bg-[#1D1F21] border-b border-[#665B48] px-3 py-2 flex items-center gap-1.5 shrink-0">
        <select
          aria-label={locale === 'hu' ? 'Aktív elem kiválasztása' : 'Select entity'}
          value={activeId}
          onChange={(e) => setSelectedEntityId(tab, e.target.value)}
          className="flex-1 min-w-0 h-9 px-2 bg-[#17191B] border border-[#665B48]/70 focus:border-[#C6A365] rounded text-xs text-[#EEE3CA] outline-none"
        >
          {grouped.map(([groupName, groupItems]) => (
            <optgroup key={groupName} label={groupName}>
              {groupItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} {item.sublabel ? `(${item.sublabel})` : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          onClick={() => addEntity(tab)}
          aria-label={t(locale, 'addNew')}
          title={t(locale, 'addNew')}
          className="h-9 px-2.5 rounded bg-[#C6A365] text-[#17191B] text-xs font-semibold shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={!activeId}
          onClick={() => activeId && duplicateEntity(tab, activeId)}
          aria-label={t(locale, 'duplicate')}
          title={t(locale, 'duplicate')}
          className="h-9 px-2.5 rounded border border-[#665B48]/70 bg-[#292A28] text-[#EEE3CA] disabled:opacity-40 shrink-0 cursor-pointer"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={!activeId}
          onClick={() => activeId && deleteEntity(tab, activeId)}
          aria-label={t(locale, 'delete')}
          title={t(locale, 'delete')}
          className="h-9 px-2.5 rounded border border-[#665B48]/70 bg-[#292A28] text-[#B74541] disabled:opacity-40 shrink-0 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop 260px Entity Sidebar */}
      <aside className="hidden md:flex w-[260px] shrink-0 bg-[#1D1F21] border-r border-[#665B48] flex-col min-h-0">
        <div className="p-2.5 border-b border-[#665B48]/60 flex flex-col gap-2">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#B2ADA0] absolute left-2.5 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(locale, 'searchPlaceholder')}
              aria-label={t(locale, 'searchPlaceholder')}
              className="w-full h-8 pl-8 pr-2 bg-[#17191B] border border-[#665B48]/70 focus:border-[#C6A365] rounded text-xs text-[#EEE3CA] placeholder:text-[#B2ADA0]/60 outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => addEntity(tab)}
              className="flex-1 flex items-center justify-center gap-1 h-7 px-2 rounded bg-[#C6A365] text-[#17191B] text-xs font-semibold hover:bg-[#d6b67c] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t(locale, 'addNew')}</span>
            </button>
            <button
              type="button"
              disabled={!activeId}
              onClick={() => activeId && duplicateEntity(tab, activeId)}
              aria-label={t(locale, 'duplicate')}
              title={t(locale, 'duplicate')}
              className="h-7 px-2 rounded border border-[#665B48]/70 bg-[#292A28] text-[#EEE3CA] hover:border-[#C6A365] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={!activeId}
              onClick={() => activeId && deleteEntity(tab, activeId)}
              aria-label={t(locale, 'delete')}
              title={t(locale, 'delete')}
              className="h-7 px-2 rounded border border-[#665B48]/70 bg-[#292A28] text-[#B74541] hover:border-[#B74541] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-3">
          {grouped.length === 0 ? (
            <p className="text-xs text-[#B2ADA0] px-2 py-4 text-center">
              {locale === 'hu' ? 'Nincs találat.' : 'No matching entities.'}
            </p>
          ) : (
            grouped.map(([groupName, groupItems]) => (
              <div key={groupName}>
                <div className="px-2 py-1 text-[11px] font-semibold text-[#B2ADA0] tracking-wide">
                  {groupName} · {groupItems.length}
                </div>
                <ul className="flex flex-col gap-0.5">
                  {groupItems.map((item) => {
                    const selected = item.id === activeId;
                    const hasIssue = issueEntityIds.has(item.id);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedEntityId(tab, item.id)}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-left text-xs transition-colors cursor-pointer ${
                            selected
                              ? 'bg-[#292A28] text-[#C6A365] border border-[#C6A365]/60 font-medium'
                              : 'text-[#EEE3CA] hover:bg-[#292A28]/60 border border-transparent'
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          <span className="flex items-center gap-1.5 shrink-0 font-mono tabular-nums text-[11px] text-[#B2ADA0]">
                            {hasIssue && (
                              <span className="text-[#B74541] font-bold" title="Validation issue">
                                !
                              </span>
                            )}
                            {item.sublabel}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
};
