import React from 'react';
import { Plus, Trash } from '@phosphor-icons/react';
import { useStore } from '../lib/store';
import { makeT } from '../lib/i18n';
import { chargeAmount } from '../lib/calc';
import { fmtRs, MANN_KG } from '../lib/format';
import { NumInput, Select } from './ui';

// Editable charge rows pre-filled from Settings → Charges (nothing hardcoded).
// appliesKey: 'purchase' | 'sale' | 'commissionSeller' | 'commissionBuyer'
export function defaultChargesFor(db, appliesKey, ctx) {
  return db.chargeTypes
    .filter((c) => c.isActive && c.appliesTo.includes(appliesKey))
    .map((c) => ({
      chargeTypeId: c.id, nameEn: c.nameEn, nameUr: c.nameUr,
      method: c.calcMethod, value: c.defaultValue, retained: c.retainedByShop,
      amount: chargeAmount(c.calcMethod, c.defaultValue, ctx),
    }));
}

export function recalcCharges(charges, ctx) {
  return charges.map((c) => ({ ...c, amount: chargeAmount(c.method, c.value, ctx) }));
}

export function ChargesEditor({ charges, onChange, ctx }) {
  const { db, lang } = useStore();
  const t = makeT(lang);

  const update = (i, patch) => {
    const next = charges.map((c, ix) => (ix === i ? { ...c, ...patch } : c));
    onChange(recalcCharges(next, ctx));
  };
  const remove = (i) => onChange(charges.filter((_, ix) => ix !== i));
  const add = () => onChange([...charges, { chargeTypeId: null, nameEn: '', nameUr: '', method: 'flat', value: 0, retained: true, amount: 0 }]);

  const total = charges.reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <div className="border border-zinc-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <span className="text-[13px] font-bold text-zinc-700">{t('charges')}</span>
        <span className="num text-sm font-bold text-rose-600">− {fmtRs(total)}</span>
      </div>
      <div className="divide-y divide-zinc-100">
        {charges.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_92px_88px_90px_32px] items-center gap-2 px-3 py-2">
            {c.chargeTypeId ? (
              <span className="text-sm font-medium text-zinc-700 truncate">
                {lang === 'ur' ? c.nameUr : c.nameEn}
                <span className="text-[10px] text-zinc-400 ms-1">{c.retained ? '' : `(${t('passThrough')})`}</span>
              </span>
            ) : (
              <input className="h-8 px-2 rounded-lg border border-zinc-200 text-sm w-full" placeholder={t('description')}
                value={lang === 'ur' ? c.nameUr : c.nameEn}
                onChange={(e) => update(i, lang === 'ur' ? { nameUr: e.target.value, nameEn: e.target.value } : { nameEn: e.target.value, nameUr: e.target.value })} />
            )}
            <Select className="!h-8 !text-xs" value={c.method} onChange={(e) => update(i, { method: e.target.value })}>
              <option value="pct">{t('pctOfGross')}</option>
              <option value="flat">{t('flat')}</option>
              <option value="perBag">{t('perBag')}</option>
              <option value="perMann">{t('perMann')}</option>
            </Select>
            <NumInput className="!h-8 !text-xs" value={c.value} onChange={(v) => update(i, { value: v })} />
            <span className="num text-xs font-bold text-zinc-700 text-end">{fmtRs(c.amount)}</span>
            <button type="button" onClick={() => remove(i)} className="p-1.5 rounded-lg text-zinc-300 hover:text-rose-500 hover:bg-rose-50 cursor-pointer" aria-label="remove charge">
              <Trash size={14} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add}
        className="w-full flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50/60 cursor-pointer border-t border-zinc-100">
        <Plus size={13} weight="bold" /> {t('addCharge')}
      </button>
    </div>
  );
}
