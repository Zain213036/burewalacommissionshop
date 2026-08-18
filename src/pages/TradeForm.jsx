import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Tag } from '@phosphor-icons/react';
import { useStore, outstandingAdvances, stockQty, findDuplicate } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs, fmtWeight, todayStr, MANN_KG, uid } from '../lib/format';
import { Card, Field, Input, Select, NumInput, Button, Modal } from '../components/ui';
import { PartyPicker } from '../components/PartyPicker';
import { ChargesEditor, defaultChargesFor, recalcCharges } from '../components/ChargesEditor';
import { TxnList } from '../components/TxnList';
import { ItemsEditor, emptyItem, itemsTotals, itemNetKg, itemGross } from '../components/ItemsEditor';

// Shared entry form for Trading Purchase (buy from seller) and Trading Sale (sell to buyer).
// Supports MULTIPLE items (products) in one voucher.
export function TradeForm({ kind, onSaved, editTxn, onDoneEdit, onReprint, onEditTxn }) {
  const { db, lang, api, user } = useStore();
  const t = makeT(lang);
  const isPurchase = kind === 'purchase';

  const empty = () => ({
    businessDate: todayStr(), partyId: null, kaatRs: '', paidNow: '', mode: 'cash', bankId: '',
    adjustChecked: {},
  });
  const [f, setF] = useState(empty());
  const [items, setItems] = useState([emptyItem()]);
  const [charges, setCharges] = useState([]);
  const [stockWarn, setStockWarn] = useState(null);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // Edit mode — prefill the whole form from the voucher being edited
  useEffect(() => {
    if (!editTxn) return;
    setF({
      businessDate: editTxn.businessDate, partyId: editTxn.partyId,
      kaatRs: editTxn.kaat?.amount || '',
      paidNow: (isPurchase ? editTxn.paidNow : editTxn.receivedNow) || '',
      mode: editTxn.mode || 'cash', bankId: editTxn.bankId || '', adjustChecked: {},
    });
    setItems(editTxn.items?.length
      ? editTxn.items.map((it) => ({ ...it, id: it.id || uid() }))
      : [{
        id: uid(), productId: editTxn.productId, bags: editTxn.bags || '',
        weightKg: editTxn.weightKg || 0, rate: editTxn.rate || '',
        rateUnit: editTxn.rateUnit || 'mann', kaatKg: editTxn.kaat?.kg || '',
      }]);
    setCharges((editTxn.charges || []).map((c) => ({ ...c })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTxn]);

  const totals = itemsTotals(items);
  const gross = totals.gross;
  const ctx = { gross, bags: totals.bags, mannQty: totals.netKg / MANN_KG };

  useEffect(() => {
    setCharges((c) => recalcCharges(c.length ? c : defaultChargesFor(db, isPurchase ? 'purchase' : 'sale', ctx), ctx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gross, totals.bags]);

  const chargesTotal = charges.reduce((s, c) => s + (c.amount || 0), 0);
  const kaatRs = Number(f.kaatRs) || 0;
  const net = isPurchase
    ? Math.max(0, gross - kaatRs - chargesTotal)
    : gross - kaatRs + chargesTotal; // buyer-side charges added on top

  const advances = isPurchase && f.partyId ? outstandingAdvances(db, f.partyId) : [];
  const adjustTotal = advances.reduce((s, a) => {
    const out = (a.principal || 0) + (a.extra || 0) - (a.recovered || 0);
    return s + (f.adjustChecked[a.id] ? Math.min(out, net) : 0);
  }, 0);
  const adjustCapped = Math.min(adjustTotal, net);
  const paidNow = Math.min(Number(f.paidNow) || 0, Math.max(0, net - adjustCapped));

  const savingRef = useRef(false);

  const doSave = (print, force = false) => {
    setErr('');
    if (savingRef.current) return; // block double-click double entries
    const validItems = items.filter((it) => it.productId && it.weightKg > 0 && Number(it.rate));
    if (!f.partyId || validItems.length === 0) { setErr(t('required')); return; }
    if (!editTxn && findDuplicate(db, { type: kind, partyId: f.partyId, netAmount: net, businessDate: f.businessDate })
      && !window.confirm(t('possibleDuplicate'))) return;
    if (!isPurchase && !force) {
      // aggregate needed per product, warn if any product would go negative
      const need = {};
      validItems.forEach((it) => { need[it.productId] = (need[it.productId] || 0) + itemNetKg(it); });
      const deficits = Object.entries(need)
        .map(([pid, kg]) => ({ pid, deficit: kg - stockQty(db, pid) }))
        .filter((d) => d.deficit > 0);
      if (deficits.length) {
        const names = deficits.map((d) => {
          const p = db.products.find((x) => x.id === d.pid);
          return `${lang === 'ur' ? p?.nameUr : p?.nameEn} (${fmtWeight(d.deficit, t)})`;
        }).join(' · ');
        setStockWarn({ label: names, print });
        return;
      }
    }
    const adjustMap = {};
    let remaining = adjustCapped;
    advances.forEach((a) => {
      if (!f.adjustChecked[a.id] || remaining <= 0) return;
      const out = (a.principal || 0) + (a.extra || 0) - (a.recovered || 0);
      const take = Math.min(out, remaining);
      adjustMap[a.id] = take; remaining -= take;
    });

    savingRef.current = true;
    setTimeout(() => { savingRef.current = false; }, 1500);
    const cleanItems = validItems.map((it) => ({
      id: it.id, productId: it.productId, bags: Number(it.bags) || 0,
      weightKg: it.weightKg, rate: Number(it.rate), rateUnit: it.rateUnit,
      kaatKg: Number(it.kaatKg) || 0, netKg: itemNetKg(it), gross: itemGross(it),
    }));
    const tot = itemsTotals(validItems);
    const payload = {
      type: kind,
      businessDate: f.businessDate,
      partyId: f.partyId,
      items: cleanItems,
      // legacy single-item fields (first item) keep prints/old views working
      productId: cleanItems[0].productId,
      bags: tot.bags, weightKg: tot.weightKg,
      weightLabel: fmtWeight(tot.weightKg),
      rate: cleanItems[0].rate, rateUnit: cleanItems[0].rateUnit,
      grossAmount: gross,
      kaat: { kg: cleanItems.reduce((s, it) => s + it.kaatKg, 0), amount: kaatRs },
      charges: charges.filter((c) => c.amount > 0 || c.value > 0),
      netAmount: net,
      ...(isPurchase
        ? { paidNow, advanceAdjust: adjustCapped, linkedAdvanceIds: Object.keys(adjustMap), advanceAdjustMap: adjustMap }
        : { receivedNow: Math.min(Number(f.paidNow) || 0, net) }),
      mode: f.mode, bankId: f.bankId || null,
      seasonTag: db.settings.season,
    };
    const txn = editTxn ? api.editTransaction(editTxn.id, payload) : api.postTransaction(payload);
    setF(empty()); setItems([emptyItem()]); setCharges([]); setStockWarn(null);
    if (editTxn) onDoneEdit?.();
    onSaved(txn, print);
  };

  const Icon = isPurchase ? ShoppingCart : Tag;
  const remainder = Math.max(0, net - adjustCapped - paidNow);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isPurchase ? 'bg-brand-50 text-brand-700' : 'bg-sky-50 text-sky-700'}`}>
          <Icon size={22} weight="fill" />
        </div>
        <div>
          <h1 className={`text-2xl font-extrabold tracking-tight ${lang === 'ur' ? 'font-urdu leading-[1.8]' : ''}`}>
            {editTxn ? `${t('editing')} — ${editTxn.voucherNo}` : t(isPurchase ? 'newPurchase' : 'newSale')}
          </h1>
          <p className="text-sm text-zinc-400">{t(isPurchase ? 'seller' : 'buyer')}</p>
        </div>
        {editTxn && (
          <div className="ms-auto flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-2">
            <p className="text-xs font-semibold text-amber-800 max-w-[280px]">{t('entryUpdatedKeepsVoucher')}</p>
            <Button variant="secondary" className="!h-8 !px-3 text-xs shrink-0"
              onClick={() => { setF(empty()); setItems([emptyItem()]); setCharges([]); onDoneEdit?.(); }}>
              {t('cancelEdit')}
            </Button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        <Card className="p-6 flex flex-col gap-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t('date')} required>
              <Input type="date" className="num" value={f.businessDate} max={todayStr()} onChange={(e) => set('businessDate', e.target.value)} />
            </Field>
            <Field label={t(isPurchase ? 'seller' : 'buyer')} required>
              <PartyPicker value={f.partyId} onChange={(v) => set('partyId', v)} />
            </Field>
          </div>

          {/* Multiple items in one voucher */}
          <div>
            <p className="text-[13px] font-semibold text-zinc-700 mb-2">{t('items')} <span className="text-rose-500">*</span></p>
            <ItemsEditor items={items} onChange={setItems} />
          </div>

          <Field label={t('kaatRs')} className="sm:max-w-[240px]">
            <NumInput min="0" value={f.kaatRs} onChange={(v) => set('kaatRs', v)} placeholder="0" />
          </Field>

          <ChargesEditor charges={charges} onChange={setCharges} ctx={ctx} />

          {/* Peshgi auto-adjust box */}
          {isPurchase && advances.length > 0 && (
            <div className="border-2 border-amber-300 bg-amber-50/60 rounded-2xl p-4">
              <p className={`text-sm font-bold text-amber-800 mb-2 ${lang === 'ur' ? 'font-urdu-naskh' : ''}`}>{t('linkAdvance')}</p>
              {advances.map((a) => {
                const out = (a.principal || 0) + (a.extra || 0) - (a.recovered || 0);
                return (
                  <label key={a.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer text-sm">
                    <input type="checkbox" className="w-4 h-4 accent-amber-600"
                      checked={!!f.adjustChecked[a.id]}
                      onChange={(e) => set('adjustChecked', { ...f.adjustChecked, [a.id]: e.target.checked })} />
                    <span className="num font-bold">{a.voucherNo}</span>
                    <span className="text-zinc-500">{a.note}</span>
                    <span className="num ms-auto font-bold text-amber-700">{fmtRs(out)}</span>
                  </label>
                );
              })}
              {adjustCapped > 0 && <p className="text-xs font-bold text-amber-700 mt-1">{t('advanceAdjusted')}: <span className="num">{fmtRs(adjustCapped)}</span></p>}
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label={t(isPurchase ? 'paidNow' : 'receivedNow')}>
              <NumInput min="0" value={f.paidNow} onChange={(v) => set('paidNow', v)} placeholder="0" />
            </Field>
            <Field label={t('mode')}>
              <Select value={f.mode} onChange={(e) => set('mode', e.target.value)}>
                <option value="cash">{t('cash')}</option>
                <option value="bank">{t('bank')}</option>
              </Select>
            </Field>
            {f.mode === 'bank' && (
              <Field label={t('bank')}>
                <Select value={f.bankId} onChange={(e) => set('bankId', e.target.value)}>
                  <option value="">—</option>
                  {db.banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
            )}
          </div>
          {err && <p className="text-sm font-semibold text-rose-600">{err} — {t('party')}, {t('product')}, {t('weight')}, {t('rate')}</p>}
        </Card>

        {/* Live summary */}
        <Card className="p-5 sticky top-20">
          <p className={`text-xs uppercase tracking-widest font-bold text-zinc-400 mb-3 ${lang === 'ur' ? 'font-urdu-naskh normal-case text-sm' : ''}`}>
            {t(isPurchase ? 'netPayable' : 'netReceivable')}
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <SumRow label={`${t('items')} (${items.filter((it) => it.productId).length || items.length})`} v={fmtWeight(totals.netKg, t)} />
            <SumRow label={t('grossAmount')} v={fmtRs(gross)} />
            {kaatRs > 0 && <SumRow label={t('kaat')} v={'− ' + fmtRs(kaatRs)} red />}
            <SumRow label={t('charges')} v={(isPurchase ? '− ' : '+ ') + fmtRs(chargesTotal)} red={isPurchase} />
            <div className="border-t border-zinc-200 my-1" />
            <div className="flex items-baseline justify-between">
              <span className="font-bold">{t('total')}</span>
              <motion.span key={net} initial={{ scale: 1.06 }} animate={{ scale: 1 }} className={`num text-2xl font-extrabold ${isPurchase ? 'text-brand-800' : 'text-sky-700'}`}>
                {fmtRs(net)}
              </motion.span>
            </div>
            {adjustCapped > 0 && <SumRow label={t('advanceAdjusted')} v={'− ' + fmtRs(adjustCapped)} red />}
            {paidNow > 0 && <SumRow label={t(isPurchase ? 'paidNow' : 'receivedNow')} v={'− ' + fmtRs(isPurchase ? paidNow : Math.min(Number(f.paidNow) || 0, net))} red />}
            <SumRow label={t('remainderToKhata')} v={fmtRs(isPurchase ? remainder : Math.max(0, net - (Number(f.paidNow) || 0)))} bold />
          </div>
          <div className="flex flex-col gap-2 mt-5">
            <Button className="h-11" onClick={() => doSave(true)}>{editTxn ? `${t('updateEntry')} + ${t('print')}` : t('saveAndPrint')}</Button>
            <Button variant="secondary" onClick={() => doSave(false)}>{editTxn ? t('updateEntry') : t('save')}</Button>
          </div>
        </Card>
      </div>

      {/* negative stock warning */}
      <Modal open={!!stockWarn} onClose={() => setStockWarn(null)} title={t('overStockTitle')}>
        <p className="text-sm text-zinc-600 leading-relaxed">
          {t('stockWarning')} <b className="num text-rose-600">{stockWarn?.label}</b>
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setStockWarn(null)}>{t('cancel')}</Button>
          <Button variant="danger" onClick={() => { const p = stockWarn?.print; setStockWarn(null); doSave(p, true); }}>
            {t('continueAnyway')}
          </Button>
        </div>
      </Modal>

      {/* daily entries of this type — with edit / partial cash / print / delete */}
      <TxnList types={[kind]} onEditTxn={onEditTxn} onReprint={onReprint} onSaved={onSaved} />
    </motion.div>
  );
}

function SumRow({ label, v, red, bold }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={`${bold ? 'font-bold text-zinc-800' : 'text-zinc-500'}`}>{label}</span>
      <span className={`num font-bold ${red ? 'text-rose-600' : bold ? 'text-zinc-900' : 'text-zinc-700'}`}>{v}</span>
    </div>
  );
}
