import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Receipt, ArrowDown, ArrowUp, Printer, PencilSimple, Trash, FilePdf } from '@phosphor-icons/react';
import { useStore, findDuplicate } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs, fmtDate, fmtDateTime, todayStr } from '../lib/format';
import { Card, Field, Input, Select, NumInput, Button, EmptyState, Badge, IconBtn } from '../components/ui';
import { PartyPicker } from '../components/PartyPicker';

export function ReceiptsPayments({ onSaved, onReprint }) {
  const { db, lang, api, user } = useStore();
  const t = makeT(lang);
  const [kind, setKind] = useState('receipt');
  const [f, setF] = useState({ businessDate: todayStr(), partyId: null, amount: '', mode: 'cash', note: '' });
  const [err, setErr] = useState('');
  const [editingId, setEditingId] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const canModify = (tx) => user?.role === 'owner' || tx.businessDate === todayStr();
  const startEdit = (tx) => {
    setKind(tx.type);
    setF({ businessDate: tx.businessDate, partyId: tx.partyId, amount: tx.netAmount, mode: tx.mode || 'cash', note: tx.note || '' });
    setEditingId(tx.id);
    setErr('');
  };
  const cancelEdit = () => {
    setEditingId(null);
    setF({ businessDate: todayStr(), partyId: null, amount: '', mode: 'cash', note: '' });
  };
  const doDelete = (tx) => {
    if (window.confirm(`${t('confirmDeleteEntry')} (${tx.voucherNo})`)) {
      api.voidTransaction(tx.id, 'deleted');
      if (editingId === tx.id) cancelEdit();
    }
  };

  const list = db.transactions
    .filter((tx) => ['receipt', 'payment'].includes(tx.type) && tx.status === 'active')
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
  const pname = (id) => db.parties.find((p) => p.id === id)?.name || '—';

  const savingRef = useRef(false);

  const save = (print) => {
    if (savingRef.current) return; // block double-click double entries
    if (!f.partyId || !Number(f.amount)) { setErr(t('required')); return; }
    if (!editingId && findDuplicate(db, { type: kind, partyId: f.partyId, netAmount: Number(f.amount), businessDate: f.businessDate })
      && !window.confirm(t('possibleDuplicate'))) return;
    savingRef.current = true;
    setTimeout(() => { savingRef.current = false; }, 1500);
    const payload = {
      type: kind, businessDate: f.businessDate, partyId: f.partyId,
      netAmount: Number(f.amount), mode: f.mode, note: f.note,
    };
    const txn = editingId ? api.editTransaction(editingId, payload) : api.postTransaction(payload);
    setF({ businessDate: todayStr(), partyId: null, amount: '', mode: 'cash', note: '' });
    setEditingId(null);
    setErr(''); onSaved(txn, print);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className={`text-2xl font-extrabold tracking-tight mb-5 ${lang === 'ur' ? 'font-urdu leading-[1.8]' : ''}`}>{t('receiptsPayments')}</h1>
      <div className="grid lg:grid-cols-[400px_1fr] gap-5 items-start">
        <Card className="p-5">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 rounded-xl mb-5">
            {['receipt', 'payment'].map((k) => (
              <button key={k} onClick={() => setKind(k)}
                className={`relative py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${kind === k ? 'text-white' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {kind === k && <motion.span layoutId="rp-pill" className={`absolute inset-0 rounded-lg ${k === 'receipt' ? 'bg-emerald-600' : 'bg-rose-600'}`}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  {k === 'receipt' ? <ArrowDown size={14} weight="bold" /> : <ArrowUp size={14} weight="bold" />}
                  {t(k === 'receipt' ? 'newReceipt' : 'newPayment')}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <Field label={t('date')} required><Input type="date" className="num" value={f.businessDate} onChange={(e) => set('businessDate', e.target.value)} /></Field>
            <Field label={kind === 'receipt' ? t('fromParty') : t('toParty')} required>
              <PartyPicker value={f.partyId} onChange={(v) => set('partyId', v)} />
            </Field>
            <Field label={t('amountRs')} required><NumInput min="0" value={f.amount} onChange={(v) => set('amount', v)} placeholder="0" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('mode')}>
                <Select value={f.mode} onChange={(e) => set('mode', e.target.value)}>
                  <option value="cash">{t('cash')}</option><option value="bank">{t('bank')}</option>
                </Select>
              </Field>
              <Field label={t('note')}><Input value={f.note} onChange={(e) => set('note', e.target.value)} /></Field>
            </div>
            {err && <p className="text-sm font-semibold text-rose-600">{err}</p>}
            {editingId && (
              <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2">
                <p className="text-xs font-bold text-amber-800">
                  {t('editing')} — {db.transactions.find((x) => x.id === editingId)?.voucherNo}
                </p>
                <button onClick={cancelEdit} className="text-xs font-bold text-zinc-500 hover:text-zinc-800 cursor-pointer">{t('cancelEdit')}</button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Button variant="secondary" onClick={() => save(false)}>{editingId ? t('updateEntry') : t('save')}</Button>
              <Button onClick={() => save(true)}>{editingId ? `${t('updateEntry')} + ${t('print')}` : t('saveAndPrint')}</Button>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 font-bold text-sm text-zinc-600">{t('lastTransactions')}</div>
          {list.length === 0 ? (
            <EmptyState icon={Receipt} title={t('noEntries')} hint={t('noEntriesHint')} />
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <tbody>
                {list.map((tx) => (
                  <tr key={tx.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                    <td className="px-4 py-2.5 num font-bold text-zinc-600 w-24">{tx.voucherNo}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold">{pname(tx.partyId)}</span>
                      <span className="block text-[11px] text-zinc-400 num">{fmtDateTime(tx.createdAt)}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={tx.type === 'receipt' ? 'green' : 'red'}>{t(tx.type === 'receipt' ? 'receipts' : 'payments')}</Badge>
                    </td>
                    <td className={`px-4 py-2.5 num text-end font-extrabold ${tx.type === 'receipt' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'receipt' ? '+' : '−'} {fmtRs(tx.netAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-end whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        {canModify(tx) && (
                          <IconBtn icon={PencilSimple} tone="amber" label={t('edit')} onClick={() => startEdit(tx)} />
                        )}
                        <IconBtn icon={Printer} tone="brand" label={t('print')} onClick={() => onReprint(tx)} />
                        <IconBtn icon={FilePdf} tone="zinc" label={t('downloadPdf')} onClick={() => onReprint(tx, 'pdf')} />
                        {canModify(tx) && (
                          <IconBtn icon={Trash} tone="red" label={t('delete')} onClick={() => doDelete(tx)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}
