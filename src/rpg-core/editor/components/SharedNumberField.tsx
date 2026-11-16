import React, { useEffect, useRef, useState } from 'react';

export interface SharedNumberFieldProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  fineStep?: number;
  defaultValue?: number;
  unit?: string;
  compact?: boolean;
  ariaLabel?: string;
}

export const SharedNumberField: React.FC<SharedNumberFieldProps> = ({
  label,
  value,
  onChange,
  min = -9999999,
  max = 9999999,
  step = 1,
  fineStep = 0.1,
  defaultValue,
  unit,
  compact = false,
  ariaLabel,
}) => {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(String(value));
  const dragStateRef = useRef<{ startX: number; startValue: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (!editing) {
      setDraftText(String(value));
    }
  }, [value, editing]);

  const clampAndRound = (raw: number, activeStep: number): number => {
    const clamped = Math.max(min, Math.min(max, raw));
    const precision = activeStep < 1 ? 2 : 0;
    return Number(clamped.toFixed(precision));
  };

  const commitDraft = () => {
    const parsed = parseFloat(draftText);
    if (!Number.isNaN(parsed)) {
      onChange(clampAndRound(parsed, step));
    } else {
      setDraftText(String(value));
    }
    setEditing(false);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editing || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      startX: e.clientX,
      startValue: value,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 3) {
      drag.moved = true;
    }
    if (!drag.moved) return;
    const activeStep = e.shiftKey ? fineStep : step;
    const deltaSteps = Math.round(dx / 6);
    onChange(clampAndRound(drag.startValue + deltaSteps * activeStep, activeStep));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    dragStateRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (drag && !drag.moved) {
      setDraftText(String(value));
      setEditing(true);
    }
  };

  const handleLabelDoubleClick = () => {
    if (defaultValue !== undefined) {
      onChange(clampAndRound(defaultValue, step));
    }
  };

  return (
    <div className={compact ? 'flex items-center gap-1.5' : 'flex flex-col gap-1'}>
      {label && (
        <span
          onDoubleClick={handleLabelDoubleClick}
          title={defaultValue !== undefined ? 'Double-click to reset' : undefined}
          className="text-xs text-[#B2ADA0] select-none cursor-default truncate"
        >
          {label}
        </span>
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative flex items-center justify-between bg-[#17191B] border border-[#665B48]/70 hover:border-[#C6A365] rounded px-2 ${
          compact ? 'h-7 min-w-[68px]' : 'h-8'
        } cursor-ew-resize select-none transition-colors`}
      >
        {editing ? (
          <input
            type="number"
            autoFocus
            aria-label={ariaLabel ?? label ?? 'Numeric value'}
            value={draftText}
            min={min}
            max={max}
            step={step}
            onChange={(e) => setDraftText(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDraft();
              if (e.key === 'Escape') {
                setDraftText(String(value));
                setEditing(false);
              }
            }}
            className="w-full bg-transparent text-[#EEE3CA] font-mono tabular-nums text-xs outline-none"
          />
        ) : (
          <button
            type="button"
            aria-label={ariaLabel ?? label ?? 'Edit numeric value'}
            onClick={() => {
              setDraftText(String(value));
              setEditing(true);
            }}
            className="w-full text-left font-mono tabular-nums text-xs text-[#EEE3CA] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C6A365]"
          >
            {value}
          </button>
        )}
        {unit && !editing && (
          <span className="text-[11px] font-mono text-[#B2ADA0] ml-1 shrink-0">{unit}</span>
        )}
      </div>
    </div>
  );
};
