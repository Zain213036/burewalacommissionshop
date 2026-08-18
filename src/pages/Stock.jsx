import React from 'react';
import { motion } from 'framer-motion';
import { Package, Warning } from '@phosphor-icons/react';
import { useStore } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs, fmtWeight, fmtDate, MANN_KG } from '../lib/format';
import { Card, EmptyState, Badge } from '../components/ui';

export function Stock() {
  const { db, lang, user } = useStore();
  const t = makeT(lang);
  const isOwner = user?.role === 'owner';

  const products = db.products.filter((p) => p.isActive);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className={`text-2xl font-extrabold tracking-tight mb-5 ${lang === 'ur' ? 'font-urdu leading-[1.8]' : ''}`}>{t('stock')}</h1>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {products.map((p) => {
          const st = db.productStats[p.id] || { qtyKg: 0, avgCostPerMann: 0 };
          const neg = st.qtyKg < 0;
          const valuation = Math.round((st.qtyKg / MANN_KG) * st.avgCostPerMann);
          return (
            <motion.div key={p.id} whileHover={{ y: -3 }}>
              <Card className={`p-5 ${neg ? 'border-rose-300 bg-rose-50/40' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-extrabold text-zinc-800">{lang === 'ur' ? p.nameUr : p.nameEn}</p>
                    <p className={`text-sm text-zinc-400 ${lang === 'ur' ? '' : 'font-urdu'}`}>{lang === 'ur' ? p.nameEn : p.nameUr}</p>
                  </div>
                  {neg && <Badge tone="red"><Warning size={12} className="me-1" />{t('negativeStock')}</Badge>}
                </div>
                <p className={`num text-2xl font-extrabold ${neg ? 'text-rose-600' : 'text-zinc-900'}`}>{fmtWeight(st.qtyKg, t)}</p>
                {isOwner && (
                  <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-between text-sm">
                    <span className="text-zinc-400">{t('valuation')}</span>
                    <span className="num font-bold text-zinc-700">{fmtRs(Math.max(0, valuation))}</span>
                  </div>
                )}
                {isOwner && st.avgCostPerMann > 0 && (
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-zinc-400">{t('avgCost')}</span>
                    <span className="num font-semibold text-zinc-500">{fmtRs(st.avgCostPerMann)}</span>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 font-bold text-sm text-zinc-600">{t('lastTransactions')}</div>
        {db.stockMoves.length === 0 ? (
          <EmptyState icon={Package} title={t('noEntries')} hint={t('noEntriesHint')} />
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {[...db.stockMoves].sort((a, b) => b.createdAt - a.createdAt).slice(0, 30).map((m) => {
                const p = db.products.find((x) => x.id === m.productId);
                const txn = db.transactions.find((x) => x.id === m.txnId);
                return (
                  <tr key={m.id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-4 py-2.5 num text-zinc-400 w-28">{fmtDate(m.date)}</td>
                    <td className="px-4 py-2.5 num font-bold text-zinc-600 w-24">{txn?.voucherNo}</td>
                    <td className="px-4 py-2.5 font-semibold">{lang === 'ur' ? p?.nameUr : p?.nameEn}</td>
                    <td className={`px-4 py-2.5 num text-end font-extrabold ${m.deltaKg >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.deltaKg >= 0 ? '+' : '−'} {fmtWeight(Math.abs(m.deltaKg), t)}
                    </td>
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
