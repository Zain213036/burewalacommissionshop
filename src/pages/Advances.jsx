import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { HandCoins, Plus, Trash } from '@phosphor-icons/react';
import { useStore, outstandingAdvances, findDuplicate } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs, fmtDate, todayStr } from '../lib/format';
import { Card, Field, Input, Select, NumInput, Button, Modal, EmptyState, Badge, IconBtn } from '../components/ui';
import { PartyPicker } from '../components/PartyPicker';

export function Advances({ onSaved }) {
  const { db, lang, api, user } = useStore();
  const t = makeT(lang);
  const [showGive, setShowGive] = useState(false);
  const [recoverFor, setRecoverFor] = useState(null);

  // deletable only while nothing has been recovered against it
  const canDelete = (a) => (a.recovered || 0) === 0 && (user?.role === 'owner' || a.businessDate === todayStr());
  const doDelete = (a) => {
    if (window.confirm(`${t('confirmDeleteEntry')} (${a.voucherNo})`)) api.voidTransaction(a.id, 'deleted');
  };

  const advances = db.transactions.filter((tx) => tx.type === 'advance' && tx.status === 'active')
    .sort((a, b) => b.createdAt - a.createdAt);
  const pname = (id) => db.parties.find((p) => p.id === id)?.name || '—';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className={`text-2xl font-extrabold tracking-tight ${lang === 'ur' ? 'font-urdu leading-[1.8]' : ''}`}>{t('advances')}</h1>
        <Button onClick={() => setShowGive(true)}><Plus size={16} weight="bold" /> {t('newAdvance')}</Button>
      </div>

      {advances.length === 0 ? (
        <Card><EmptyState icon={HandCoins} title={t('noEntries')} hint={t('noEntriesHint')} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
                  <th className="text-start font-bold px-4 py-3">{t('voucher')}</th>
                  <th className="text-start font-bold px-4 py-3">{t('party')}</th>
                  <th className="text-start font-bold px-4 py-3">{t('date')}</th>
                  <th className="text-end font-bold px-4 py-3">{t('principal')}</th>
                  <th className="text-end font-bold px-4 py-3">{t('extraAmount').split(' ')[0]}</th>
                  <th className="text-end font-bold px-4 py-3">{t('recovered')}</th>
                  <th className="text-end font-bold px-4 py-3">{t('outstanding')}</th>
                  <th className="text-end font-bold px-4 py-3">{t('ageDays')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {advances.map((a) => {
                  const total = (a.principal || 0) + (a.extra || 0);
                  const out = total - (a.recovered || 0);
                  const age = Math.floor((Date.now() - new Date(a.businessDate).getTime()) / 86400000);
                  return (
                    <tr key={a.id} className="border-b border-zinc-50 last:border-0">
                      <td className="px-4 py-3 num font-bold text-zinc-700">{a.voucherNo}</td>
                      <td className="px-4 py-3 font-semibold">{pname(a.partyId)}
                        {a.note && <span className="block text-xs text-zinc-400">{a.note}</span>}</td>
                      <td className="px-4 py-3 num text-zinc-500">{fmtDate(a.businessDate)}</td>
                      <td className="px-4 py-3 num text-end">{fmtRs(a.principal)}</td>
                      <td className="px-4 py-3 num text-end text-zinc-500">{a.extra ? fmtRs(a.extra) : '—'}</td>
                      <td className="px-4 py-3 num text-end text-emerald-600 font-bold">{fmtRs(a.recovered || 0)}</td>
                      <td className="px-4 py-3 num text-end font-extrabold text-amber-600">{fmtRs(out)}</td>
                      <td className="px-4 py-3 num text-end text-zinc-400">{age}</td>
                      <td className="px-4 py-3 text-end whitespace-nowrap">
                        {out > 0 ? (
                          <Button variant="secondary" className="!h-8 !px-3 text-xs" onClick={() => setRecoverFor(a)}>{t('recover')}</Button>
                        ) : <Badge tone="green">{t('recovered')}</Badge>}
                        {canDelete(a) && (
                          <IconBtn icon={Trash} tone="red" label={t('delete')} onClick={() => doDelete(a)} className="ms-1.5" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <GiveAdvanceModal open={showGive} onClose={() => setShowGive(false)} onSaved={onSaved} />
      <RecoverModal advance={recoverFor} onClose={() => setRecoverFor(null)} onSaved={onSaved} />
    </motion.div>
  );
}

function GiveAdvanceModal({ open, onClose, onSaved }) {
  const { db, lang, api } = useStore();
  const t = makeT(lang);
  const [f, setF] = useState({ businessDate: todayStr(), partyId: null, principal: '', extra: '', mode: 'cash', note: '' });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const [err, setErr] = useState('');

  const savingRef = useRef(false);

  const save = (print) => {
    if (savingRef.current) return; // block double-click double entries
    if (!f.partyId || !Number(f.principal)) { setErr(t('required')); return; }
    const totalRec = (Number(f.principal) || 0) + (Number(f.extra) || 0);
    if (findDuplicate(db, { type: 'advance', partyId: f.partyId, netAmount: totalRec, businessDate: f.businessDate })
      && !window.confirm(t('possibleDuplicate'))) return;
    savingRef.current = true;
    setTimeout(() => { savingRef.current = false; }, 1500);
    const txn = api.postTransaction({
      type: 'advance', businessDate: f.businessDate, partyId: f.partyId,
      principal: Number(f.principal), extra: Number(f.extra) || 0,
      mode: f.mode, note: f.note, seasonTag: db.settings.season,
    });
    setF({ businessDate: todayStr(), partyId: null, principal: '', extra: '', mode: 'cash', note: '' });
    setErr(''); onClose(); onSaved(txn, print);
  };

  const totalRec = (Number(f.principal) || 0) + (Number(f.extra) || 0);

  return (
    <Modal open={open} onClose={onClose} title={t('newAdvance')}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t('date')} required><Input type="date" className="num" value={f.businessDate} onChange={(e) => set('businessDate', e.target.value)} /></Field>
        <Field label={t('party')} required><PartyPicker value={f.partyId} onChange={(v) => set('partyId', v)} /></Field>
        <Field label={t('principal')} required><NumInput min="0" value={f.principal} onChange={(v) => set('principal', v)} placeholder="0" /></Field>
        <Field label={t('extraAmount')} hint={lang === 'ur' ? 'سسٹم خود کوئی سود نہیں لگاتا' : 'system never auto-calculates interest'}>
          <NumInput min="0" value={f.extra} onChange={(v) => set('extra', v)} placeholder="0" />
        </Field>
        <Field label={t('mode')}>
          <Select value={f.mode} onChange={(e) => set('mode', e.target.value)}>
            <option value="cash">{t('cash')}</option><option value="bank">{t('bank')}</option>
          </Select>
        </Field>
        <Field label={t('note')}><Input value={f.note} onChange={(e) => set('note', e.target.value)} placeholder={lang === 'ur' ? 'گندم ۲۰۲۶ پیشگی' : 'wheat 2026 advance'} /></Field>
      </div>
      <div className="flex items-center justify-between mt-4 p-3 rounded-xl bg-amber-50 text-sm">
        <b className="text-amber-800">{t('totalRecoverable')}</b>
        <b className="num text-lg text-amber-700">{fmtRs(totalRec)}</b>
      </div>
      {err && <p className="text-sm font-semibold text-rose-600 mt-2">{err}</p>}
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
        <Button variant="secondary" onClick={() => save(false)}>{t('save')}</Button>
        <Button onClick={() => save(true)}>{t('saveAndPrint')}</Button>
      </div>
    </Modal>
  );
}

function RecoverModal({ advance, onClose, onSaved }) {
  const { db, lang, api } = useStore();
  const t = makeT(lang);
  const [amt, setAmt] = useState('');
  const [mode, setMode] = useState('cash');
  if (!advance) return null;
  const out = (advance.principal || 0) + (advance.extra || 0) - (advance.recovered || 0);

  const save = (print) => {
    const v = Math.min(Number(amt) || 0, out);
    if (v <= 0) return;
    const txn = api.postTransaction({
      type: 'advanceRecovery', businessDate: todayStr(), partyId: advance.partyId,
      advanceId: advance.id, netAmount: v, mode,
    });
    setAmt(''); onClose(); onSaved(txn, print);
  };

  return (
    <Modal open={!!advance} onClose={onClose} title={`${t('recordRecovery')} — ${advance.voucherNo}`}>
      <p className="text-sm text-zinc-500 mb-4">{t('outstanding')}: <b className="num text-amber-600">{fmtRs(out)}</b></p>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('amountRs')} required><NumInput min="0" max={out} value={amt} onChange={setAmt} autoFocus /></Field>
        <Field label={t('mode')}>
          <Select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="cash">{t('cash')}</option><option value="bank">{t('bank')}</option>
          </Select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
        <Button variant="secondary" onClick={() => save(false)}>{t('save')}</Button>
        <Button onClick={() => save(true)}>{t('saveAndPrint')}</Button>
      </div>
    </Modal>
  );
}
