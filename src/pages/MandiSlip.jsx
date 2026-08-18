import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Tag, Plus, Trash, ArrowRight, CheckCircle,
  ReceiptX, Printer, WhatsappLogo
} from '@phosphor-icons/react';
import { useStore, outstandingAdvances, stockQty, findDuplicate } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs, fmtWeight, todayStr, MANN_KG, uid, fmtDate } from '../lib/format';
import { Card, Field, Input, Select, NumInput, Button, Modal } from '../components/ui';
import { PartyPicker } from '../components/PartyPicker';
import { ChargesEditor, defaultChargesFor, recalcCharges } from '../components/ChargesEditor';
import { WhatsAppSlip } from '../components/WhatsAppSlip';
import { ProductPicker } from '../components/ProductPicker';

// ─── helpers ────────────────────────────────────────────────────────────────
const MANN_KG_CONST = 40;

function calcWeightKg(bags, bhartiKg, looseKg) {
  return (Number(bags) || 0) * (Number(bhartiKg) || 0) + (Number(looseKg) || 0);
}

function itemNetKg(it) {
  return Math.max(0, (it.weightKg || 0) - (Number(it.kaatKg) || 0));
}

function itemGross(it, ratePerMann) {
  const netKg = itemNetKg(it);
  const rate = Number(it.rate) || 0;
  if (!rate) return 0;
  if (it.rateUnit === 'kg') return Math.round(netKg * rate);
  if (it.rateUnit === '100kg') return Math.round((netKg / 100) * rate);
  return Math.round((netKg / MANN_KG_CONST) * rate); // per mann (default)
}

function emptyPurchaseLine() {
  return {
    id: uid(), partyId: null, productId: '', bags: '', bhartiKg: '', looseKg: '',
    weightKg: 0, rate: '', rateUnit: 'mann', kaatKg: '', charges: [], paidNow: '', mode: 'cash',
  };
}

