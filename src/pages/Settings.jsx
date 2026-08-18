import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, DownloadSimple, UploadSimple, Storefront, Coins, Package, UsersThree, Bank, PencilSimple } from '@phosphor-icons/react';
import { useStore, hashPw } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs } from '../lib/format';
import { Card, Field, Input, Select, NumInput, Button, Badge, Modal } from '../components/ui';

export function Settings() {
  const { db, lang, api, user } = useStore();
  const t = makeT(lang);
  const [tab, setTab] = useState('shop');
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');

  if (user?.role !== 'owner') return null;

  const tabs = [
    { id: 'shop', key: 'shopProfile', icon: Storefront },
    { id: 'charges', key: 'chargeTypes', icon: Coins },
    { id: 'products', key: 'products', icon: Package },
    { id: 'users', key: 'users', icon: UsersThree },
    { id: 'backup', key: 'dataSafety', icon: Bank },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className={`text-2xl font-extrabold tracking-tight mb-5 ${lang === 'ur' ? 'font-urdu leading-[1.8]' : ''}`}>{t('settings')}</h1>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {tabs.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors
              ${tab === tb.id ? 'bg-brand-800 text-white' : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800'}
              ${lang === 'ur' ? 'font-urdu-naskh' : ''}`}>
            <tb.icon size={15} /> {t(tb.key)}
          </button>
        ))}
      </div>

      {tab === 'shop' && <ShopTab />}
      {tab === 'charges' && <ChargesTab />}
      {tab === 'products' && <ProductsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'backup' && (
        <Card className="p-6 max-w-xl">
          <p className="text-sm text-zinc-500 leading-relaxed mb-5">{t('localMode')}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => {
              const blob = new Blob([api.exportJson()], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `pcs-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click(); URL.revokeObjectURL(a.href);
            }}><DownloadSimple size={16} /> {t('exportData')}</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}><UploadSimple size={16} /> {t('importData')}</Button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try { api.importJson(await file.text()); setMsg(t('restoredOk')); }
              catch { setMsg(t('invalidFile')); }
              e.target.value = '';
            }} />
          </div>
          {msg && <p className="text-sm font-bold text-brand-700 mt-3">{msg}</p>}
        </Card>
      )}
    </motion.div>
  );
}

function ShopTab() {
  const { db, lang, api } = useStore();
  const t = makeT(lang);
  const [f, setF] = useState(db.settings);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Card className="p-6 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Shop Name (English)"><Input value={f.shopNameEn} onChange={(e) => set('shopNameEn', e.target.value)} /></Field>
        <Field label="دکان کا نام (اردو)"><Input className="font-urdu text-end" dir="rtl" value={f.shopNameUr} onChange={(e) => set('shopNameUr', e.target.value)} /></Field>
        <Field label="Owner Name (English)"><Input value={f.ownerName || ''} onChange={(e) => set('ownerName', e.target.value)} /></Field>
        <Field label="مالک کا نام (اردو)"><Input className="font-urdu text-end" dir="rtl" value={f.ownerNameUr || ''} onChange={(e) => set('ownerNameUr', e.target.value)} /></Field>
        <Field label={t('phone')}><Input className="num" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label={t('seasonTag')}><Input value={f.season} onChange={(e) => set('season', e.target.value)} /></Field>
        <Field label={t('shopAddress') + ' (EN)'}><Input value={f.addressEn} onChange={(e) => set('addressEn', e.target.value)} /></Field>
        <Field label={t('shopAddress') + ' (اردو)'}><Input className="font-urdu text-end" dir="rtl" value={f.addressUr} onChange={(e) => set('addressUr', e.target.value)} /></Field>
        <Field label={t('openingCash')}><NumInput value={f.openingCash} onChange={(v) => set('openingCash', v)} /></Field>
      </div>
      <div className="flex justify-end mt-5"><Button onClick={() => api.saveSettings(f)}>{t('save')}</Button></div>
    </Card>
  );
}

