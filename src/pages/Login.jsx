import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeSlash, Translate } from '@phosphor-icons/react';
import { useStore } from '../lib/store';
import { makeT } from '../lib/i18n';
import { LogoMark } from '../components/Logo';
import { Button, Field, inputCls } from '../components/ui';

export function Login() {
  const { login, lang, setLang } = useStore();
  const t = makeT(lang);
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(false);
  const [shake, setShake] = useState(0);

  const submit = (e) => {
    e.preventDefault();
    if (!login(u, p)) { setErr(true); setShake((s) => s + 1); }
  };

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1.1fr_1fr] bg-zinc-50">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between bg-brand-950 text-white p-12 overflow-hidden">
        <div className="absolute -top-32 -end-32 w-[420px] h-[420px] rounded-full bg-brand-700/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-full h-64 bg-gradient-to-t from-brand-900/60 to-transparent pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center gap-4">
            <LogoMark size={64} />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight leading-tight">Pakistan Commission Shop</h1>
              <p className="font-urdu text-xl text-brand-300 mt-1">پاکستان کمیشن شاپ</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.6 }} className="relative z-10">
          <p className="font-urdu text-4xl leading-[2] text-brand-100">آڑھت منیجر</p>
          <p className="text-brand-300/90 max-w-md mt-3 leading-relaxed">
            {t('appTagline')} — {lang === 'ur' ? 'خریداری، فروخت، آڑھت، کھاتہ، پیشگی اور روزنامچہ — سب ایک جگہ۔' : 'Purchases, sales, arhat deals, khata, peshgi and roznamcha — all in one place.'}
          </p>
          <div className="flex items-center gap-2 mt-6 text-sm text-brand-200 num">☎ +92 344 7399825</div>
        </motion.div>
        <p className="text-xs text-brand-400/60 relative z-10">© 2026 Pakistan Commission Shop · Grain Market, Punjab</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <motion.div
          key={shake}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0, x: err ? [0, -9, 9, -6, 6, 0] : 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex justify-center mb-6"><LogoMark size={60} /></div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900">{t('welcomeBack')}</h2>
            <button onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
              className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-600 hover:border-brand-500 cursor-pointer">
              <Translate size={14} />{lang === 'en' ? <span className="font-urdu pt-0.5">اردو</span> : 'EN'}
            </button>
          </div>
          <p className="text-sm text-zinc-400 mb-7">{t('loginHint')}</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label={t('username')} required>
              <input className={inputCls} value={u} onChange={(e) => { setU(e.target.value); setErr(false); }} autoFocus autoComplete="username" />
            </Field>
            <Field label={t('password')} required error={err ? t('invalidLogin') : ''}>
              <div className="relative">
                <input className={inputCls} type={show ? 'text' : 'password'} value={p}
                  onChange={(e) => { setP(e.target.value); setErr(false); }} autoComplete="current-password" />
                <button type="button" onClick={() => setShow(!show)} aria-label="toggle password"
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  {show ? <EyeSlash size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>
            <Button type="submit" className="h-11 mt-1">{t('signIn')}</Button>
          </form>

          <div className="mt-8 border border-dashed border-zinc-300 rounded-2xl p-4 text-xs text-zinc-500">
            <p className="font-bold text-zinc-600 mb-1.5">{t('demoAccounts')}</p>
            <p className="num">{t('owner')}: malik / malik123</p>
            <p className="num">{t('munshi')}: munshi / munshi123</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