function emptySaleLine() {
  return {
    id: uid(), partyId: null, productId: '', bags: '', bhartiKg: '', looseKg: '',
    weightKg: 0, rate: '', rateUnit: 'mann', kaatKg: '', charges: [], receivedNow: '', mode: 'cash',
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SmallNum({ value, onChange, unit, placeholder = '0', className = '', readOnly = false }) {
  return (
    <div className={`flex items-stretch h-9 rounded-xl border overflow-hidden
      ${readOnly
        ? 'border-brand-300 bg-brand-50'
        : 'border-zinc-300 bg-white focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/15'}
      ${className}`}>
      <input
        type="number" inputMode="decimal" min="0" placeholder={placeholder}
        className={`num flex-1 min-w-0 px-2 text-end text-sm font-semibold outline-none bg-transparent ${readOnly ? 'text-brand-800 cursor-default' : ''}`}
        value={value ?? ''}
        readOnly={readOnly}
        onChange={(e) => !readOnly && onChange(e.target.value === '' ? '' : Number(e.target.value))}
        onWheel={(e) => e.target.blur()} />
      {unit && (
        <span className={`flex items-center px-2 border-s text-[10px] font-bold whitespace-nowrap select-none
          ${readOnly ? 'bg-brand-100 border-brand-200 text-brand-600' : 'bg-zinc-50 border-zinc-200 text-zinc-500'}`}>
          {unit}
        </span>
      )}
    </div>
  );
}

function WeightRow({ line, onUpdate, t, db, isReadOnly = false }) {
  const totalKg = line.weightKg || 0;
  const mann = Math.floor(totalKg / MANN_KG_CONST);
  const remKg = Math.round((totalKg - mann * MANN_KG_CONST) * 100) / 100;

  const handleProductChange = (productId) => {
    const product = db.products.find((p) => p.id === productId);
    const newBharti = product?.defaultBhartiKg || '';
    const newWeightKg = calcWeightKg(line.bags, newBharti, line.looseKg);
    onUpdate({ productId, bhartiKg: newBharti, rateUnit: product?.defaultRateUnit || 'mann', weightKg: newWeightKg });
  };

  const handleWeightField = (field, value) => {
    const bags = field === 'bags' ? value : line.bags;
    const bharti = field === 'bhartiKg' ? value : line.bhartiKg;
    const loose = field === 'looseKg' ? value : line.looseKg;
    onUpdate({ [field]: value, weightKg: calcWeightKg(bags, bharti, loose) });
  };

  return (
    <div className="space-y-2">
      <div className="flex-1 min-w-0">
        <ProductPicker value={line.productId} onChange={handleProductChange} />
      </div>

      {/* Bags × Bharti + Loose = Total */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <SmallNum className="w-20" value={line.bags} onChange={(v) => handleWeightField('bags', v)} unit={t('bags')} />
        <span className="text-zinc-400 font-bold">×</span>
        <SmallNum className="w-24" value={line.bhartiKg} onChange={(v) => handleWeightField('bhartiKg', v)} unit="kg" placeholder={t('bharti')} />
        <span className="text-zinc-400 font-bold">+</span>
        <SmallNum className="w-20" value={line.looseKg} onChange={(v) => handleWeightField('looseKg', v)} unit="kg loose" />
        <ArrowRight size={14} className="text-zinc-300" />
        <SmallNum className="w-28" value={totalKg > 0 ? totalKg : ''} unit="kg" readOnly placeholder="0" />
        {totalKg > 0 && (
          <span className="num font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200 text-xs">
            {mann > 0 ? `${mann}m` : ''}{remKg > 0 ? ` ${remKg}kg` : ''}{!mann && !remKg ? '0' : ''}
          </span>
        )}
      </div>

      {/* Rate + Kaat */}
      <div className="flex flex-wrap items-center gap-1.5">
        <SmallNum className="w-24" value={line.rate} onChange={(v) => onUpdate({ rate: v })} unit="Rs." />
        <Select className="!h-9 !text-xs w-24" value={line.rateUnit} onChange={(e) => onUpdate({ rateUnit: e.target.value })}>
          <option value="mann">{t('perMann')}</option>
          <option value="kg">{t('perKg')}</option>
          <option value="100kg">{t('per100Kg')}</option>
        </Select>
        <SmallNum className="w-20" value={line.kaatKg} onChange={(v) => onUpdate({ kaatKg: v })} unit="kaat" placeholder="0" />
      </div>
    </div>
  );
}

// ─── Main Mandi Slip Form ─────────────────────────────────────────────────────
export function MandiSlip({ onSaved, onReprint }) {
  const { db, lang, api, user } = useStore();
  const t = makeT(lang);

  const [date, setDate] = useState(todayStr());
  const [purchases, setPurchases] = useState([emptyPurchaseLine()]);
  const [sales, setSales] = useState([emptySaleLine()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [savedResults, setSavedResults] = useState(null); // { purchaseVouchers, saleVouchers }
  const [waSlip, setWaSlip] = useState(null); // { txn, partyPhone, partyName }
  const savingRef = useRef(false);

  const updatePurchase = (id, patch) => setPurchases((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const updateSale = (id, patch) => setSales((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removePurchase = (id) => setPurchases((ps) => ps.length > 1 ? ps.filter((p) => p.id !== id) : ps);
  const removeSale = (id) => setSales((ss) => ss.length > 1 ? ss.filter((s) => s.id !== id) : ss);

  // Totals
  const purTotalKg = purchases.reduce((s, p) => s + (itemNetKg(p) || 0), 0);
  const purTotalRs = purchases.reduce((s, p) => {
    const net = itemNetKg(p);
    const rate = Number(p.rate) || 0;
    if (!rate || !net) return s;
    const gross = p.rateUnit === 'kg' ? net * rate : p.rateUnit === '100kg' ? (net / 100) * rate : (net / MANN_KG_CONST) * rate;
    return s + Math.round(gross);
  }, 0);
  const salTotalKg = sales.reduce((s, sl) => s + (itemNetKg(sl) || 0), 0);
  const salTotalRs = sales.reduce((s, sl) => {
    const net = itemNetKg(sl);
    const rate = Number(sl.rate) || 0;
    if (!rate || !net) return s;
    const gross = sl.rateUnit === 'kg' ? net * rate : sl.rateUnit === '100kg' ? (net / 100) * rate : (net / MANN_KG_CONST) * rate;
    return s + Math.round(gross);
  }, 0);

  const unallocatedKg = Math.max(0, purTotalKg - salTotalKg);
  const unallocatedMann = Math.floor(unallocatedKg / MANN_KG_CONST);
  const unallocatedRemKg = Math.round((unallocatedKg - unallocatedMann * MANN_KG_CONST) * 100) / 100;

  const doSave = async (andPrint = false) => {
    setErr('');
    if (savingRef.current) return;
    const validPurchases = purchases.filter((p) => p.partyId && p.productId && (p.weightKg || 0) > 0);
    const validSales = sales.filter((s) => s.partyId && s.productId && (s.weightKg || 0) > 0);

    if (validPurchases.length === 0) { setErr('Add at least one valid purchase (seller + product + weight).'); return; }
    if (validSales.length === 0) { setErr('Add at least one valid sale (buyer + product + weight).'); return; }

    savingRef.current = true;
    setSaving(true);

    try {
      const slipId = uid();
      const purchaseVouchers = [];
      const saleVouchers = [];

      // Post each purchase separately
      for (const p of validPurchases) {
        const netKg = itemNetKg(p);
        const rate = Number(p.rate) || 0;
        const gross = p.rateUnit === 'kg' ? netKg * rate : p.rateUnit === '100kg' ? (netKg / 100) * rate : (netKg / MANN_KG_CONST) * rate;
        const grossRounded = Math.round(gross);
        const chargesTotal = (p.charges || []).reduce((s, c) => s + (c.amount || 0), 0);
        const netAmount = Math.max(0, grossRounded - chargesTotal);
        const paidNow = Math.min(Number(p.paidNow) || 0, netAmount);

        const txn = api.postTransaction({
          type: 'purchase',
          businessDate: date,
          partyId: p.partyId,
          items: [{
            id: uid(), productId: p.productId,
            bags: Number(p.bags) || 0,
            weightKg: p.weightKg,
            bhartiKg: Number(p.bhartiKg) || 0,
            looseKg: Number(p.looseKg) || 0,
            kaatKg: Number(p.kaatKg) || 0,
            netKg, gross: grossRounded,
            rate, rateUnit: p.rateUnit,
          }],
          productId: p.productId,
          bags: Number(p.bags) || 0,
          weightKg: p.weightKg,
          weightLabel: fmtWeight(p.weightKg),
          rate, rateUnit: p.rateUnit,
          grossAmount: grossRounded,
          kaat: { kg: Number(p.kaatKg) || 0, amount: 0 },
          charges: p.charges || [],
          netAmount,
          paidNow,
          advanceAdjust: 0, linkedAdvanceIds: [], advanceAdjustMap: {},
          mode: p.mode || 'cash',
          seasonTag: db.settings.season,
          slipId,
        });
        if (txn) purchaseVouchers.push(txn);
      }

      // Post each sale separately
      for (const s of validSales) {
        const netKg = itemNetKg(s);
        const rate = Number(s.rate) || 0;
        const gross = s.rateUnit === 'kg' ? netKg * rate : s.rateUnit === '100kg' ? (netKg / 100) * rate : (netKg / MANN_KG_CONST) * rate;
        const grossRounded = Math.round(gross);
        const chargesTotal = (s.charges || []).reduce((sum, c) => sum + (c.amount || 0), 0);
        const netAmount = grossRounded + chargesTotal; // buyer side: charges added on top
        const receivedNow = Math.min(Number(s.receivedNow) || 0, netAmount);

        const txn = api.postTransaction({
          type: 'sale',
          businessDate: date,
          partyId: s.partyId,
          items: [{
            id: uid(), productId: s.productId,
            bags: Number(s.bags) || 0,
            weightKg: s.weightKg,
            bhartiKg: Number(s.bhartiKg) || 0,
            looseKg: Number(s.looseKg) || 0,
            kaatKg: Number(s.kaatKg) || 0,
            netKg, gross: grossRounded,
            rate, rateUnit: s.rateUnit,
          }],
          productId: s.productId,
          bags: Number(s.bags) || 0,
          weightKg: s.weightKg,
          weightLabel: fmtWeight(s.weightKg),
          rate, rateUnit: s.rateUnit,
          grossAmount: grossRounded,
          kaat: { kg: Number(s.kaatKg) || 0, amount: 0 },
          charges: s.charges || [],
          netAmount,
          receivedNow,
          mode: s.mode || 'cash',
          seasonTag: db.settings.season,
          slipId,
        });
        if (txn) saleVouchers.push(txn);
      }

      setSavedResults({ purchaseVouchers, saleVouchers });
      setPurchases([emptyPurchaseLine()]);
      setSales([emptySaleLine()]);
      setDate(todayStr());

      if (andPrint && onReprint) {
        [...purchaseVouchers, ...saleVouchers].forEach((v) => onSaved?.(v, true));
      } else {
        [...purchaseVouchers, ...saleVouchers].forEach((v) => onSaved?.(v, false));
      }
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const reset = () => {
    setPurchases([emptyPurchaseLine()]);
    setSales([emptySaleLine()]);
    setSavedResults(null);
    setErr('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-600 to-sky-500 flex items-center justify-center text-white">
          <ReceiptX size={22} weight="fill" />
        </div>
        <div>
          <h1 className={`text-2xl font-extrabold tracking-tight ${lang === 'ur' ? 'font-urdu leading-[1.8]' : ''}`}>
            {t('newMandiSlip')}
          </h1>
          <p className="text-sm text-zinc-400">{t('mandiSlipDesc')}</p>
        </div>
        <div className="ms-auto">
          <Field label={t('slipDate')}>
            <Input type="date" className="num" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Success banner */}
      <AnimatePresence>
        {savedResults && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-5 bg-green-50 border border-green-300 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle size={24} weight="fill" className="text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-green-800">{t('slipSaved')}</p>
                <p className="text-sm text-green-700 mt-1">
                  {savedResults.purchaseVouchers.length} {t('purchaseCount')}: {savedResults.purchaseVouchers.map((v) => v.voucherNo).join(', ')}
                  {' | '}
                  {savedResults.saleVouchers.length} {t('saleCount')}: {savedResults.saleVouchers.map((v) => v.voucherNo).join(', ')}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[...savedResults.purchaseVouchers, ...savedResults.saleVouchers].map((v) => {
                    const party = db.parties.find((p) => p.id === v.partyId);
                    return (
                      <button key={v.id} onClick={() => onReprint?.(v)}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-white border border-green-200 text-xs font-bold text-green-700 hover:bg-green-100 cursor-pointer">
                        <Printer size={13} /> {v.voucherNo}
                      </button>
                    );
                  })}
                  <button onClick={reset}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-green-700 text-white text-xs font-bold hover:bg-green-800 cursor-pointer">
                    + {t('newMandiSlip')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
        {/* Left: Purchases + Sales (stacked vertically) */}
        <div className="flex flex-col gap-5">
          {/* ── PURCHASES PANEL ──────────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                <ShoppingCart size={18} weight="fill" />
              </div>
              <div>
                <p className={`font-extrabold text-zinc-800 ${lang === 'ur' ? 'font-urdu' : ''}`}>{t('purchasePanel')}</p>
                <p className="text-xs text-zinc-400">One row per farmer / seller</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {purchases.map((p, idx) => (
                <div key={p.id} className="border border-brand-200 rounded-2xl overflow-hidden">
                  {/* Row header */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 border-b border-brand-200">
                    <span className="w-6 h-6 rounded-full bg-brand-700 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <PartyPicker value={p.partyId} onChange={(v) => updatePurchase(p.id, { partyId: v })} />
                    </div>
                    {purchases.length > 1 && (
                      <button onClick={() => removePurchase(p.id)}
                        className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 flex items-center justify-center cursor-pointer">
                        <Trash size={12} weight="bold" />
                      </button>
                    )}
                  </div>
                  {/* Weight row */}
                  <div className="px-3 py-3">
                    <WeightRow line={p} onUpdate={(patch) => updatePurchase(p.id, patch)} t={t} db={db} />
                    {/* Paid now */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
                      <span className="text-xs font-semibold text-zinc-500 shrink-0">{t('paidNow')}:</span>
                      <SmallNum className="w-28" value={p.paidNow} onChange={(v) => updatePurchase(p.id, { paidNow: v })} unit="Rs." />
                      <Select className="!h-9 !text-xs w-20" value={p.mode} onChange={(e) => updatePurchase(p.id, { mode: e.target.value })}>
                        <option value="cash">{t('cash')}</option>
                        <option value="bank">{t('bank')}</option>
                      </Select>
                      <div className="ms-auto text-right">
                        {(() => {
                          const net = itemNetKg(p);
                          const rate = Number(p.rate) || 0;
                          const gross = p.rateUnit === 'kg' ? net * rate : p.rateUnit === '100kg' ? (net / 100) * rate : (net / MANN_KG_CONST) * rate;
                          return gross > 0 ? <span className="num font-extrabold text-brand-800 text-sm">{fmtRs(Math.round(gross))}</span> : null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setPurchases((ps) => [...ps, emptyPurchaseLine()])}
              className="mt-3 w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed border-brand-300 text-brand-700 text-sm font-bold hover:bg-brand-50 cursor-pointer transition-colors">
              <Plus size={16} weight="bold" /> {t('addPurchaseLine')}
            </button>
          </Card>

          {/* ── SALES PANEL ──────────────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Tag size={18} weight="fill" />
              </div>
              <div>
                <p className={`font-extrabold text-zinc-800 ${lang === 'ur' ? 'font-urdu' : ''}`}>{t('salePanel')}</p>
                <p className="text-xs text-zinc-400">One row per buyer — often 1–2 buyers for multiple seller lots</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {sales.map((s, idx) => (
                <div key={s.id} className="border border-sky-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 border-b border-sky-200">
                    <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <PartyPicker value={s.partyId} onChange={(v) => updateSale(s.id, { partyId: v })} />
                    </div>
                    {sales.length > 1 && (
                      <button onClick={() => removeSale(s.id)}
                        className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 flex items-center justify-center cursor-pointer">
                        <Trash size={12} weight="bold" />
                      </button>
                    )}
                  </div>
                  <div className="px-3 py-3">
                    <WeightRow line={s} onUpdate={(patch) => updateSale(s.id, patch)} t={t} db={db} />
                    {/* Received now */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
                      <span className="text-xs font-semibold text-zinc-500 shrink-0">{t('receivedNow')}:</span>
                      <SmallNum className="w-28" value={s.receivedNow} onChange={(v) => updateSale(s.id, { receivedNow: v })} unit="Rs." />
                      <Select className="!h-9 !text-xs w-20" value={s.mode} onChange={(e) => updateSale(s.id, { mode: e.target.value })}>
                        <option value="cash">{t('cash')}</option>
                        <option value="bank">{t('bank')}</option>
                      </Select>
                      <div className="ms-auto text-right">
                        {(() => {
                          const net = itemNetKg(s);
                          const rate = Number(s.rate) || 0;
                          const gross = s.rateUnit === 'kg' ? net * rate : s.rateUnit === '100kg' ? (net / 100) * rate : (net / MANN_KG_CONST) * rate;
                          return gross > 0 ? <span className="num font-extrabold text-sky-700 text-sm">{fmtRs(Math.round(gross))}</span> : null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setSales((ss) => [...ss, emptySaleLine()])}
              className="mt-3 w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed border-sky-300 text-sky-600 text-sm font-bold hover:bg-sky-50 cursor-pointer transition-colors">
              <Plus size={16} weight="bold" /> {t('addSaleLine')}
            </button>
          </Card>
        </div>

        {/* Right: Summary & Actions */}
        <div className="sticky top-20 flex flex-col gap-4">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-4">{t('slipSummary')}</p>

            {/* Purchases total */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <ShoppingCart size={14} className="text-brand-600" />
                <span className="text-sm font-semibold text-zinc-600">{t('totalPurchased')}</span>
              </div>
              <div className="text-end">
                <p className="num font-extrabold text-brand-800">{fmtWeight(purTotalKg)}</p>
                <p className="num text-xs text-zinc-400">{fmtRs(purTotalRs)}</p>
              </div>
            </div>

            {/* Sales total */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Tag size={14} className="text-sky-600" />
                <span className="text-sm font-semibold text-zinc-600">{t('totalSold')}</span>
              </div>
              <div className="text-end">
                <p className="num font-extrabold text-sky-700">{fmtWeight(salTotalKg)}</p>
                <p className="num text-xs text-zinc-400">{fmtRs(salTotalRs)}</p>
              </div>
            </div>

            {/* Unallocated */}
            {unallocatedKg > 0 && (
              <div className="flex items-start justify-between pt-3 border-t border-amber-200 mt-1">
                <span className="text-sm font-semibold text-amber-700">{t('unallocated')}</span>
                <span className="num font-bold text-amber-700">
                  {unallocatedMann > 0 ? `${unallocatedMann}m ` : ''}
                  {unallocatedRemKg > 0 ? `${unallocatedRemKg}kg` : ''}
                </span>
              </div>
            )}

            {/* Entry counts */}
            <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-brand-50 border border-brand-100 p-2">
                <p className="text-xl font-extrabold text-brand-800">{purchases.length}</p>
                <p className="text-[11px] text-brand-600">{t('purchaseCount')}</p>
              </div>
              <div className="rounded-xl bg-sky-50 border border-sky-100 p-2">
                <p className="text-xl font-extrabold text-sky-700">{sales.length}</p>
                <p className="text-[11px] text-sky-600">{t('saleCount')}</p>
              </div>
            </div>

            {err && <p className="text-sm font-semibold text-rose-600 mt-3">{err}</p>}

            <div className="flex flex-col gap-2 mt-5">
              <Button className="h-11" onClick={() => doSave(true)} disabled={saving}>
                <Printer size={16} /> {saving ? 'Saving…' : t('saveSlip')}
              </Button>
              <Button variant="secondary" onClick={() => doSave(false)} disabled={saving}>
                {saving ? 'Saving…' : t('save')}
              </Button>
            </div>
          </Card>

          {/* Quick tip */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 leading-relaxed">
            <b>Tip:</b> Product selection auto-fills the bag packing (بھرتی). You can override it per entry.
            Multiple farmer lots → one buyer is the common flow.
          </div>
        </div>
      </div>

      {/* WhatsApp modal */}
      {waSlip && (
        <WhatsAppSlip
          open={!!waSlip}
          txn={waSlip.txn}
          partyPhone={waSlip.partyPhone}
          partyName={waSlip.partyName}
          onClose={() => setWaSlip(null)}
        />
      )}
    </motion.div>
  );
}