function ChargesTab() {
  const { db, lang, api } = useStore();
  const t = makeT(lang);
  const APPLIES = [
    ['purchase', t('purchase')], ['sale', t('sale')],
    ['commissionSeller', t('commission') + ' — ' + t('sellerSide')],
    ['commissionBuyer', t('commission') + ' — ' + t('buyerSide')],
  ];
  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      {db.chargeTypes.map((c) => (
        <Card key={c.id} className="p-4">
          <div className="grid sm:grid-cols-[1fr_1fr_130px_110px] gap-3 items-end">
            <Field label={t('name') + ' (EN)'}><Input value={c.nameEn} onChange={(e) => api.saveChargeType({ ...c, nameEn: e.target.value })} /></Field>
            <Field label={t('name') + ' (اردو)'}><Input className="font-urdu text-end" dir="rtl" value={c.nameUr} onChange={(e) => api.saveChargeType({ ...c, nameUr: e.target.value })} /></Field>
            <Field label={t('calcMethod')}>
              <Select value={c.calcMethod} onChange={(e) => api.saveChargeType({ ...c, calcMethod: e.target.value })}>
                <option value="pct">{t('pctOfGross')}</option>
                <option value="flat">{t('flatPerTxn')}</option>
                <option value="perBag">{t('perBag')}</option>
                <option value="perMann">{t('perMann')}</option>
              </Select>
            </Field>
            <Field label={t('defaultValue')}><NumInput value={c.defaultValue} onChange={(v) => api.saveChargeType({ ...c, defaultValue: Number(v) || 0 })} /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <div className="flex flex-wrap gap-2">
              {APPLIES.map(([k, label]) => (
                <label key={k} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 cursor-pointer">
                  <input type="checkbox" className="accent-brand-700" checked={c.appliesTo.includes(k)}
                    onChange={(e) => api.saveChargeType({ ...c, appliesTo: e.target.checked ? [...c.appliesTo, k] : c.appliesTo.filter((x) => x !== k) })} />
                  {label}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer ms-auto">
              <input type="checkbox" className="accent-amber-600" checked={c.retainedByShop}
                onChange={(e) => api.saveChargeType({ ...c, retainedByShop: e.target.checked })} />
              <span className={c.retainedByShop ? 'text-amber-700' : 'text-zinc-400'}>
                {c.retainedByShop ? t('retainedByShop') : t('passThrough')}
              </span>
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
              <input type="checkbox" className="accent-brand-700" checked={c.isActive}
                onChange={(e) => api.saveChargeType({ ...c, isActive: e.target.checked })} />
              <span className={c.isActive ? 'text-brand-700' : 'text-zinc-400'}>{t('active')}</span>
            </label>
          </div>
        </Card>
      ))}
      <Button variant="secondary" className="self-start" onClick={() =>
        api.saveChargeType({ nameEn: 'New Charge', nameUr: 'نئی فیس', calcMethod: 'flat', defaultValue: 0, appliesTo: ['purchase'], retainedByShop: true })}>
        <Plus size={15} weight="bold" /> {t('addChargeType')}
      </Button>
    </div>
  );
}

function ProductsTab() {
  const { db, lang, api } = useStore();
  const t = makeT(lang);
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* Helper box */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
        <b>Bharti (بھرتی)</b> = default bag packing capacity per product. Auto-fills on every new entry — can always be overridden per entry.
        <br />Commission Type: Cotton → Per Mann; others → % of Gross.
      </div>

      {db.products.map((p) => (
        <Card key={p.id} className="p-4">
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <Field label={t('name') + ' (EN)'}><Input value={p.nameEn} onChange={(e) => api.saveProduct({ ...p, nameEn: e.target.value })} /></Field>
            <Field label={t('name') + ' (اردو)'}><Input className="font-urdu text-end" dir="rtl" value={p.nameUr} onChange={(e) => api.saveProduct({ ...p, nameUr: e.target.value })} /></Field>
          </div>
          <div className="grid sm:grid-cols-[140px_160px_160px_90px] gap-3 items-end">
            <Field label={t('rate')}>
              <Select value={p.defaultRateUnit} onChange={(e) => api.saveProduct({ ...p, defaultRateUnit: e.target.value })}>
                <option value="mann">{t('perMann')}</option>
                <option value="kg">{t('perKg')}</option>
                <option value="100kg">{t('per100Kg')}</option>
              </Select>
            </Field>

            <Field label={t('defaultBharti') + ' (kg)'}>
              <NumInput min="0" value={p.defaultBhartiKg || ''} placeholder="e.g. 50"
                onChange={(v) => api.saveProduct({ ...p, defaultBhartiKg: Number(v) || 0 })} />
            </Field>

            <Field label={t('commissionMethod')}>
              <Select value={p.commissionMethod || 'pct'} onChange={(e) => api.saveProduct({ ...p, commissionMethod: e.target.value })}>
                <option value="pct">{t('commMethodPct')}</option>
                <option value="perMann">{t('commMethodPerMann')}</option>
                <option value="flat">{t('commMethodFlat')}</option>
              </Select>
            </Field>

            <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer h-10">
              <input type="checkbox" className="accent-brand-700" checked={p.isActive}
                onChange={(e) => api.saveProduct({ ...p, isActive: e.target.checked })} />
              {t('active')}
            </label>
          </div>
        </Card>
      ))}
      <Button variant="secondary" className="self-start" onClick={() =>
        api.saveProduct({ nameEn: 'New Product', nameUr: 'نئی جنس', defaultRateUnit: 'mann', defaultBhartiKg: 50, commissionMethod: 'pct' })}>
        <Plus size={15} weight="bold" /> {t('addProduct')}
      </Button>
    </div>
  );
}

function UsersTab() {
  const { db, lang, api, user: me } = useStore();
  const t = makeT(lang);
  const [f, setF] = useState({ name: '', username: '', role: 'munshi', newPw: '' });
  const [editU, setEditU] = useState(null); // user being edited in the modal
  const [ef, setEf] = useState({ name: '', username: '', role: 'munshi', newPw: '' });
  const [eErr, setEErr] = useState('');

  const openEdit = (u) => {
    setEditU(u);
    setEf({ name: u.name, username: u.username, role: u.role, newPw: '' });
    setEErr('');
  };
  const saveEdit = () => {
    const uname = ef.username.trim().toLowerCase();
    if (!ef.name.trim() || !uname) { setEErr(t('required')); return; }
    if (db.users.some((x) => x.id !== editU.id && x.username === uname)) { setEErr(t('usernameTaken')); return; }
    api.saveUser({ id: editU.id, name: ef.name.trim(), username: uname, role: ef.role, newPw: ef.newPw || undefined });
    setEditU(null);
  };

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      {db.users.map((u) => (
        <Card key={u.id} className="p-4 flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-extrabold">
            {u.name.slice(0, 1)}
          </div>
          <div className="flex-1 min-w-[140px]">
            <p className="font-bold">{u.name} <Badge tone={u.role === 'owner' ? 'gold' : 'blue'}>{t(u.role)}</Badge></p>
            <p className="text-xs text-zinc-400 num">@{u.username}</p>
          </div>
          <Button variant="secondary" className="!h-9 !px-3 text-xs" onClick={() => openEdit(u)}>
            <PencilSimple size={14} /> {t('edit')}
          </Button>
          <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
            <input type="checkbox" className="accent-brand-700" checked={u.active}
              disabled={u.id === me?.id}
              onChange={(e) => api.saveUser({ id: u.id, active: e.target.checked })} />
            {t('active')}
          </label>
        </Card>
      ))}

      {/* Edit user — name, username, password, role all changeable */}
      <Modal open={!!editU} onClose={() => setEditU(null)} title={`${t('editUser')} — @${editU?.username || ''}`}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t('name')} required>
            <Input value={ef.name} onChange={(e) => setEf({ ...ef, name: e.target.value })} autoFocus />
          </Field>
          <Field label={t('username')} required>
            <Input className="num" value={ef.username} onChange={(e) => setEf({ ...ef, username: e.target.value })} />
          </Field>
          <Field label={t('newPassword')}>
            <Input type="password" value={ef.newPw} onChange={(e) => setEf({ ...ef, newPw: e.target.value })} placeholder="••••••" />
          </Field>
          <Field label={t('role')}>
            <Select value={ef.role} disabled={editU?.id === me?.id}
              onChange={(e) => setEf({ ...ef, role: e.target.value })}>
              <option value="munshi">{t('munshi')}</option>
              <option value="owner">{t('owner')}</option>
            </Select>
          </Field>
        </div>
        {eErr && <p className="text-sm font-semibold text-rose-600 mt-3">{eErr}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setEditU(null)}>{t('cancel')}</Button>
          <Button onClick={saveEdit}>{t('save')}</Button>
        </div>
      </Modal>
      <Card className="p-4">
        <p className="font-bold text-sm mb-3">{t('addUser')}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label={t('name')} required>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label={t('username')} required>
            <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
          </Field>
          <Field label={t('password')} required>
            <Input type="password" value={f.newPw} onChange={(e) => setF({ ...f, newPw: e.target.value })} />
          </Field>
          <Field label={t('role')}>
            <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="munshi">{t('munshi')}</option>
              <option value="owner">{t('owner')}</option>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end mt-3">
          <Button onClick={() => {
            const uname = f.username.trim().toLowerCase();
            if (!f.name.trim() || !uname || !f.newPw) return;
            if (db.users.some((x) => x.username === uname)) { alert(t('usernameTaken')); return; }
            api.saveUser({ ...f, username: uname });
            setF({ name: '', username: '', role: 'munshi', newPw: '' });
          }}>
            <Plus size={15} weight="bold" /> {t('addUser')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
