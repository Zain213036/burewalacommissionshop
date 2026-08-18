import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Plus, PencilSimple, Trash } from '@phosphor-icons/react';
import { useStore } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs, fmtDate, fmtDateTime, todayStr } from '../lib/format';
import { Card, Field, Input, Select, NumInput, Button, EmptyState, IconBtn } from '../components/ui';

export function Expenses({ onSaved }) {
  const { db, lang, api, user } = useStore();
  const t = makeT(lang);
  const [f, setF] = useState({ businessDate: todayStr(), categoryId: '', amount: '', mode: 'cash', note: '' });
  const [err, setErr] = useState('');
  const [newCat, setNewCat] = useState('');
  const [editingId, setEditingId] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const canModify = (tx) => user?.role === 'owner' || tx.businessDate === todayStr();
  const startEdit = (tx) => {
    setF({ businessDate: tx.businessDate, categoryId: tx.categoryId, amount: tx.netAmount, mode: tx.mode || 'cash', note: tx.note || '' });
    setEditingId(tx.id); setErr('');
  };
  const cancelEdit = () => {
    setEditingId(null);
    setF({ businessDate: todayStr(), categoryId: '', amount: '', mode: 'cash', note: '' });
  };
  const doDelete = (tx) => {
    if (window.confirm(`${t('confirmDeleteEntry')} (${tx.voucherNo})`)) {
      api.voidTransaction(tx.id, 'deleted');
      if (editingId === tx.id) cancelEdit();
    }
  };

  const list = db.transactions.filter((tx) => tx.type === 'expense' && tx.status === 'active')
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);
  const catName = (id) => {
    const c = db.expenseCategories.find((x) => x.id === id);
    return c ? (lang === 'ur' ? c.nameUr : c.nameEn) : '—';
  };

  const save = () => {
    if (!f.categoryId || !Number(f.amount)) { setErr(t('required')); return; }
    const payload = {
      type: 'expense', businessDate: f.businessDate, categoryId: f.categoryId,
      netAmount: Number(f.amount), mode: f.mode, note: f.note,
    };
    const txn = editingId ? api.editTransaction(editingId, payload) : api.postTransaction(payload);
    setF({ businessDate: todayStr(), categoryId: '', amount: '', mode: 'cash', note: '' });
    setEditingId(null);
    setErr(''); onSaved(txn, false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className={`text-2xl font-extrabold tracking-tight mb-5 ${lang === 'ur' ? 'font-urdu leading-[1.8]' : ''}`}>{t('expenses')}</h1>
      <div className="grid lg:grid-cols-[400px_1fr] gap-5 items-start">
        <Card className="p-5 flex flex-col gap-4">
          <Field label={t('date')} required><Input type="date" className="num" value={f.businessDate} onChange={(e) => set('businessDate', e.target.value)} /></Field>
          <Field label={t('category')} required>
            <Select value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              <option value="">—</option>
              {db.expenseCategories.map((c) => <option key={c.id} value={c.id}>{lang === 'ur' ? c.nameUr : c.nameEn}</option>)}
            </Select>
          </Field>
          {user?.role === 'owner' && (
            <div className="flex gap-2">
              <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder={t('addExpenseCategory')} />
              <Button variant="secondary" onClick={() => { if (newCat.trim()) { api.addExpenseCategory({ nameEn: newCat.trim(), nameUr: newCat.trim() }); setNewCat(''); } }}>
                <Plus size={15} weight="bold" />
              </Button>
            </div>
          )}
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
          <Button onClick={save}>{editingId ? t('updateEntry') : t('save')}</Button>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 font-bold text-sm text-zinc-600">{t('lastTransactions')}</div>
          {list.length === 0 ? (
            <EmptyState icon={Wallet} title={t('noEntries')} hint={t('noEntriesHint')} />
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <tbody>
                {list.map((tx) => (
                  <tr key={tx.id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-4 py-2.5 num font-bold text-zinc-600 w-24">{tx.voucherNo}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold">{catName(tx.categoryId)}</span>
                      {tx.note && <span className="text-zinc-400 text-xs ms-2">{tx.note}</span>}
                      <span className="block text-[11px] text-zinc-400 num">{fmtDateTime(tx.createdAt)}</span>
                    </td>
                    <td className="px-4 py-2.5 num text-end font-extrabold text-rose-600">− {fmtRs(tx.netAmount)}</td>
                    <td className="px-3 py-2.5 text-end whitespace-nowrap">
                      {canModify(tx) && (
                        <div className="inline-flex gap-1.5">
                          <IconBtn icon={PencilSimple} tone="amber" label={t('edit')} onClick={() => startEdit(tx)} />
                          <IconBtn icon={Trash} tone="red" label={t('delete')} onClick={() => doDelete(tx)} />
                        </div>
                      )}
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
