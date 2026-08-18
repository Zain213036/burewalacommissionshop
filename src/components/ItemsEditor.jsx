import React from 'react';
import { Plus, Trash, ArrowRight } from '@phosphor-icons/react';
import { useStore } from '../lib/store';
import { makeT } from '../lib/i18n';
import { grossFromWeight } from '../lib/calc';
import { fmtRs, fmtWeight, uid, MANN_KG } from '../lib/format';
import { Select } from './ui';
import { ProductPicker } from './ProductPicker';

export function emptyItem() {
  return { id: uid(), productId: '', bags: '', bhartiKg: '', looseKg: '', weightKg: 0, rate: '', rateUnit: 'mann', kaatKg: '' };
}

export function itemNetKg(it) {
  return Math.max(0, (it.weightKg || 0) - (Number(it.kaatKg) || 0));
}
export function itemGross(it) {
  return grossFromWeight(itemNetKg(it), it.rate, it.rateUnit);
}
export function itemsTotals(items) {
  return items.reduce((a, it) => ({
    bags: a.bags + (Number(it.bags) || 0),
    weightKg: a.weightKg + (it.weightKg || 0),
    netKg: a.netKg + itemNetKg(it),
    gross: a.gross + itemGross(it),
  }), { bags: 0, weightKg: 0, netKg: 0, gross: 0 });
}

/** Calculate total weight from mandi-style input: bags × bharti + loose */
function calcWeightKg(bags, bhartiKg, looseKg) {
  return (Number(bags) || 0) * (Number(bhartiKg) || 0) + (Number(looseKg) || 0);
}

function SmallNum({ value, onChange, unit, placeholder = '0', className = '', readOnly = false, highlight = false, ...props }) {
  return (
    <div className={`flex items-stretch h-10 rounded-xl border overflow-hidden focus-within:ring-2
      ${highlight ? 'border-brand-400 bg-brand-50 focus-within:border-brand-600 focus-within:ring-brand-600/15' : 'border-zinc-300 bg-white focus-within:border-brand-600 focus-within:ring-brand-600/15'}
      ${readOnly ? 'opacity-75 cursor-not-allowed' : ''} ${className}`}>
      <input
        type="number" inputMode="decimal" min="0" placeholder={placeholder}
        className={`num flex-1 min-w-0 px-2 text-end text-sm font-semibold outline-none bg-transparent ${readOnly ? 'cursor-not-allowed text-zinc-500' : ''}`}
        value={value ?? ''}
        readOnly={readOnly}
        onChange={(e) => !readOnly && onChange(e.target.value === '' ? '' : Number(e.target.value))}
        onWheel={(e) => e.target.blur()} {...props} />
      {unit && <span className="flex items-center px-2 bg-zinc-50 border-s border-zinc-200 text-[11px] font-bold text-zinc-500 whitespace-nowrap select-none">{unit}</span>}
    </div>
  );
}

