import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, UserCircle } from '@phosphor-icons/react';
import { useStore, partyBalance } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs } from '../lib/format';
import { inputCls, Modal, Field, Input, Select, Button } from './ui';

export function PartyPicker({ value, onChange, placeholderKey = 'selectParty', exclude }) {
  const { db, lang, api } = useStore();
  const t = makeT(lang);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);

  const selected = db.parties.find((p) => p.id === value);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return db.parties
      .filter((p) => p.isActive && p.id !== exclude)
      .filter((p) => !needle || [p.name, p.fatherName, p.village, p.phone].join(' ').toLowerCase().includes(needle))
      .slice(0, 8);
  }, [db.parties, q, exclude]);

  useEffect(() => {
    const h = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pick = (p) => { onChange(p.id); setOpen(false); setQ(''); };

  return (
    <div className="relative" ref={boxRef}>
      <div className="flex gap-1.5">
        <div className="relative flex-1 min-w-0">
          {selected && !open ? (
            <button type="button" onClick={() => setOpen(true)}
              className={`${inputCls} flex items-center justify-between cursor-pointer text-start`}>
              <span className="flex items-center gap-2 truncate">
                <UserCircle size={18} className="text-brand-700 shrink-0" />
                <span className="truncate font-semibold">{selected.name}</span>
                {selected.fatherName && <span className="text-zinc-400 text-xs truncate">s/o {selected.fatherName}</span>}
              </span>
              <span className={`num text-xs font-bold ${partyBalance(db, selected.id) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {fmtRs(Math.abs(partyBalance(db, selected.id)))}
              </span>
            </button>
          ) : (
            <input
              className={inputCls}
              placeholder={t(placeholderKey)}
              value={q}
              onFocus={() => setOpen(true)}
              onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
                if (e.key === 'Enter' && results[hi]) { e.preventDefault(); pick(results[hi]); }
                if (e.key === 'Escape') setOpen(false);
              }}
            />
          )}
        </div>
        {/* always-visible quick "new account" button */}
        <button type="button" title={t('addParty')} aria-label={t('addParty')}
          onClick={() => { setShowNew(true); setOpen(false); }}
          className="shrink-0 w-10 h-10 rounded-xl border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 flex items-center justify-center cursor-pointer transition-colors">
          <Plus size={17} weight="bold" />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-40 mt-1 w-full bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden"
          >
            {results.map((p, i) => {
              const bal = partyBalance(db, p.id);
              return (
                <button key={p.id} type="button" onMouseDown={() => pick(p)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-start cursor-pointer ${i === hi ? 'bg-brand-50' : 'hover:bg-zinc-50'}`}>
                  <span>
                    <span className="block text-sm font-semibold text-zinc-800">{p.name}</span>
                    <span className="block text-xs text-zinc-400">{[p.fatherName && `s/o ${p.fatherName}`, p.village].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className={`num text-xs font-bold ${bal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtRs(Math.abs(bal))}</span>
                </button>
              );
            })}
            <button type="button" onMouseDown={() => { setShowNew(true); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-brand-700 bg-brand-50/60 hover:bg-brand-50 cursor-pointer">
              <Plus size={15} weight="bold" /> {t('addParty')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <PartyFormModal open={showNew} onClose={() => setShowNew(false)} onSaved={(p) => { onChange(p.id); setShowNew(false); }} />
    </div>
  );
}

export function PartyFormModal({ open, onClose, onSaved, editParty }) {
  const { db, lang, api } = useStore();
  const t = makeT(lang);
  const empty = { name: '', fatherName: '', village: '', phone: '', cnic: '', type: 'seller', openingBalance: { amount: '', direction: 'lena' }, notes: '' };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');

  useEffect(() => { setF(editParty ? { ...empty, ...editParty } : empty); setErr(''); }, [open, editParty]);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const save = () => {
    if (!f.name.trim()) { setErr(t('required')); return; }
    const dup = !editParty && db.parties.some((p) => p.name.trim().toLowerCase() === f.name.trim().toLowerCase()
      && (p.fatherName || '').trim().toLowerCase() === (f.fatherName || '').trim().toLowerCase());
    if (dup && !f._dupOk) { setErr(t('duplicateWarning')); setF((s) => ({ ...s, _dupOk: true })); return; }
    const payload = { ...f, openingBalance: { amount: Number(f.openingBalance.amount) || 0, direction: f.openingBalance.direction } };
    delete payload._dupOk;
    if (editParty) { api.updateParty(editParty.id, payload); onSaved?.(editParty); }
    else { const p = api.addParty(payload); onSaved?.(p); }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editParty ? t('editParty') : t('addParty')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('name')} required error={err && !f.name.trim() ? err : ''}>
          <Input value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </Field>
        <Field label={t('fatherName')}><Input value={f.fatherName} onChange={(e) => set('fatherName', e.target.value)} /></Field>
        <Field label={t('village')}><Input value={f.village} onChange={(e) => set('village', e.target.value)} /></Field>
        <Field label={t('phone')}><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03XXXXXXXXX" /></Field>
        <Field label={t('cnic')}><Input value={f.cnic} onChange={(e) => set('cnic', e.target.value)} placeholder="12345-1234567-1" /></Field>
        <Field label={t('partyType')} required>
          <Select value={f.type} onChange={(e) => set('type', e.target.value)}>
            <option value="seller">{t('seller')}</option>
            <option value="buyer">{t('buyer')}</option>
            <option value="both">{t('both')}</option>
            <option value="shop">{t('otherShop')}</option>
          </Select>
        </Field>
        <Field label={t('openingBalance')}>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" className="num text-right" value={f.openingBalance.amount}
              onChange={(e) => set('openingBalance', { ...f.openingBalance, amount: e.target.value })} placeholder="0" />
            <Select value={f.openingBalance.direction} onChange={(e) => set('openingBalance', { ...f.openingBalance, direction: e.target.value })}>
              <option value="lena">{t('theyOweUs')}</option>
              <option value="dena">{t('weOweThem')}</option>
            </Select>
          </div>
        </Field>
        <Field label={t('notes')}><Input value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
      {err && f.name.trim() && <p className="mt-3 text-sm text-amber-600 font-medium">{err}</p>}
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
        <Button onClick={save}>{t('save')}</Button>
      </div>
    </Modal>
  );
}
