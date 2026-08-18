import React from 'react';
import { motion } from 'framer-motion';
import {
  SquaresFour, UsersThree, ShoppingCart, Tag, Handshake, HandCoins,
  Receipt, Wallet, Package, Book, ChartBar, Gear, SignOut, Translate, Circle,
  ReceiptX,
} from '@phosphor-icons/react';
import { useStore } from '../lib/store';
import { makeT } from '../lib/i18n';
import { LogoLockup } from './Logo';

const NAV = [
  { id: 'dashboard', icon: SquaresFour, key: 'dashboard' },
  { id: 'parties', icon: UsersThree, key: 'parties' },
  { id: 'mandislip', icon: ReceiptX, key: 'mandiSlip', highlight: true }, // ★ MAIN ENTRY FORM
  { id: 'purchase', icon: ShoppingCart, key: 'purchase' },
  { id: 'sale', icon: Tag, key: 'sale' },
  { id: 'commission', icon: Handshake, key: 'commission' },
  { id: 'advances', icon: HandCoins, key: 'advances' },
  { id: 'receipts', icon: Receipt, key: 'receiptsPayments' },
  { id: 'expenses', icon: Wallet, key: 'expenses' },
  { id: 'stock', icon: Package, key: 'stock' },
  { id: 'cashbook', icon: Book, key: 'cashBook' },
  { id: 'reports', icon: ChartBar, key: 'reports' },
  { id: 'settings', icon: Gear, key: 'settings', ownerOnly: true },
];

export function Layout({ page, setPage, children }) {
  const { user, lang, setLang, logout } = useStore();
  const t = makeT(lang);

  return (
    <div className="app-shell min-h-[100dvh] flex bg-zinc-50">
      {/* Sidebar */}
      <aside className="no-print w-60 shrink-0 bg-brand-950 text-white flex flex-col sticky top-0 h-[100dvh]">
        <div className="px-4 py-5 border-b border-white/10">
          <LogoLockup size={40} dark lang={lang} />
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.filter((n) => !n.ownerOnly || user?.role === 'owner').map((n) => {
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => setPage(n.id)}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer mb-0.5
                  ${active
                    ? 'text-white'
                    : n.highlight
                    ? 'text-amber-300 hover:text-white hover:bg-white/5'
                    : 'text-brand-200/70 hover:text-white hover:bg-white/5'}`}>
                {active && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 bg-brand-700/60 rounded-xl"
                    transition={{ type: 'spring', stiffness: 350, damping: 32 }} />
                )}
                {n.highlight && !active && (
                  <span className="absolute inset-0 rounded-xl border border-amber-500/30" />
                )}
                <n.icon size={19} weight={active ? 'fill' : 'regular'} className="relative z-10" />
                <span className={`relative z-10 ${lang === 'ur' ? 'font-urdu-naskh text-[15px]' : ''}`}>{t(n.key)}</span>
                {n.highlight && <span className="ms-auto relative z-10 text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md">F5</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-gold-500 text-brand-950 flex items-center justify-center font-extrabold text-sm">
              {(user?.name || '?').slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{lang === 'ur' ? user?.nameUr || user?.name : user?.name}</p>
              <p className="text-[11px] text-brand-300">{user?.role === 'owner' ? t('owner') : t('munshi')}</p>
            </div>
            <button onClick={logout} title={t('logout')} className="p-2 rounded-lg hover:bg-white/10 cursor-pointer text-brand-200">
              <SignOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-zinc-200/80 px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
            <Circle size={8} weight="fill" className="text-emerald-500" />
            <span>{t('syncLocal')}</span>
          </div>
          <button onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
            className="flex items-center gap-2 px-3 h-9 rounded-xl border border-zinc-200 bg-white text-sm font-bold text-zinc-700 hover:border-brand-500 hover:text-brand-700 transition-colors cursor-pointer">
            <Translate size={16} />
            {lang === 'en' ? <span className="font-urdu text-[15px] leading-none pt-1">اردو</span> : 'English'}
          </button>
        </header>
        <main className="flex-1 px-6 py-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
