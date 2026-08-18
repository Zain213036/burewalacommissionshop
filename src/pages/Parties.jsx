import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MagnifyingGlass, Plus, PencilSimple, Printer, ArrowLeft, WhatsappLogo, UsersThree, FilePdf, FileXls, HandCoins } from '@phosphor-icons/react';
import { exportExcel } from '../lib/export';
import { useStore, partyBalance, outstandingAdvances } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs, fmtDate, fmtDateTime, todayStr } from '../lib/format';
import { Card, Button, Badge, EmptyState, inputCls, Modal, Field, Select, NumInput, IconBtn } from '../components/ui';
import { PartyFormModal } from '../components/PartyPicker';
import { PartialCashModal } from '../components/PartialCashModal';

export function Parties({ onPrintStatement, onSaved }) {
  const { db, lang, user } = useStore();
  const t = makeT(lang);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editP, setEditP] = useState(null);
  const [selected, setSelected] = useState(null);
  const [cashFor, setCashFor] = useState(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return db.parties.filter((p) =>
      !needle || [p.name, p.fatherName, p.village, p.phone].join(' ').toLowerCase().includes(needle));
  }, [db.parties, q]);

  if (selected) {
    const party = db.parties.find((p) => p.id === selected);
    return (
      <>
        <PartyDetail party={party} onBack={() => setSelected(null)} onEdit={() => { setEditP(party); setShowForm(true); }}
          onPrintStatement={onPrintStatement} showForm={showForm} setShowForm={setShowForm} editP={editP}
          onCash={() => setCashFor(party)} />
        <PartialCashModal party={cashFor} onClose={() => setCashFor(null)} onSaved={onSaved} />
      </>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className={`text-2xl font-extrabold tracking-tight ${lang === 'ur' ? 'font-urdu leading-[1.8]' : ''}`}>{t('parties')}</h1>
        <Button onClick={() => { setEditP(null); setShowForm(true); }}><Plus size={16} weight="bold" /> {t('addParty')}</Button>
      </div>
      <div className="relative mb-4">
        <MagnifyingGlass size={17} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input className={`${inputCls} ps-10 h-11`} placeholder={t('searchParties')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {results.length === 0 ? (
        <Card><EmptyState icon={UsersThree} title={t('noEntries')} hint={t('noEntriesHint')} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
                <th className="text-start font-bold px-4 py-3">{t('name')}</th>
                <th className="text-start font-bold px-4 py-3 hidden md:table-cell">{t('village')}</th>
                <th className="text-start font-bold px-4 py-3 hidden md:table-cell">{t('phone')}</th>
                <th className="text-start font-bold px-4 py-3">{t('type')}</th>
                <th className="text-end font-bold px-4 py-3">{t('balance')}</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((p) => {
                const bal = partyBalance(db, p.id);
                return (
                  <tr key={p.id} onClick={() => setSelected(p.id)}
                    className="border-b border-zinc-50 last:border-0 hover:bg-brand-50/40 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-zinc-800">{p.name}</span>
                      {p.fatherName && <span className="text-xs text-zinc-400 block">s/o {p.fatherName}</span>}
                      {!p.isActive && <Badge tone="zinc">{t('inactive')}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">{p.village}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="num text-zinc-500">{p.phone}</span>
                      {p.phone && <WhatsappLogo size={15} className="inline ms-1.5 text-emerald-500" />}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={p.type === 'seller' ? 'green' : p.type === 'buyer' ? 'blue' : p.type === 'shop' ? 'zinc' : 'gold'}>
                        {t(p.type === 'both' ? 'both' : p.type === 'shop' ? 'otherShop' : p.type)}
                      </Badge>
                    </td>
                    <td className={`px-4 py-3 text-end num font-extrabold ${bal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {fmtRs(Math.abs(bal))}
                      <span className="text-[10px] font-bold text-zinc-400 block">{bal >= 0 ? t('theyOweUs') : t('weOweThem')}</span>
                    </td>
                    <td className="px-3 py-3 text-end" onClick={(e) => e.stopPropagation()}>
                      <IconBtn icon={HandCoins} tone="green" label={`${t('receiveCash')} / ${t('payCash')}`}
                        onClick={() => setCashFor(p)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </Card>
      )}
      <PartyFormModal open={showForm} onClose={() => setShowForm(false)} editParty={editP} />
      <PartialCashModal party={cashFor} onClose={() => setCashFor(null)} onSaved={onSaved} />
    </motion.div>
  );
}

function PartyDetail({ party, onBack, onEdit, onPrintStatement, showForm, setShowForm, editP, onCash }) {
  const { db, lang } = useStore();
  const t = makeT(lang);
  if (!party) return null;
  const bal = partyBalance(db, party.id);
  const entries = db.ledger.filter((l) => l.partyId === party.id).sort((a, b) => a.createdAt - b.createdAt);
  const advances = outstandingAdvances(db, party.id);
  const advOut = advances.reduce((s, a) => s + (a.principal || 0) + (a.extra || 0) - (a.recovered || 0), 0);
  const business = db.transactions.filter((tx) => tx.status === 'active' &&
    (tx.partyId === party.id || tx.sellerId === party.id || tx.buyerId === party.id) &&
    ['purchase', 'sale', 'commission'].includes(tx.type))
    .reduce((s, tx) => s + (tx.grossAmount || 0), 0);

  let run = 0;
  const rows = entries.map((l) => { run += (l.debit || 0) - (l.credit || 0); return { ...l, run }; });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-bold text-zinc-400 hover:text-zinc-700 cursor-pointer mb-4">
        <ArrowLeft size={15} /> {t('parties')}
      </button>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{party.name}</h1>
          <p className="text-sm text-zinc-400">
            {[party.fatherName && `s/o ${party.fatherName}`, party.village, party.phone].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onCash}><HandCoins size={15} /> {t('receiveCash')} / {t('payCash')}</Button>
          <Button variant="secondary" onClick={onEdit}><PencilSimple size={15} /> {t('edit')}</Button>
          <Button variant="secondary" onClick={() => onPrintStatement(party, rows, 'pdf')}><FilePdf size={15} /> {t('pdf')}</Button>
          <Button variant="secondary" onClick={() => exportExcel(`khata-${party.name.replace(/\s+/g, '-')}.xlsx`, [{
            name: 'Khata',
            rows: [
              ['Date / تاریخ', 'Description / تفصیل', 'Debit (Lena) / لینا', 'Credit (Dena) / دینا', 'Balance / بقایا'],
              ...rows.map((l) => [fmtDate(l.date), l.descEn, l.debit || '', l.credit || '', `${Math.abs(l.run)} ${l.run >= 0 ? 'Lena' : 'Dena'}`]),
            ],
          }])}><FileXls size={15} /> {t('excel')}</Button>
          <Button variant="gold" onClick={() => onPrintStatement(party, rows)}><Printer size={15} /> {t('printStatement')}</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wide font-bold text-zinc-400">{t('balance')}</p>
          <p className={`num text-2xl font-extrabold mt-1 ${bal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtRs(Math.abs(bal))}</p>
          <p className="text-xs font-bold text-zinc-400">{bal >= 0 ? t('theyOweUs') : t('weOweThem')}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wide font-bold text-zinc-400">{t('totalBusiness')}</p>
          <p className="num text-2xl font-extrabold mt-1 text-zinc-800">{fmtRs(business)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wide font-bold text-zinc-400">{t('outstandingPeshgi')}</p>
          <p className="num text-2xl font-extrabold mt-1 text-amber-600">{fmtRs(advOut)}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 font-bold text-sm text-zinc-600">{t('khata')}</div>
        {rows.length === 0 ? (
          <EmptyState title={t('noEntries')} hint={t('noEntriesHint')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
                  <th className="text-start font-bold px-3 py-2.5">{t('date')}</th>
                  <th className="text-start font-bold px-3 py-2.5">{t('time')}</th>
                  <th className="text-start font-bold px-3 py-2.5">{t('description')}</th>
                  <th className="text-end font-bold px-3 py-2.5">{t('debit')}</th>
                  <th className="text-end font-bold px-3 py-2.5">{t('credit')}</th>
                  <th className="text-end font-bold px-3 py-2.5">{t('balance')}</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((l) => (
                  <tr key={l.id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-3 py-2.5 num text-zinc-500">{fmtDate(l.date)}</td>
                    <td className="px-3 py-2.5 num text-zinc-400 text-xs">{fmtDateTime(l.createdAt).split(' ').slice(1).join(' ')}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-zinc-700">{lang === 'ur' ? l.descUr : l.descEn}</span>
                    </td>
                    <td className="px-3 py-2.5 num text-end font-bold text-emerald-600">{l.debit ? fmtRs(l.debit) : ''}</td>
                    <td className="px-3 py-2.5 num text-end font-bold text-rose-600">{l.credit ? fmtRs(l.credit) : ''}</td>
                    <td className={`px-3 py-2.5 num text-end font-extrabold ${l.run >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {fmtRs(Math.abs(l.run))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <PartyFormModal open={showForm} onClose={() => setShowForm(false)} editParty={editP} />
    </motion.div>
  );
}
