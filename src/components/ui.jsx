import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from '@phosphor-icons/react';

export function Card({ children, className = '' }) {
  return <div className={`bg-white border border-zinc-200/70 rounded-2xl shadow-[0_10px_30px_-18px_rgba(6,78,59,0.15)] ${className}`}>{children}</div>;
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-brand-800 text-white hover:bg-brand-700 active:scale-[0.98]',
    secondary: 'bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-50 active:scale-[0.98]',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 active:scale-[0.98]',
    gold: 'bg-gold-500 text-white hover:bg-gold-400 active:scale-[0.98]',
    ghost: 'text-zinc-600 hover:bg-zinc-100 active:scale-[0.98]',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, required, children, hint, error, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[13px] font-semibold text-zinc-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export const inputCls =
  'h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm text-zinc-900 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15 transition-shadow w-full';

export function Input({ className = '', ...props }) {
  return <input className={`${inputCls} ${className}`} {...props} />;
}

export function Select({ children, className = '', ...props }) {
  return <select className={`${inputCls} ${className}`} {...props}>{children}</select>;
}

export function NumInput({ value, onChange, className = '', ...props }) {
  return (
    <input
      type="number" inputMode="decimal"
      className={`${inputCls} num text-right ${className}`}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      onWheel={(e) => e.target.blur()}
      {...props}
    />
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm no-print"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            className={`bg-white rounded-3xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto`}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-zinc-100 sticky top-0 bg-white rounded-t-3xl z-10">
              <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100 cursor-pointer" aria-label="close">
                <X size={18} weight="bold" />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Clearly visible row-action icon button — colored tint + border at all times (not only on hover)
export function IconBtn({ icon: Icon, tone = 'zinc', label, onClick, className = '' }) {
  const tones = {
    amber: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100',
    green: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    brand: 'text-brand-800 bg-brand-50 border-brand-200 hover:bg-brand-100',
    red: 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100',
    zinc: 'text-zinc-600 bg-zinc-50 border-zinc-200 hover:bg-zinc-100',
  };
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border cursor-pointer transition-colors align-middle ${tones[tone]} ${className}`}>
      <Icon size={16} weight="bold" />
    </button>
  );
}

export function Badge({ children, tone = 'zinc' }) {
  const tones = {
    zinc: 'bg-zinc-100 text-zinc-600',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-rose-50 text-rose-700',
    gold: 'bg-amber-50 text-amber-700',
    blue: 'bg-sky-50 text-sky-700',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mb-4"><Icon size={26} /></div>}
      <p className="font-semibold text-zinc-700">{title}</p>
      {hint && <p className="text-sm text-zinc-400 mt-1 max-w-xs">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, tone = 'zinc', sub }) {
  const tones = { zinc: 'text-zinc-900', green: 'text-emerald-600', red: 'text-rose-600', blue: 'text-sky-700', gold: 'text-amber-600' };
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide font-semibold text-zinc-400">{label}</span>
      <span className={`num text-lg font-bold ${tones[tone]}`}>{value}</span>
      {sub && <span className="text-xs text-zinc-400">{sub}</span>}
    </div>
  );
}
