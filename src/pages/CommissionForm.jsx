import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Handshake, CaretDown } from '@phosphor-icons/react';
import { useStore, findDuplicate } from '../lib/store';
import { makeT } from '../lib/i18n';
import { commissionAmount } from '../lib/calc';
import { fmtRs, fmtWeight, todayStr, MANN_KG } from '../lib/format';
import { Card, Field, Input, Select, NumInput, Button } from '../components/ui';
import { PartyPicker } from '../components/PartyPicker';
import { ChargesEditor, defaultChargesFor, recalcCharges } from '../components/ChargesEditor';
import { TxnList } from '../components/TxnList';
import { ItemsEditor, emptyItem, itemsTotals, itemNetKg, itemGross } from '../components/ItemsEditor';

export function CommissionForm({ onSaved, onReprint }) {
  const { db, lang, api, user } = useStore();
  const t = makeT(lang);
  const isOwner = user?.role === 'owner';

  const empty = () => ({
    businessDate: todayStr(), sellerId: null, buyerId: null, kaatRs: '',
    sellerCommMethod: 'pct', sellerCommValue: '', buyerCommMethod: 'none', buyerCommValue: '',
    receivedNow: '', paidNow: '', mode: 'cash', bankId: '',
  });
  const [f, setF] = useState(empty());
  const [items, setItems] = useState([emptyItem()]);
  const [sellerCharges, setSellerCharges] = useState([]);
  const [buyerCharges, setBuyerCharges] = useState([]);
  const [showIncome, setShowIncome] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const totals = itemsTotals(items);
  const gross = totals.gross;
  const ctx = { gross, bags: totals.bags, mannQty: totals.netKg / MANN_KG };

  const [autoComm, setAutoComm] = useState(true); // track if we should auto-update seller comm method
  
  // Auto-default seller commission method when the first product changes
  useEffect(() => {
    if (!autoComm) return;
    const pId = items[0]?.productId;
    if (pId) {
      const prod = db.products.find((p) => p.id === pId);
      if (prod && prod.commissionMethod) {
        set('sellerCommMethod', prod.commissionMethod);
      }
    }
  }, [items[0]?.productId, autoComm, db.products]);

  useEffect(() => {
    setSellerCharges((c) => recalcCharges(c.length ? c : defaultChargesFor(db, 'commissionSeller', ctx), ctx));
    setBuyerCharges((c) => recalcCharges(c.length ? c : defaultChargesFor(db, 'commissionBuyer', ctx), ctx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gross, totals.bags]);

  const sellerComm = commissionAmount(f.sellerCommMethod, f.sellerCommValue, gross, ctx.mannQty);
  const buyerComm = commissionAmount(f.buyerCommMethod, f.buyerCommValue, gross, ctx.mannQty);
  const sellerChTotal = sellerCharges.reduce((s, c) => s + (c.amount || 0), 0);
  const buyerChTotal = buyerCharges.reduce((s, c) => s + (c.amount || 0), 0);
  const kaatRs = Number(f.kaatRs) || 0;

  const buyerOwes = gross + buyerComm + buyerChTotal;
  const sellerReceives = Math.max(0, gross - sellerComm - sellerChTotal - kaatRs);
  const retained = [...sellerCharges, ...buyerCharges].filter((c) => c.retained).reduce((s, c) => s + (c.amount || 0), 0);
  const shopIncome = sellerComm + buyerComm + retained;

  const savingRef = useRef(false);

  const doSave = (print) => {
    setErr('');
    if (savingRef.current) return; // block double-click double entries
    const validItems = items.filter((it) => it.productId && it.weightKg > 0 && Number(it.rate));
    if (!f.sellerId || !f.buyerId || validItems.length === 0) { setErr(t('required')); return; }
    if (f.sellerId === f.buyerId) { setErr(t('sameParty')); return; }
    if (findDuplicate(db, { type: 'commission', sellerId: f.sellerId, buyerId: f.buyerId, netAmount: gross, businessDate: f.businessDate })
      && !window.confirm(t('possibleDuplicate'))) return;
    savingRef.current = true;
    setTimeout(() => { savingRef.current = false; }, 1500);
    const cleanItems = validItems.map((it) => ({
      id: it.id, productId: it.productId, bags: Number(it.bags) || 0,
      weightKg: it.weightKg, rate: Number(it.rate), rateUnit: it.rateUnit,
      kaatKg: Number(it.kaatKg) || 0, netKg: itemNetKg(it), gross: itemGross(it),
    }));
    const tot = itemsTotals(validItems);
    const txn = api.postTransaction({
      type: 'commission',
      businessDate: f.businessDate,
      sellerId: f.sellerId, buyerId: f.buyerId,
      items: cleanItems,
      productId: cleanItems[0].productId,
      bags: tot.bags, weightKg: tot.weightKg, weightLabel: fmtWeight(tot.weightKg),
      rate: cleanItems[0].rate, rateUnit: cleanItems[0].rateUnit, grossAmount: gross,
      kaat: { kg: cleanItems.reduce((s, it) => s + it.kaatKg, 0), amount: kaatRs },
      charges: [
        ...sellerCharges.filter((c) => c.amount > 0).map((c) => ({ ...c, side: 'seller' })),
        ...buyerCharges.filter((c) => c.amount > 0).map((c) => ({ ...c, side: 'buyer' })),
      ],
      commission: {
        seller: { method: f.sellerCommMethod, value: Number(f.sellerCommValue) || 0, amount: sellerComm },
        buyer: { method: f.buyerCommMethod, value: Number(f.buyerCommValue) || 0, amount: buyerComm },
      },
      buyerOwes, sellerReceives, netAmount: gross,
      receivedNow: Math.min(Number(f.receivedNow) || 0, buyerOwes),
      paidNow: Math.min(Number(f.paidNow) || 0, sellerReceives),
      mode: f.mode, bankId: f.bankId || null,
      seasonTag: db.settings.season,
    });
    setF(empty()); setItems([emptyItem()]); setSellerCharges([]); setBuyerCharges([]); setAutoComm(true);
    onSaved(txn, print);
  };

  const CommRow = ({ side }) => {
    const m = side === 'seller' ? f.sellerCommMethod : f.buyerCommMethod;
    const v = side === 'seller' ? f.sellerCommValue : f.buyerCommValue;
    const amt = side === 'seller' ? sellerComm : buyerComm;
    return (
      <div className="grid grid-cols-[1fr_110px_100px] gap-2 items-end">
        <Field label={t(side === 'seller' ? 'sellerCommission' : 'buyerCommission')}>
          <Select value={m} onChange={(e) => { set(side === 'seller' ? 'sellerCommMethod' : 'buyerCommMethod', e.target.value); if (side === 'seller') setAutoComm(false); }}>
            <option value="none">{t('none')}</option>
            <option value="pct">{t('commMethodPct')}</option>
            <option value="perMann">{t('commMethodPerMann')}</option>
            <option value="flat">{t('commMethodFlat')}</option>
          </Select>
        </Field>
        <NumInput min="0" step="0.01" disabled={m === 'none'} value={v}
          onChange={(x) => set(side === 'seller' ? 'sellerCommValue' : 'buyerCommValue', x)} placeholder="0" />
        <span className="num h-10 flex items-center justify-end font-bold text-amber-700">{fmtRs(amt)}</span>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-700">
          <Handshake size={22} weight="fill" />
        </div>
        <div>
          <h1 className={`text-2xl font-extrabold tracking-tight ${lang === 'ur' ? 'font-urdu leading-[1.8]' : ''}`}>{t('newCommission')}</h1>
          <p className="text-sm text-zinc-400">{lang === 'ur' ? 'مال دکان کی ملکیت میں نہیں آتا — صرف کمیشن' : 'Goods pass through — shop earns commission only'}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        <Card className="p-6 flex flex-col gap-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label={t('date')} required>
              <Input type="date" className="num" value={f.businessDate} max={todayStr()} onChange={(e) => set('businessDate', e.target.value)} />
            </Field>
            <Field label={t('seller')} required>
              <PartyPicker value={f.sellerId} onChange={(v) => set('sellerId', v)} exclude={f.buyerId} />
            </Field>
            <Field label={t('buyer')} required>
              <PartyPicker value={f.buyerId} onChange={(v) => set('buyerId', v)} exclude={f.sellerId} />
            </Field>
          </div>
          {/* Multiple items in one deal */}
          <div>
            <p className="text-[13px] font-semibold text-zinc-700 mb-2">{t('items')} <span className="text-rose-500">*</span></p>
            <ItemsEditor items={items} onChange={setItems} />
          </div>

          <Field label={t('kaatRs')} className="sm:max-w-[240px]">
            <NumInput min="0" value={f.kaatRs} onChange={(v) => set('kaatRs', v)} placeholder="0" />
          </Field>

          <div className="border border-amber-200 bg-amber-50/40 rounded-2xl p-4 flex flex-col gap-3">
            <CommRow side="seller" />
            <CommRow side="buyer" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-zinc-500 mb-1.5">{t('sellerSide')}</p>
              <ChargesEditor charges={sellerCharges} onChange={setSellerCharges} ctx={ctx} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 mb-1.5">{t('buyerSide')}</p>
              <ChargesEditor charges={buyerCharges} onChange={setBuyerCharges} ctx={ctx} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label={t('receivedNow') + ' (' + t('buyer').split(' ')[0] + ')'}>
              <NumInput min="0" value={f.receivedNow} onChange={(v) => set('receivedNow', v)} placeholder="0" />
            </Field>
            <Field label={t('paidNow') + ' (' + t('seller').split(' ')[0] + ')'}>
              <NumInput min="0" value={f.paidNow} onChange={(v) => set('paidNow', v)} placeholder="0" />
            </Field>
            <Field label={t('mode')}>
              <Select value={f.mode} onChange={(e) => set('mode', e.target.value)}>
                <option value="cash">{t('cash')}</option>
                <option value="bank">{t('bank')}</option>
              </Select>
            </Field>
          </div>
          {err && <p className="text-sm font-semibold text-rose-600">{err}</p>}
        </Card>

        <Card className="p-5 sticky top-20">
          <p className={`text-xs uppercase tracking-widest font-bold text-zinc-400 mb-3 ${lang === 'ur' ? 'font-urdu-naskh normal-case text-sm' : ''}`}>
            {t('grossDealValue')}
          </p>
          <motion.p key={gross} initial={{ scale: 1.05 }} animate={{ scale: 1 }} className="num text-3xl font-extrabold text-zinc-900 mb-4">{fmtRs(gross)}</motion.p>
          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between items-baseline p-3 rounded-xl bg-sky-50">
              <span className="font-bold text-sky-800">{t('buyerOwes')}</span>
              <span className="num text-lg font-extrabold text-sky-700">{fmtRs(buyerOwes)}</span>
            </div>
            <div className="flex justify-between items-baseline p-3 rounded-xl bg-emerald-50">
              <span className="font-bold text-emerald-800">{t('sellerReceives')}</span>
              <span className="num text-lg font-extrabold text-emerald-700">{fmtRs(sellerReceives)}</span>
            </div>
            {isOwner && (
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setShowIncome(!showIncome)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer">
                  {t('shopIncome')} <CaretDown size={14} className={`transition-transform ${showIncome ? 'rotate-180' : ''}`} />
                </button>
                {showIncome && (
                  <div className="px-3 pb-3 text-xs flex flex-col gap-1.5">
                    <div className="flex justify-between"><span>{t('sellerCommission')}</span><span className="num font-bold">{fmtRs(sellerComm)}</span></div>
                    <div className="flex justify-between"><span>{t('buyerCommission')}</span><span className="num font-bold">{fmtRs(buyerComm)}</span></div>
                    <div className="flex justify-between"><span>{t('retainedCharges')}</span><span className="num font-bold">{fmtRs(retained)}</span></div>
                    <div className="flex justify-between border-t border-zinc-200 pt-1.5 text-sm">
                      <b>{t('total')}</b><b className="num text-amber-600">{fmtRs(shopIncome)}</b>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 mt-5">
            <Button className="h-11" onClick={() => doSave(true)}>{t('saveAndPrint')}</Button>
            <Button variant="secondary" onClick={() => doSave(false)}>{t('save')}</Button>
          </div>
        </Card>
      </div>

      {/* daily commission deals — with partial cash / print / delete */}
      <TxnList types={['commission']} onReprint={onReprint} onSaved={onSaved} />
    </motion.div>
  );
}
