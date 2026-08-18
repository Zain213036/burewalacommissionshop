import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Printer, MagnifyingGlass, FilePdf, FileXls, PencilSimple, Trash,
  Notebook, ArrowCircleDown, ArrowCircleUp, HandCoins, Package, ChartLineUp, Files, BookOpenText,
} from '@phosphor-icons/react';
import { useStore, allBalances, daySummary, outstandingAdvances, retainedChargesIncome, commissionIncomeOf } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs, fmtDate, fmtDateTime, fmtWeight, todayStr, MANN_KG } from '../lib/format';
import { Card, Button, Badge, EmptyState, Input, inputCls, IconBtn } from '../components/ui';
import { PartyPicker } from '../components/PartyPicker';
import { exportExcel } from '../lib/export';

export function Reports({ onPrintRoznamcha, onReprint, onPrintTable, onEditTxn }) {
  const { db, lang, user, api } = useStore();
  const t = makeT(lang);
  const isOwner = user?.role === 'owner';
  const [tab, setTab] = useState('roznamcha');
  const [date, setDate] = useState(todayStr());
  const [from, setFrom] = useState(todayStr().slice(0, 8) + '01');
  const [to, setTo] = useState(todayStr());
  const [vq, setVq] = useState('');
  // ledger tab
  const [ledgerPartyId, setLedgerPartyId] = useState(null);
  const [lFrom, setLFrom] = useState(todayStr().slice(0, 8) + '01');
  const [lTo, setLTo] = useState(todayStr());

  const tabs = [
    { id: 'roznamcha', key: 'roznamcha', icon: Notebook },
    { id: 'ledger', key: 'ledgerTab', icon: BookOpenText },
    { id: 'receivables', key: 'receivablesReport', icon: ArrowCircleDown },
    { id: 'payables', key: 'payablesReport', icon: ArrowCircleUp },
    { id: 'advances', key: 'advancesReport', icon: HandCoins },
    { id: 'stockR', key: 'stockReport', icon: Package },
    ...(isOwner ? [{ id: 'profit', key: 'profitReport', icon: ChartLineUp }] : []),
    { id: 'vouchers', key: 'allVouchers', icon: Files },
  ];

  const balances = allBalances(db);
  const partyRows = (positive) => db.parties
    .map((p) => ({ p, bal: balances[p.id] || 0 }))
    .filter((r) => (positive ? r.bal > 0 : r.bal < 0))
    .sort((a, b) => Math.abs(b.bal) - Math.abs(a.bal));

  const lastDebitAge = (partyId) => {
    const ls = db.ledger.filter((l) => l.partyId === partyId && l.debit > 0);
    if (!ls.length) return 0;
    return Math.floor((Date.now() - new Date(ls[ls.length - 1].date).getTime()) / 86400000);
  };

  const rangeTxns = useMemo(() => db.transactions.filter((x) =>
    x.status === 'active' && x.businessDate >= from && x.businessDate <= to), [db.transactions, from, to]);

  const profit = useMemo(() => {
    const sales = rangeTxns.filter((x) => x.type === 'sale');
    const comms = rangeTxns.filter((x) => x.type === 'commission');
    const exps = rangeTxns.filter((x) => x.type === 'expense');
    const margin = sales.reduce((s, x) => s + (x.netAmount || 0) - (x.costSnapshot || 0), 0);
    const commission = comms.reduce((s, x) => s + commissionIncomeOf(x), 0);
    const charges = rangeTxns.reduce((s, x) => s + retainedChargesIncome(x), 0);
    const expenses = exps.reduce((s, x) => s + (x.netAmount || 0), 0);
    return { margin, commission, charges, expenses, net: margin + commission + charges - expenses };
  }, [rangeTxns]);

  const vouchers = useMemo(() => {
    const needle = vq.trim().toLowerCase();
    return [...db.transactions].sort((a, b) => b.createdAt - a.createdAt)
      .filter((x) => {
        if (!needle) return true;
        const pn = db.parties.find((p) => [x.partyId, x.sellerId, x.buyerId].includes(p.id))?.name || '';
        return (x.voucherNo || '').toLowerCase().includes(needle) || pn.toLowerCase().includes(needle) || (x.businessDate || '').includes(needle);
      }).slice(0, 100);
  }, [db.transactions, db.parties, vq]);

  // ledger rows: opening balance before lFrom, then running balance through the range
  const ledger = useMemo(() => {
    if (!ledgerPartyId) return null;
    const all = db.ledger.filter((l) => l.partyId === ledgerPartyId).sort((a, b) => a.createdAt - b.createdAt);
    const opening = all.filter((l) => l.date < lFrom).reduce((s, l) => s + (l.debit || 0) - (l.credit || 0), 0);
    let run = opening;
    const rows = all.filter((l) => l.date >= lFrom && l.date <= lTo)
      .map((l) => { run += (l.debit || 0) - (l.credit || 0); return { ...l, run }; });
    return { opening, rows, closing: run };
  }, [db.ledger, ledgerPartyId, lFrom, lTo]);

  const ledgerParty = db.parties.find((p) => p.id === ledgerPartyId);
  const s = daySummary(db, date);
  const AgingBadge = ({ d }) => (
    <Badge tone={d <= 15 ? 'green' : d <= 30 ? 'gold' : 'red'}>{d} {t('days')}</Badge>
  );
  const typeLabel = (x) => t(
    x.type === 'commission' ? 'commissionDeals' : x.type === 'receipt' ? 'receipts'
      : x.type === 'payment' ? 'payments' : x.type === 'expense' ? 'expenses'
        : x.type === 'advance' ? 'advances' : x.type === 'advanceRecovery' ? 'advancesRecovered'
          : x.type === 'purchase' ? 'purchases' : 'sales');

  // One data builder feeds Print, PDF and Excel — so all three always match the screen.
  const buildTable = () => {
    if (tab === 'roznamcha') {
      return {
        title: { en: 'ROZNAMCHA (DAY BOOK)', ur: 'روزنامچہ' }, subtitle: fmtDate(date),
        columns: [
          { en: 'Voucher', ur: 'واؤچر' }, { en: 'Time', ur: 'وقت' }, { en: 'Type', ur: 'قسم' },
          { en: 'Party', ur: 'پارٹی' }, { en: 'Rs.', ur: 'روپے', align: 'end' },
        ],
        rows: s.txns.map((x) => [
          x.voucherNo, fmtDateTime(x.createdAt).split(' ').slice(1).join(' '), x.type,
          db.parties.find((p) => [x.partyId, x.sellerId, x.buyerId].includes(p.id))?.name || '—',
          fmtRs(x.netAmount || x.grossAmount || 0),
        ]),
        filename: `roznamcha-${date}`,
      };
    }
    if (tab === 'ledger' && ledger && ledgerParty) {
      return {
        title: { en: 'LEDGER (KHATA)', ur: 'کھاتہ' },
        subtitle: `${ledgerParty.name} — ${fmtDate(lFrom)} ${t('to')} ${fmtDate(lTo)}`,
        columns: [
          { en: 'Date', ur: 'تاریخ' }, { en: 'Description', ur: 'تفصیل' },
          { en: 'Debit (Lena)', ur: 'لینا', align: 'end' }, { en: 'Credit (Dena)', ur: 'دینا', align: 'end' },
          { en: 'Balance', ur: 'بقایا', align: 'end' },
        ],
        rows: [
          ['', `${t('openingBalanceRow')} / ابتدائی بقایا`, '', '', fmtRs(Math.abs(ledger.opening)) + (ledger.opening >= 0 ? ' L' : ' D')],
          ...ledger.rows.map((l) => [
            fmtDate(l.date), lang === 'ur' ? l.descUr : l.descEn,
            l.debit ? fmtRs(l.debit) : '', l.credit ? fmtRs(l.credit) : '',
            fmtRs(Math.abs(l.run)) + (l.run >= 0 ? ' L' : ' D'),
          ]),
        ],
        footer: ['', `${t('closingBalanceRow')} / اختتامی بقایا`, '', '', fmtRs(Math.abs(ledger.closing)) + (ledger.closing >= 0 ? ' (Lena)' : ' (Dena)')],
        filename: `khata-${ledgerParty.name.replace(/\s+/g, '-')}-${lFrom}-${lTo}`,
      };
    }
    if (tab === 'receivables' || tab === 'payables') {
      const data = partyRows(tab === 'receivables');
      return {
        title: tab === 'receivables'
          ? { en: 'RECEIVABLES (LENA)', ur: 'لینے والی رقمیں' }
          : { en: 'PAYABLES (DENA)', ur: 'دینے والی رقمیں' },
        subtitle: fmtDate(todayStr()),
        columns: [
          { en: 'Party', ur: 'پارٹی' }, { en: 'Village', ur: 'گاؤں' }, { en: 'Phone', ur: 'فون' },
          { en: 'Days', ur: 'دن', align: 'end' }, { en: 'Rs.', ur: 'روپے', align: 'end' },
        ],
        rows: data.map(({ p, bal }) => [p.name, p.village || '', p.phone || '', lastDebitAge(p.id), fmtRs(Math.abs(bal))]),
        footer: ['Total / کل', '', '', '', fmtRs(data.reduce((sm, r) => sm + Math.abs(r.bal), 0))],
        filename: `${tab}-${todayStr()}`,
      };
    }
    if (tab === 'advances') {
      const list = outstandingAdvances(db);
      return {
        title: { en: 'OUTSTANDING ADVANCES (PESHGI)', ur: 'بقایا پیشگیاں' }, subtitle: fmtDate(todayStr()),
        columns: [
          { en: 'Voucher', ur: 'واؤچر' }, { en: 'Party', ur: 'پارٹی' }, { en: 'Date', ur: 'تاریخ' },
          { en: 'Principal', ur: 'اصل رقم', align: 'end' }, { en: 'Recovered', ur: 'واپس ہوئی', align: 'end' },
          { en: 'Outstanding', ur: 'بقایا', align: 'end' },
        ],
        rows: list.map((a) => [
          a.voucherNo, db.parties.find((p) => p.id === a.partyId)?.name || '', fmtDate(a.businessDate),
          fmtRs((a.principal || 0) + (a.extra || 0)), fmtRs(a.recovered || 0),
          fmtRs((a.principal || 0) + (a.extra || 0) - (a.recovered || 0)),
        ]),
        footer: ['', 'Total / کل', '', '', '', fmtRs(list.reduce((sm, a) => sm + (a.principal || 0) + (a.extra || 0) - (a.recovered || 0), 0))],
        filename: `advances-${todayStr()}`,
      };
    }
    if (tab === 'stockR') {
      const prods = db.products.filter((p) => p.isActive);
      return {
        title: { en: 'STOCK REPORT', ur: 'سٹاک رپورٹ' }, subtitle: fmtDate(todayStr()),
        columns: [
          { en: 'Product', ur: 'جنس' }, { en: 'Quantity', ur: 'مقدار', align: 'end' },
          ...(isOwner ? [{ en: 'Valuation Rs.', ur: 'مالیت', align: 'end' }] : []),
        ],
        rows: prods.map((p) => {
          const st = db.productStats[p.id] || { qtyKg: 0, avgCostPerMann: 0 };
          const base = [`${p.nameEn} / ${p.nameUr}`, fmtWeight(st.qtyKg)];
          return isOwner ? [...base, fmtRs(Math.max(0, Math.round((st.qtyKg / MANN_KG) * st.avgCostPerMann)))] : base;
        }),
        filename: `stock-${todayStr()}`,
      };
    }
    if (tab === 'profit') {
      return {
        title: { en: 'PROFIT REPORT (OWNER ONLY)', ur: 'منافع رپورٹ (صرف مالک)' },
        subtitle: `${fmtDate(from)} — ${fmtDate(to)}`,
        columns: [{ en: 'Item', ur: 'مد' }, { en: 'Rs.', ur: 'روپے', align: 'end' }],
        rows: [
          ['Trading margin / تجارتی منافع', fmtRs(profit.margin)],
          ['Commission income / کمیشن آمدنی', fmtRs(profit.commission)],
          ['Retained charges / دکان کی کٹوتیاں', fmtRs(profit.charges)],
          ['Expenses / اخراجات', '− ' + fmtRs(profit.expenses)],
        ],
        footer: ['Net Profit / خالص منافع', fmtRs(profit.net)],
        filename: `profit-${from}-to-${to}`,
      };
    }
    if (tab === 'vouchers') {
      return {
        title: { en: 'VOUCHER LIST', ur: 'واؤچر فہرست' }, subtitle: fmtDate(todayStr()),
        columns: [
          { en: 'Voucher', ur: 'واؤچر' }, { en: 'Date', ur: 'تاریخ' }, { en: 'Type', ur: 'قسم' },
          { en: 'Party', ur: 'پارٹی' }, { en: 'Status', ur: 'حالت' }, { en: 'Rs.', ur: 'روپے', align: 'end' },
        ],
        rows: vouchers.map((x) => [
          x.voucherNo, fmtDate(x.businessDate), x.type,
          db.parties.find((p) => [x.partyId, x.sellerId, x.buyerId].includes(p.id))?.name || '—',
          x.status === 'voided' ? 'VOID' : 'OK',
          fmtRs(x.netAmount || x.grossAmount || 0),
        ]),
        filename: `vouchers-${todayStr()}`,
      };
    }
    return null;
  };

  const doExcel = () => {
    const tbl = buildTable();
    if (!tbl) return;
    exportExcel(`${tbl.filename}.xlsx`, [{
      name: tbl.title.en.slice(0, 28),
      rows: [tbl.columns.map((c) => `${c.en} / ${c.ur}`), ...tbl.rows, ...(tbl.footer ? [tbl.footer] : [])],
    }]);
  };
  const doPdf = () => {
    if (tab === 'roznamcha') { onPrintRoznamcha(date, s, 'pdf'); return; }
    const tbl = buildTable();
    if (tbl) onPrintTable(tbl, 'pdf');
  };
  const doPrint = () => {
    if (tab === 'roznamcha') { onPrintRoznamcha(date, s); return; }
    const tbl = buildTable();
    if (tbl) onPrintTable(tbl);
  };

  const exportDisabled = tab === 'ledger' && !ledgerPartyId;
  const canModify = (x) => isOwner || x.businessDate === todayStr();

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className={`text-2xl font-extrabold tracking-tight ${lang === 'ur' ? 'font-urdu leading-[1.8]' : ''}`}>{t('reports')}</h1>
          <p className={`text-sm text-zinc-400 mt-0.5 ${lang === 'ur' ? 'font-urdu-naskh' : ''}`}>{t('reportsHint')}</p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="secondary" onClick={doPrint} disabled={exportDisabled}><Printer size={15} /> {t('print')}</Button>
          <Button variant="secondary" onClick={doPdf} disabled={exportDisabled}><FilePdf size={15} /> {t('pdf')}</Button>
          <Button variant="gold" onClick={doExcel} disabled={exportDisabled}><FileXls size={15} /> {t('excel')}</Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {tabs.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors
              ${tab === tb.id ? 'bg-brand-800 text-white shadow-sm' : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'}
              ${lang === 'ur' ? 'font-urdu-naskh' : ''}`}>
            <tb.icon size={16} weight={tab === tb.id ? 'fill' : 'regular'} />
            {t(tb.key)}
          </button>
        ))}
      </div>

      {/* ---- ROZNAMCHA ---- */}
      {tab === 'roznamcha' && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <Input type="date" className="num !w-44" value={date} max={todayStr()} onChange={(e) => e.target.value && setDate(e.target.value)} />
            <div className="ms-auto flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span className="text-zinc-500">{t('cashIn')}: <b className="num text-emerald-600">{fmtRs(s.cash.cashIn)}</b></span>
              <span className="text-zinc-500">{t('cashOut')}: <b className="num text-rose-600">{fmtRs(s.cash.cashOut)}</b></span>
              <span className="text-zinc-500">{t('cashInHand')}: <b className="num text-sky-700">{fmtRs(s.cash.inHand)}</b></span>
            </div>
          </div>
          {s.txns.length === 0 ? <EmptyState icon={Notebook} title={t('noEntries')} hint={t('noEntriesHint')} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <tbody>
                  {s.txns.map((x) => {
                    const pn = db.parties.find((p) => [x.partyId, x.sellerId, x.buyerId].includes(p.id))?.name || '—';
                    return (
                      <tr key={x.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                        <td className="px-4 py-2.5 num font-bold text-zinc-700 w-24">{x.voucherNo}</td>
                        <td className="px-4 py-2.5 num text-xs text-zinc-400 w-28">{fmtDateTime(x.createdAt).split(' ').slice(1).join(' ')}</td>
                        <td className="px-4 py-2.5"><Badge tone="zinc">{typeLabel(x)}</Badge></td>
                        <td className="px-4 py-2.5 font-semibold">{pn}</td>
                        <td className="px-4 py-2.5 num text-end font-bold">{fmtRs(x.netAmount || x.grossAmount || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ---- LEDGER (KHATA) ---- */}
      {tab === 'ledger' && (
        <Card className="overflow-hidden">
          <div className="grid sm:grid-cols-[1fr_170px_170px] gap-3 px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <PartyPicker value={ledgerPartyId} onChange={setLedgerPartyId} />
            <Input type="date" className="num" value={lFrom} onChange={(e) => e.target.value && setLFrom(e.target.value)} />
            <Input type="date" className="num" value={lTo} max={todayStr()} onChange={(e) => e.target.value && setLTo(e.target.value)} />
          </div>
          {!ledgerPartyId ? (
            <EmptyState icon={BookOpenText} title={t('selectPartyFirst')} />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-zinc-100">
                <div>
                  <p className="font-extrabold text-zinc-800">{ledgerParty?.name}
                    {ledgerParty?.fatherName && <span className="text-xs text-zinc-400 font-semibold ms-2">s/o {ledgerParty.fatherName}</span>}
                  </p>
                  <p className="text-xs text-zinc-400">{[ledgerParty?.village, ledgerParty?.phone].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="flex gap-5 text-sm">
                  <span className="text-zinc-500">{t('openingBalanceRow')}:{' '}
                    <b className={`num ${ledger.opening >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtRs(Math.abs(ledger.opening))}</b></span>
                  <span className="text-zinc-500">{t('closingBalanceRow')}:{' '}
                    <b className={`num text-base ${ledger.closing >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {fmtRs(Math.abs(ledger.closing))} {ledger.closing >= 0 ? '(L)' : '(D)'}
                    </b></span>
                </div>
              </div>
              {ledger.rows.length === 0 ? <EmptyState title={t('noEntries')} /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[680px]">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
                        <th className="text-start font-bold px-4 py-2.5">{t('date')}</th>
                        <th className="text-start font-bold px-4 py-2.5">{t('description')}</th>
                        <th className="text-end font-bold px-4 py-2.5">{t('debit')}</th>
                        <th className="text-end font-bold px-4 py-2.5">{t('credit')}</th>
                        <th className="text-end font-bold px-4 py-2.5">{t('balance')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.rows.map((l) => (
                        <tr key={l.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                          <td className="px-4 py-2.5 num text-zinc-500 whitespace-nowrap">{fmtDate(l.date)}</td>
                          <td className="px-4 py-2.5">{lang === 'ur' ? l.descUr : l.descEn}</td>
                          <td className="px-4 py-2.5 num text-end font-bold text-emerald-600">{l.debit ? fmtRs(l.debit) : ''}</td>
                          <td className="px-4 py-2.5 num text-end font-bold text-rose-600">{l.credit ? fmtRs(l.credit) : ''}</td>
                          <td className={`px-4 py-2.5 num text-end font-extrabold ${l.run >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {fmtRs(Math.abs(l.run))} {l.run >= 0 ? 'L' : 'D'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* ---- RECEIVABLES / PAYABLES ---- */}
      {(tab === 'receivables' || tab === 'payables') && (
        <Card className="overflow-hidden">
          {partyRows(tab === 'receivables').length === 0 ? <EmptyState title={t('noEntries')} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
                    <th className="text-start font-bold px-4 py-3">{t('party')}</th>
                    <th className="text-start font-bold px-4 py-3">{t('phone')}</th>
                    <th className="text-start font-bold px-4 py-3">{t('aging')}</th>
                    <th className="text-end font-bold px-4 py-3">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {partyRows(tab === 'receivables').map(({ p, bal }) => (
                    <tr key={p.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                      <td className="px-4 py-2.5 font-semibold">{p.name}
                        {p.village && <span className="text-xs text-zinc-400 ms-2">{p.village}</span>}</td>
                      <td className="px-4 py-2.5 num text-zinc-500">{p.phone}</td>
                      <td className="px-4 py-2.5"><AgingBadge d={lastDebitAge(p.id)} /></td>
                      <td className={`px-4 py-2.5 num text-end font-extrabold ${tab === 'receivables' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {fmtRs(Math.abs(bal))}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50">
                    <td colSpan={3} className="px-4 py-3 font-extrabold">{t('total')}</td>
                    <td className={`px-4 py-3 num text-end font-extrabold text-lg ${tab === 'receivables' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {fmtRs(partyRows(tab === 'receivables').reduce((sm, r) => sm + Math.abs(r.bal), 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ---- ADVANCES ---- */}
      {tab === 'advances' && (
        <Card className="overflow-hidden">
          {outstandingAdvances(db).length === 0 ? <EmptyState title={t('noEntries')} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
                    <th className="text-start font-bold px-4 py-3">{t('voucher')}</th>
                    <th className="text-start font-bold px-4 py-3">{t('party')}</th>
                    <th className="text-start font-bold px-4 py-3">{t('date')}</th>
                    <th className="text-end font-bold px-4 py-3">{t('outstanding')}</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingAdvances(db).map((a) => {
                    const out = (a.principal || 0) + (a.extra || 0) - (a.recovered || 0);
                    return (
                      <tr key={a.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                        <td className="px-4 py-2.5 num font-bold text-zinc-700 w-24">{a.voucherNo}</td>
                        <td className="px-4 py-2.5 font-semibold">{db.parties.find((p) => p.id === a.partyId)?.name}</td>
                        <td className="px-4 py-2.5 num text-zinc-400">{fmtDate(a.businessDate)}</td>
                        <td className="px-4 py-2.5 num text-end font-extrabold text-amber-600">{fmtRs(out)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ---- STOCK ---- */}
      {tab === 'stockR' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[460px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
                  <th className="text-start font-bold px-4 py-3">{t('product')}</th>
                  <th className="text-end font-bold px-4 py-3">{t('stockQty')}</th>
                  {isOwner && <th className="text-end font-bold px-4 py-3">{t('valuation')}</th>}
                </tr>
              </thead>
              <tbody>
                {db.products.filter((p) => p.isActive).map((p) => {
                  const st = db.productStats[p.id] || { qtyKg: 0, avgCostPerMann: 0 };
                  return (
                    <tr key={p.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                      <td className="px-4 py-2.5 font-semibold">{lang === 'ur' ? p.nameUr : p.nameEn}</td>
                      <td className={`px-4 py-2.5 num text-end font-bold ${st.qtyKg < 0 ? 'text-rose-600' : ''}`}>{fmtWeight(st.qtyKg, t)}</td>
                      {isOwner && <td className="px-4 py-2.5 num text-end font-bold">{fmtRs(Math.max(0, Math.round((st.qtyKg / MANN_KG) * st.avgCostPerMann)))}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ---- PROFIT (owner) ---- */}
      {tab === 'profit' && isOwner && (
        <div className="grid lg:grid-cols-[380px_1fr] gap-5 items-start">
          <Card className="p-5">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div><p className="text-xs font-bold text-zinc-400 mb-1">{t('from')}</p>
                <Input type="date" className="num" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><p className="text-xs font-bold text-zinc-400 mb-1">{t('to')}</p>
                <Input type="date" className="num" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
            <div className="flex flex-col gap-2.5 text-sm">
              {[
                [t('tradingMargin'), profit.margin],
                [t('commissionIncome'), profit.commission],
                [t('retainedCharges'), profit.charges],
                [t('lessExpenses'), -profit.expenses],
              ].map(([label, v], i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-zinc-500">{label}</span>
                  <span className={`num font-bold ${v < 0 ? 'text-rose-600' : 'text-zinc-800'}`}>{fmtRs(v)}</span>
                </div>
              ))}
              <div className="border-t border-zinc-200 pt-2.5 flex justify-between items-baseline">
                <b>{t('netProfit')}</b>
                <b className={`num text-2xl ${profit.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtRs(profit.net)}</b>
              </div>
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 font-bold text-sm text-zinc-600">{t('sales')} — {t('margin')}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <tbody>
                  {rangeTxns.filter((x) => x.type === 'sale').map((x) => (
                    <tr key={x.id} className="border-b border-zinc-50 last:border-0">
                      <td className="px-4 py-2.5 num font-bold text-zinc-600 w-24">{x.voucherNo}</td>
                      <td className="px-4 py-2.5 num text-zinc-400">{fmtDate(x.businessDate)}</td>
                      <td className="px-4 py-2.5 num text-end">{fmtRs(x.netAmount)}</td>
                      <td className="px-4 py-2.5 num text-end text-zinc-400">− {fmtRs(x.costSnapshot || 0)}</td>
                      <td className={`px-4 py-2.5 num text-end font-extrabold ${(x.netAmount - (x.costSnapshot || 0)) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {fmtRs(x.netAmount - (x.costSnapshot || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ---- ALL VOUCHERS ---- */}
      {tab === 'vouchers' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-zinc-100 relative">
            <MagnifyingGlass size={16} className="absolute start-7 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input className={`${inputCls} ps-9`} placeholder="P-0001, party name, 2026-07…" value={vq} onChange={(e) => setVq(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
                  <th className="text-start font-bold px-4 py-3">{t('voucher')}</th>
                  <th className="text-start font-bold px-4 py-3">{t('date')}</th>
                  <th className="text-start font-bold px-4 py-3">{t('party')}</th>
                  <th className="text-end font-bold px-4 py-3">{t('amount')}</th>
                  <th className="text-end font-bold px-4 py-3">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((x) => {
                  const pn = db.parties.find((p) => [x.partyId, x.sellerId, x.buyerId].includes(p.id))?.name || '—';
                  const voided = x.status === 'voided';
                  return (
                    <tr key={x.id} className={`border-b border-zinc-50 last:border-0 ${voided ? 'opacity-40' : 'hover:bg-zinc-50/60'}`}>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="num font-bold text-zinc-700">{x.voucherNo}</span>
                        <Badge tone="zinc">{typeLabel(x)}</Badge>
                      </td>
                      <td className="px-4 py-2.5 num text-xs text-zinc-400 whitespace-nowrap">{fmtDateTime(x.createdAt)}</td>
                      <td className="px-4 py-2.5 font-semibold">{pn}
                        {voided && <Badge tone="red">{t('voided')}</Badge>}</td>
                      <td className="px-4 py-2.5 num text-end font-bold whitespace-nowrap">{fmtRs(x.netAmount || x.grossAmount || 0)}</td>
                      <td className="px-3 py-2.5 text-end whitespace-nowrap">
                        <div className="inline-flex gap-1.5">
                          {!voided && ['purchase', 'sale'].includes(x.type) && canModify(x) && (
                            <IconBtn icon={PencilSimple} tone="amber" label={t('edit')} onClick={() => onEditTxn(x)} />
                          )}
                          {!voided && x.type !== 'expense' && (
                            <>
                              <IconBtn icon={Printer} tone="brand" label={t('print')} onClick={() => onReprint(x)} />
                              <IconBtn icon={FilePdf} tone="zinc" label={t('downloadPdf')} onClick={() => onReprint(x, 'pdf')} />
                            </>
                          )}
                          {!voided && canModify(x) && (
                            <IconBtn icon={Trash} tone="red" label={t('delete')}
                              onClick={() => { if (confirm(`${t('confirmDeleteEntry')} (${x.voucherNo})`)) api.voidTransaction(x.id, 'deleted'); }} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </motion.div>
  );
}
