import React, { useState } from 'react';
import { useStore, partyBalance } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs, todayStr } from '../lib/format';
import { Modal, Field, Select, NumInput, Button } from './ui';

// Quick partial settlement — receive or pay any amount against a party's khata.
// party: party object (or null = closed)
export function PartialCashModal({ party, onClose, onSaved }) {
  const { db, lang, api } = useStore();
  const t = makeT(lang);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [dir, setDir] = useState(null); // 'receipt' | 'payment'
  const bal = party ? partyBalance(db, party.id) : 0;
  const kind = dir || (bal >= 0 ? 'receipt' : 'payment');
  if (!party) return null;

  const amt = Number(amount) || 0;
  const after = kind === 'receipt' ? bal - amt : bal + amt;

  const save = (print) => {
    if (amt <= 0) return;
    const txn = api.postTransaction({
      type: kind, businessDate: todayStr(), partyId: party.id,
      netAmount: amt, mode, note: t(kind === 'receipt' ? 'receiveCash' : 'payCash'),
    });
    setAmount(''); setDir(null); onClose();
    onSaved?.(txn, print);
  };

  return (
    <Modal open={!!party} onClose={onClose} title={`${t(kind === 'receipt' ? 'receiveCash' : 'payCash')} — ${party.name}`}>
      <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 mb-4">
        <span className="text-sm font-bold text-zinc-500">{t('currentBalance')}</span>
        <span className={`num text-lg font-extrabold ${bal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {fmtRs(Math.abs(bal))} <span className="text-xs">{bal >= 0 ? t('theyOweUs') : t('weOweThem')}</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 rounded-xl mb-4">
        {['receipt', 'payment'].map((k) => (
          <button key={k} onClick={() => setDir(k)}
            className={`py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors
              ${kind === k ? (k === 'receipt' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'text-zinc-500 hover:text-zinc-700'}`}>
            {t(k === 'receipt' ? 'receiveCash' : 'payCash')}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('amountRs')} required hint={t('partialHint')}>
          <NumInput min="0" value={amount} onChange={setAmount} autoFocus placeholder="0" />
        </Field>
        <Field label={t('mode')}>
          <Select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="cash">{t('cash')}</option><option value="bank">{t('bank')}</option>
          </Select>
        </Field>
      </div>
      {amt > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-brand-50 mt-4">
          <span className="text-sm font-bold text-brand-800">{t('balanceAfter')}</span>
          <span className={`num text-lg font-extrabold ${after >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {fmtRs(Math.abs(after))} <span className="text-xs">{after >= 0 ? t('theyOweUs') : t('weOweThem')}</span>
          </span>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
        <Button variant="secondary" onClick={() => save(false)} disabled={amt <= 0}>{t('save')}</Button>
        <Button onClick={() => save(true)} disabled={amt <= 0}>{t('saveAndPrint')}</Button>
      </div>
    </Modal>
  );
}
