import React, { useState } from 'react';
import { MANN_KG, fmtWeight } from '../lib/format';
import { useStore } from '../lib/store';
import { makeT } from '../lib/i18n';

// Input with a separate unit chip — the unit never overlaps the typed number.
function UnitNum({ value, onChange, unit, max }) {
  return (
    <div className="flex items-stretch h-11 rounded-xl border border-zinc-300 bg-white overflow-hidden focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/15 transition-shadow">
      <input
        type="number" inputMode="decimal" min="0" max={max} placeholder="0"
        className="num flex-1 min-w-0 px-3 text-end text-[15px] font-semibold text-zinc-900 outline-none bg-transparent"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        onWheel={(e) => e.target.blur()}
      />
      <span className="flex items-center px-3 bg-zinc-50 border-s border-zinc-200 text-xs font-bold text-zinc-500 whitespace-nowrap select-none">
        {unit}
      </span>
    </div>
  );
}

// Operator can type kg directly OR mann + kg. Live converted display both ways.
export function WeightInput({ valueKg, onChange }) {
  const { lang } = useStore();
  const t = makeT(lang);
  const [mode, setMode] = useState('mann'); // 'mann' | 'kg'
  const mann = Math.floor((valueKg || 0) / MANN_KG);
  const remKg = Math.round(((valueKg || 0) - mann * MANN_KG) * 100) / 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-semibold text-zinc-700">{t('weight')} <span className="text-rose-500">*</span></label>
        <div className="flex rounded-lg overflow-hidden border border-zinc-200 text-[11px] font-semibold">
          {['mann', 'kg'].map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`px-2.5 py-1 cursor-pointer ${mode === m ? 'bg-brand-800 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-50'}`}>
              {m === 'mann' ? `${t('mann')} + ${t('kg')}` : t('kg')}
            </button>
          ))}
        </div>
      </div>
      {mode === 'mann' ? (
        <div className="grid grid-cols-2 gap-2">
          <UnitNum unit={t('mann')} value={mann || ''} onChange={(v) => onChange((Number(v) || 0) * MANN_KG + remKg)} />
          <UnitNum unit={t('kg')} max={MANN_KG - 0.01} value={remKg || ''} onChange={(v) => onChange(mann * MANN_KG + (Number(v) || 0))} />
        </div>
      ) : (
        <UnitNum unit={t('kg')} value={valueKg || ''} onChange={(v) => onChange(Number(v) || 0)} />
      )}
      <p className="text-[13px] text-brand-700 font-bold num">
        = {fmtWeight(valueKg || 0, t)} · {(valueKg || 0).toLocaleString()} kg
      </p>
    </div>
  );
}
