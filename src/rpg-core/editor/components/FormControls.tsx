import React from 'react';
import { LocalizedText } from '../../types/ruleset.types';

export const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="pb-2 mb-4 border-b border-[#665B48]/50 flex items-baseline justify-between gap-4">
    <h2 className="font-display text-base font-bold text-[#C6A365] tracking-wide">{title}</h2>
    {subtitle && <span className="text-xs text-[#B2ADA0] font-mono">{subtitle}</span>}
  </div>
);

export const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  mono?: boolean;
  placeholder?: string;
}> = ({ label, value, onChange, mono = false, placeholder }) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs text-[#B2ADA0]">{label}</span>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 px-2.5 bg-[#17191B] border border-[#665B48]/70 focus:border-[#C6A365] rounded text-xs text-[#EEE3CA] outline-none ${
        mono ? 'font-mono' : ''
      }`}
    />
  </label>
);

export const LocalizedField: React.FC<{
  label: string;
  locale: string;
  value: LocalizedText;
  onChange: (next: LocalizedText) => void;
  multiline?: boolean;
}> = ({ label, locale, value, onChange, multiline = false }) => {
  const current = value[locale] ?? '';
  const fallbackPlaceholder = locale !== 'en' && value.en ? value.en : undefined;

  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs text-[#B2ADA0]">
        <span>{label}</span>
        <span className="text-[10px] font-mono uppercase px-1 py-px rounded bg-[#17191B] border border-[#665B48]/60 text-[#C6A365]">
          {locale}
        </span>
      </span>
      {multiline ? (
        <textarea
          rows={2}
          value={current}
          placeholder={fallbackPlaceholder}
          onChange={(e) => onChange({ ...value, [locale]: e.target.value })}
          className="p-2 bg-[#17191B] border border-[#665B48]/70 focus:border-[#C6A365] rounded text-xs text-[#EEE3CA] outline-none resize-y"
        />
      ) : (
        <input
          type="text"
          value={current}
          placeholder={fallbackPlaceholder}
          onChange={(e) => onChange({ ...value, [locale]: e.target.value })}
          className="h-8 px-2.5 bg-[#17191B] border border-[#665B48]/70 focus:border-[#C6A365] rounded text-xs text-[#EEE3CA] outline-none"
        />
      )}
    </label>
  );
};

export const SelectField: React.FC<{
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (val: string) => void;
}> = ({ label, value, options, onChange }) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs text-[#B2ADA0]">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 px-2 bg-[#17191B] border border-[#665B48]/70 focus:border-[#C6A365] rounded text-xs text-[#EEE3CA] outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#17191B] text-[#EEE3CA]">
          {opt.label}
        </option>
      ))}
    </select>
  </label>
);

export const ToggleCheckbox: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="inline-flex items-center gap-2 text-xs text-[#EEE3CA] cursor-pointer select-none">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 accent-[#C6A365] cursor-pointer"
    />
    <span>{label}</span>
  </label>
);
