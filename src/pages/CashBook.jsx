import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Book } from '@phosphor-icons/react';
import { useStore, cashBalance } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs, fmtDate, fmtDateTime, todayStr } from '../lib/format';
import { Card, EmptyState, Badge, Input } from '../components/ui';

export function CashBook() {
  const { db, lang } = useStore();
  const t = makeT(lang);
  const [date, setDate] = useState(todayStr());

  const moves = db.cashMoves.filter((m) => m.mode === 'cash' && m.date === date)
    .sort((a, b) => a.createdAt - b.createdAt);

  let opening = Number(db.settings.openingCash) || 0;
  db.cashMoves.forEach((m) => {
    if (m.mode !== 'cash' || m.date >= date) return;
    opening += m.dir === 'in' ? m.amount : -m.amount;
  });

  const txnOf = (id) => db.transactions.find((x) => x.id === id);
  const pname = (id) => db.parties.find((p) => p.id === id)?.name;

  let run = opening;
  const rows = moves.map((m) => { run += m.dir === 'in' ? m.amount : -m.amount; return { ...m, run }; });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className={`text-2xl font-extrabold tracking-tight ${lang === 'ur' ? 'font-urdu leading-[1.8]' : ''}`}>{t('cashBook')}</h1>
        <Input type="date" className="num !w-44" value={date} max={todayStr()} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          [t('opening'), opening, 'text-zinc-700'],
          [t('in'), rows.filter((r) => r.dir === 'in').reduce((s, r) => s + r.amount, 0), 'text-emerald-600'],
          [t('out'), rows.filter((r) => r.dir === 'out').reduce((s, r) => s + r.amount, 0), 'text-rose-600'],
          [t('closing'), run, 'text-sky-700'],
        ].map(([label, v, cls], i) => (
          <Card key={i} className="p-4">
            <p className="text-[11px] uppercase tracking-wide font-bold text-zinc-400">{label}</p>
            <p className={`num text-xl font-extrabold mt-1 ${cls}`}>{fmtRs(v)}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={Book} title={t('noEntries')} hint={t('noEntriesHint')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
                <th className="text-start font-bold px-4 py-3">{t('time')}</th>
                <th className="text-start font-bold px-4 py-3">{t('voucher')}</th>
                <th className="text-start font-bold px-4 py-3">{t('description')}</th>
                <th className="text-end font-bold px-4 py-3">{t('in')}</th>
                <th className="text-end font-bold px-4 py-3">{t('out')}</th>
                <th className="text-end font-bold px-4 py-3">{t('balance')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const tx = txnOf(m.txnId);
                const label = tx ? (pname(tx.partyId) || pname(tx.sellerId) || pname(tx.buyerId) || t(tx.type === 'expense' ? 'expenses' : tx.type)) : '';
                return (
                  <tr key={m.id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-4 py-2.5 num text-zinc-400 text-xs">{fmtDateTime(m.createdAt).split(' ').slice(1).join(' ')}</td>
                    <td className="px-4 py-2.5 num font-bold text-zinc-600">{tx?.voucherNo}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold">{label}</span>
                      {m.reversal && <Badge tone="red">{t('voided')}</Badge>}
                    </td>
                    <td className="px-4 py-2.5 num text-end font-bold text-emerald-600">{m.dir === 'in' ? fmtRs(m.amount) : ''}</td>
                    <td className="px-4 py-2.5 num text-end font-bold text-rose-600">{m.dir === 'out' ? fmtRs(m.amount) : ''}</td>
                    <td className="px-4 py-2.5 num text-end font-extrabold text-zinc-800">{fmtRs(m.run)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </motion.div>
  );
}
