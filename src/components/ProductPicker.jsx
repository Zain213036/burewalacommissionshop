import React, { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { useStore } from '../lib/store';
import { makeT } from '../lib/i18n';
import { Modal, Field, Input, Select, Button } from './ui';

// Product select with an always-visible "+" to add a new product on the spot
export function ProductPicker({ value, onChange }) {
  const { db, lang, api } = useStore();
  const t = makeT(lang);
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ nameEn: '', nameUr: '', defaultRateUnit: 'mann' });
  const [err, setErr] = useState('');

  const save = () => {
    if (!f.nameEn.trim() && !f.nameUr.trim()) { setErr(t('required')); return; }
    const item = api.saveProduct({
      nameEn: f.nameEn.trim() || f.nameUr.trim(),
      nameUr: f.nameUr.trim() || f.nameEn.trim(),
      defaultRateUnit: f.defaultRateUnit,
    });
    onChange(item.id);
    setF({ nameEn: '', nameUr: '', defaultRateUnit: 'mann' });
    setErr('');
    setShow(false);
  };

  return (
    <div className="flex gap-1.5">
      <Select className="flex-1 min-w-0" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('selectProduct')}</option>
        {db.products.filter((p) => p.isActive).map((p) => (
          <option key={p.id} value={p.id}>{lang === 'ur' ? p.nameUr : p.nameEn} / {lang === 'ur' ? p.nameEn : p.nameUr}</option>
        ))}
      </Select>
      <button type="button" title={t('addProduct')} aria-label={t('addProduct')}
        onClick={() => setShow(true)}
        className="shrink-0 w-10 h-10 rounded-xl border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 flex items-center justify-center cursor-pointer transition-colors">
        <Plus size={17} weight="bold" />
      </button>

      <Modal open={show} onClose={() => setShow(false)} title={t('addProduct')}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t('name') + ' (EN)'} required>
            <Input value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value })} autoFocus placeholder="Bajra" />
          </Field>
          <Field label={t('name') + ' (اردو)'}>
            <Input className="font-urdu text-end" dir="rtl" value={f.nameUr}
              onChange={(e) => setF({ ...f, nameUr: e.target.value })} placeholder="باجرہ" />
          </Field>
          <Field label={t('rate')}>
            <Select value={f.defaultRateUnit} onChange={(e) => setF({ ...f, defaultRateUnit: e.target.value })}>
              <option value="mann">{t('perMann')}</option>
              <option value="kg">{t('perKg')}</option>
              <option value="100kg">{t('per100Kg')}</option>
            </Select>
          </Field>
        </div>
        {err && <p className="text-sm font-semibold text-rose-600 mt-3">{err}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setShow(false)}>{t('cancel')}</Button>
          <Button onClick={save}>{t('save')}</Button>
        </div>
      </Modal>
    </div>
  );
}
