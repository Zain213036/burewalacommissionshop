import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CaretLeft, CaretRight, Printer, ShoppingCart, Tag, Handshake, Receipt, Wallet, HandCoins, Warning, FilePdf, FileXls } from '@phosphor-icons/react';
import { exportExcel } from '../lib/export';
import { useStore, daySummary } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs, fmtWeight, fmtDate, fmtDateTime, todayStr, dayName } from '../lib/format';
import { Card, Button } from '../components/ui';

const stagger = { visible: { transition: { staggerChildren: 0.05 } }, hidden: {} };
const fadeUp = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 24 } } };

function shiftDate(iso, days) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA');
}

export function Dashboard({ setPage, onPrintRoznamcha }) {
  const { db, user, lang } = useStore();
  const t = makeT(lang);
  const [date, setDate] = useState(todayStr());
  const s = daySummary(db, date);
  const isOwner = user?.role === 'owner';
  const isToday = date === todayStr();

  const tiles = [
    { id: 'purchases', icon: ShoppingCart, key: 'purchases', page: 'purchase', d: s.tiles.purchases, qty: true, tone: 'text-brand-700 bg-brand-50' },
    { id: 'sales', icon: Tag, key: 'sales', page: 'sale', d: s.tiles.sales, qty: true, tone: 'text-sky-700 bg-sky-50' },
    { id: 'commissions', icon: Handshake, key: 'commissionDeals', page: 'commission', d: s.tiles.commissions, qty: true, tone: 'text-amber-700 bg-amber-50' },
    { id: 'receipts', icon: Receipt, key: 'receipts', page: 'receipts', d: s.tiles.receipts, tone: 'text-emerald-700 bg-emerald-50' },
    { id: 'payments', icon: Receipt, key: 'payments', page: 'receipts', d: s.tiles.payments, tone: 'text-rose-700 bg-rose-50' },
    { id: 'expenses', icon: Wallet, key: 'expenses', page: 'expenses', d: s.tiles.expenses, tone: 'text-zinc-600 bg-zinc-100' },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col gap-5">
      {/* Header row */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-extrabold tracking-tight text-zinc-900 ${lang === 'ur' ? 'font-urdu leading-[1.8]' : ''}`}>
            {t('todayOverview')}
          </h1>
          <p className="text-sm text-zinc-400 num mt-0.5">
            {dayName(date, lang)}, {fmtDate(date)} {!isToday && <span className="text-amber-600 font-semibold">· {lang === 'ur' ? 'پرانا دن' : 'past day'}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-zinc-200 rounded-xl bg-white overflow-hidden">
            <button onClick={() => setDate(shiftDate(date, -1))} className="p-2.5 hover:bg-zinc-50 cursor-pointer" aria-label="previous day"><CaretLeft size={15} /></button>
            <input type="date" value={date} max={todayStr()} onChange={(e) => e.target.value && setDate(e.target.value)}
              className="num text-sm font-semibold px-1 py-2 outline-none w-[130px] text-center" />
            <button onClick={() => setDate(shiftDate(date, 1))} disabled={isToday}
              className="p-2.5 hover:bg-zinc-50 cursor-pointer disabled:opacity-30" aria-label="next day"><CaretRight size={15} /></button>
          </div>
          {!isToday && <Button variant="secondary" onClick={() => setDate(todayStr())}>{t('today')}</Button>}
          <Button variant="secondary" onClick={() => onPrintRoznamcha(date, s, 'pdf')} title={t('downloadPdf')}><FilePdf size={16} /> {t('pdf')}</Button>
          <Button variant="secondary" title={t('downloadExcel')} onClick={() => exportExcel(`roznamcha-${date}.xlsx`, [{
            name: 'Roznamcha',
            rows: [
              ['Voucher / واؤچر', 'Time / وقت', 'Type / قسم', 'Party / پارٹی', 'Rs. / روپے'],
              ...s.txns.map((x) => [
                x.voucherNo, fmtDateTime(x.createdAt).split(' ').slice(1).join(' '), x.type,
                db.parties.find((p) => [x.partyId, x.sellerId, x.buyerId].includes(p.id))?.name || '—',
                x.netAmount || x.grossAmount || 0,
              ]),
              [], ['Opening Cash / صبح کی نقدی', '', '', '', s.cash.opening],
              ['Cash In / آمد', '', '', '', s.cash.cashIn],
              ['Cash Out / اخراج', '', '', '', s.cash.cashOut],
              ['Closing / موجودہ نقدی', '', '', '', s.cash.inHand],
            ],
          }])}><FileXls size={16} /> {t('excel')}</Button>
          <Button variant="gold" onClick={() => onPrintRoznamcha(date, s)}><Printer size={16} /> {t('printRoznamcha')}</Button>
        </div>
      </motion.div>

      {/* SECTION 1 — Cash position strip */}
      <motion.div variants={fadeUp}>
        <Card className="grid grid-cols-2 md:grid-cols-5 divide-x divide-zinc-100 overflow-hidden">
          {[
            { k: 'openingCash', v: s.cash.opening, cls: 'text-zinc-700' },
            { k: 'cashIn', v: s.cash.cashIn, cls: 'text-emerald-600', sign: '+' },
            { k: 'cashOut', v: s.cash.cashOut, cls: 'text-rose-600', sign: '−' },
            { k: 'cashInHand', v: s.cash.inHand, cls: 'text-sky-700', big: true },
            { k: 'bank', v: s.cash.bank, cls: 'text-zinc-700' },
          ].map((c) => (
            <div key={c.k} className={`px-4 py-4 ${c.big ? 'bg-sky-50/50' : ''}`}>
              <p className={`text-[11px] uppercase tracking-wide font-bold text-zinc-400 ${lang === 'ur' ? 'font-urdu-naskh normal-case text-[13px]' : ''}`}>{t(c.k)}</p>
              <p className={`num font-extrabold mt-1 ${c.cls} ${c.big ? 'text-2xl' : 'text-lg'}`}>
                {c.sign || ''} {fmtRs(c.v)}
              </p>
            </div>
          ))}
        </Card>
      </motion.div>

      {/* SECTION 2 — Activity grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {tiles.map((tile) => (
          <motion.button key={tile.id} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
            onClick={() => setPage(tile.page)}
            className="text-start bg-white border border-zinc-200/70 rounded-2xl p-4 cursor-pointer hover:shadow-[0_12px_30px_-15px_rgba(6,78,59,0.25)] transition-shadow">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${tile.tone}`}>
              <tile.icon size={18} weight="fill" />
            </div>
            <p className={`text-xs font-bold text-zinc-500 ${lang === 'ur' ? 'font-urdu-naskh text-[13px]' : ''}`}>{t(tile.key)}</p>
            <p className="num text-lg font-extrabold text-zinc-900 mt-0.5">{fmtRs(tile.d.rs)}</p>
            <p className="text-[11px] text-zinc-400 num mt-0.5">
              {tile.d.count} {lang === 'ur' ? 'اندراج' : 'entries'}{tile.qty ? ` · ${fmtWeight(tile.d.kg, t)}` : ''}
            </p>
          </motion.button>
        ))}
      </motion.div>

      {/* Advances mini-strip */}
      <motion.div variants={fadeUp}>
        <Card className="flex flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3.5">
          <div className={`flex items-center gap-2 text-sm font-bold text-zinc-600 ${lang === 'ur' ? 'font-urdu-naskh' : ''}`}>
            <HandCoins size={18} className="text-amber-600" /> {t('advances')}
          </div>
          <span className="text-sm text-zinc-500">{t('advancesGiven')}: <b className="num text-rose-600">{fmtRs(s.tiles.advances.given)}</b></span>
          <span className="text-sm text-zinc-500">{t('advancesRecovered')}: <b className="num text-emerald-600">{fmtRs(s.tiles.advances.recovered)}</b></span>
        </Card>
      </motion.div>

      {/* SECTION 3 — Udhaar movement */}
      <motion.div variants={fadeUp}>
        <Card className="grid grid-cols-2 md:grid-cols-4 divide-x divide-zinc-100">
          {[
            { k: 'newUdhaar', v: s.udhaar.created, cls: 'text-amber-600' },
            { k: 'udhaarRecovered', v: s.udhaar.recovered, cls: 'text-emerald-600' },
            { k: 'totalReceivables', v: s.udhaar.totalReceivables, cls: 'text-emerald-700' },
            { k: 'totalPayables', v: s.udhaar.totalPayables, cls: 'text-rose-600' },
          ].map((c) => (
            <div key={c.k} className="px-4 py-4">
              <p className={`text-[11px] uppercase tracking-wide font-bold text-zinc-400 ${lang === 'ur' ? 'font-urdu-naskh normal-case text-[13px]' : ''}`}>{t(c.k)}</p>
              <p className={`num text-lg font-extrabold mt-1 ${c.cls}`}>{fmtRs(c.v)}</p>
            </div>
          ))}
        </Card>
      </motion.div>

      {/* SECTION 4 — Owner-only profit strip */}
      {isOwner && (
        <motion.div variants={fadeUp}>
          <div className="rounded-2xl bg-brand-950 text-white p-5 border border-brand-800 shadow-[0_18px_40px_-20px_rgba(2,44,34,0.6)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className={`text-[11px] uppercase tracking-widest font-bold text-brand-300 ${lang === 'ur' ? 'font-urdu-naskh normal-case text-[13px]' : ''}`}>{t('ownerProfitStrip')}</p>
                <p className="num text-3xl font-extrabold mt-1 text-gold-400">{fmtRs(s.profit.net)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  [t('margin'), s.profit.margin, 'bg-white/10'],
                  [t('commission'), s.profit.commission, 'bg-white/10'],
                  [t('chargesIncome'), s.profit.charges, 'bg-white/10'],
                  [t('lessExpenses'), -s.profit.expenses, 'bg-rose-500/20 text-rose-200'],
                ].map(([label, v, cls], i) => (
                  <span key={i} className={`px-3 py-1.5 rounded-full text-xs font-bold ${cls}`}>
                    {label}: <span className="num">{fmtRs(v)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* SECTION 5 — Alerts */}
      {s.negativeStock.length > 0 && (
        <motion.div variants={fadeUp} className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-4 py-3 text-sm font-semibold">
          <Warning size={18} weight="fill" />
          {t('negativeStock')}: {s.negativeStock.map((p) => `${lang === 'ur' ? p.nameUr : p.nameEn} (${fmtWeight(db.productStats[p.id]?.qtyKg || 0, t)})`).join(' · ')}
        </motion.div>
      )}

      {/* Quick actions */}
      <motion.div variants={fadeUp}>
        <p className={`text-sm font-bold text-zinc-500 mb-2 ${lang === 'ur' ? 'font-urdu-naskh' : ''}`}>{t('quickActions')}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPage('purchase')}><ShoppingCart size={16} /> {t('newPurchase')} <kbd className="text-[10px] opacity-60">F2</kbd></Button>
          <Button variant="secondary" onClick={() => setPage('sale')}><Tag size={16} /> {t('newSale')} <kbd className="text-[10px] opacity-60">F3</kbd></Button>
          <Button variant="secondary" onClick={() => setPage('commission')}><Handshake size={16} /> {t('newCommission')} <kbd className="text-[10px] opacity-60">F4</kbd></Button>
          <Button variant="secondary" onClick={() => setPage('receipts')}><Receipt size={16} /> {t('newReceipt')}</Button>
          <Button variant="secondary" onClick={() => setPage('advances')}><HandCoins size={16} /> {t('newAdvance')}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