// Multi-item lines for purchase / sale / commission — each line: product, bags, bharti, loose kg → auto total
export function ItemsEditor({ items, onChange }) {
  const { db, lang } = useStore();
  const t = makeT(lang);

  const update = (id, patch) => onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id) => onChange(items.length > 1 ? items.filter((it) => it.id !== id) : items);
  const add = () => onChange([...items, emptyItem()]);
  const totals = itemsTotals(items);

  const handleProductChange = (itemId, productId) => {
    const product = db.products.find((p) => p.id === productId);
    const newBharti = product?.defaultBhartiKg || '';
    const item = items.find((it) => it.id === itemId);
    const newWeightKg = calcWeightKg(item?.bags, newBharti, item?.looseKg);
    update(itemId, {
      productId,
      bhartiKg: newBharti,
      rateUnit: product?.defaultRateUnit || 'mann',
      weightKg: newWeightKg,
    });
  };

  const handleWeightField = (itemId, field, value) => {
    const item = items.find((it) => it.id === itemId);
    const updated = { ...item, [field]: value };
    const newWeightKg = calcWeightKg(
      field === 'bags' ? value : item?.bags,
      field === 'bhartiKg' ? value : item?.bhartiKg,
      field === 'looseKg' ? value : item?.looseKg,
    );
    update(itemId, { [field]: value, weightKg: newWeightKg });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Column headers */}
      <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto_1fr_1fr_1fr] gap-2 px-3.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
        <span>{t('product')}</span>
        <span className="text-center">{t('bags')}</span>
        <span className="text-center">{t('bharti')}</span>
        <span className="text-center">{t('looseKg')}</span>
        <span className="w-4" />
        <span className="text-center">{t('totalKgCalc')}</span>
        <span className="text-center">{t('rate')}</span>
        <span className="text-center">{t('kaat')} kg</span>
      </div>

      {items.map((it, idx) => {
        const totalKg = it.weightKg || 0;
        const { mann, kg: remKg } = { mann: Math.floor(totalKg / MANN_KG), kg: Math.round((totalKg - Math.floor(totalKg / MANN_KG) * MANN_KG) * 100) / 100 };
        const mannDisplay = totalKg > 0 ? `${mann > 0 ? mann + ' ' + t('mann') : ''}${remKg > 0 ? (mann > 0 ? ' ' : '') + remKg + ' kg' : ''}` : '—';

        return (
          <div key={it.id} className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            {/* Item header */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-zinc-50 border-b border-zinc-200">
              <span className="w-6 h-6 rounded-full bg-brand-800 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <ProductPicker value={it.productId} onChange={(v) => handleProductChange(it.id, v)} />
              </div>
              {items.length > 1 && (
                <button type="button" onClick={() => remove(it.id)} title={t('delete')}
                  className="shrink-0 w-8 h-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center cursor-pointer">
                  <Trash size={14} weight="bold" />
                </button>
              )}
            </div>

            {/* Weight entry row — THE KEY CHANGE: Bags × Bharti + Loose = Total */}
            <div className="px-3.5 py-3">
              {/* Mobile: stacked labels */}
              <div className="sm:hidden grid grid-cols-2 gap-2 mb-2">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{t('bags')}</p>
                  <SmallNum unit={t('bags')} value={it.bags} onChange={(v) => handleWeightField(it.id, 'bags', v)} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{t('bharti')}</p>
                  <SmallNum unit="kg" value={it.bhartiKg} onChange={(v) => handleWeightField(it.id, 'bhartiKg', v)} placeholder={t('bharti')} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{t('looseKg')}</p>
                  <SmallNum unit="kg" value={it.looseKg} onChange={(v) => handleWeightField(it.id, 'looseKg', v)} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-brand-600 uppercase mb-1">{t('totalKgCalc')}</p>
                  <div className="h-10 flex items-center justify-end px-3 rounded-xl bg-brand-50 border border-brand-200 font-extrabold text-brand-800 num text-sm">
                    {totalKg > 0 ? `${totalKg} kg` : '—'}
                  </div>
                </div>
              </div>

              {/* Desktop: inline formula row */}
              <div className="hidden sm:flex items-center gap-2">
                {/* Bags */}
                <SmallNum className="w-24" unit={t('bags')} value={it.bags}
                  onChange={(v) => handleWeightField(it.id, 'bags', v)} />

                {/* × symbol */}
                <span className="text-zinc-400 font-bold text-base shrink-0">×</span>

                {/* Bharti */}
                <SmallNum className="w-28" unit="kg/bag" value={it.bhartiKg}
                  onChange={(v) => handleWeightField(it.id, 'bhartiKg', v)}
                  placeholder={t('bharti')} />

                {/* + symbol */}
                <span className="text-zinc-400 font-bold text-base shrink-0">+</span>

                {/* Loose KG */}
                <SmallNum className="w-24" unit="loose kg" value={it.looseKg}
                  onChange={(v) => handleWeightField(it.id, 'looseKg', v)} />

                {/* = arrow */}
                <ArrowRight size={16} className="text-zinc-300 shrink-0" />

                {/* Total KG — auto-calculated, read-only display */}
                <div className="flex-1 h-10 flex items-center justify-between px-3 rounded-xl bg-brand-50 border border-brand-200 min-w-[130px]">
                  <span className="text-[11px] font-bold text-brand-500 uppercase">{t('totalKgCalc')}</span>
                  <span className="num font-extrabold text-brand-800 text-sm">
                    {totalKg > 0 ? `${totalKg} kg` : '—'}
                  </span>
                </div>
              </div>

              {/* Mann display badge (always visible) */}
              {totalKg > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 font-semibold">{t('totalMannCalc')}:</span>
                  <span className="num font-extrabold text-brand-700 text-sm bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200">
                    {mannDisplay}
                  </span>
                  {it.bags && it.bhartiKg && (
                    <span className="text-[11px] text-zinc-400">
                      ({it.bags} × {it.bhartiKg}{Number(it.looseKg) > 0 ? ` + ${it.looseKg}` : ''} = {totalKg} kg ÷ 40)
                    </span>
                  )}
                </div>
              )}

              {/* Rate + kaat row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{t('rate')}</p>
                  <SmallNum unit="Rs." step="0.01" value={it.rate} onChange={(v) => update(it.id, { rate: v })} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{t('perMann')}</p>
                  <Select className="!h-10 !text-xs" value={it.rateUnit} onChange={(e) => update(it.id, { rateUnit: e.target.value })}>
                    <option value="mann">{t('perMann')}</option>
                    <option value="kg">{t('perKg')}</option>
                    <option value="100kg">{t('per100Kg')}</option>
                  </Select>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{t('kaat')} kg</p>
                  <SmallNum unit="kg" value={it.kaatKg} onChange={(v) => update(it.id, { kaatKg: v })} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{t('grossAmount')}</p>
                  <div className="h-10 flex items-center justify-end px-3 rounded-xl bg-zinc-50 border border-zinc-200 font-extrabold text-zinc-800 num text-sm">
                    {fmtRs(itemGross(it))}
                  </div>
                </div>
              </div>

              {/* Net weight line */}
              {itemNetKg(it) > 0 && (
                <div className="mt-2 text-xs text-zinc-500">
                  {t('netPayable').split(' ')[0]} {t('weight')}: <span className="num font-bold text-zinc-800">{fmtWeight(itemNetKg(it), t)}</span>
                  {Number(it.kaatKg) > 0 && <span className="text-rose-500"> (−{it.kaatKg} kg {t('kaat')})</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <button type="button" onClick={add}
          className="flex items-center gap-1.5 px-3.5 h-10 rounded-xl border-2 border-dashed border-brand-300 text-brand-700 text-sm font-bold hover:bg-brand-50 cursor-pointer transition-colors">
          <Plus size={16} weight="bold" /> {t('addItem')}
        </button>
        <span className="text-sm text-zinc-500">
          {t('total')}: <b className="num text-zinc-800">{fmtWeight(totals.netKg, t)}</b> ·{' '}
          <b className="num text-brand-800">{fmtRs(totals.gross)}</b>
        </span>
      </div>
    </div>
  );
}
