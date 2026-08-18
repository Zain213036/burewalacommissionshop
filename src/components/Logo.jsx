import React from 'react';

export function LogoMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Pakistan Commission Shop logo">
      <defs>
        <linearGradient id="lg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#065f46" />
          <stop offset="1" stopColor="#022c22" />
        </linearGradient>
        <linearGradient id="lg-gold" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#b45309" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#lg-bg)" />
      <rect x="2" y="2" width="60" height="60" rx="16" fill="none" stroke="#34d399" strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M 24 12 A 17 17 0 1 0 24 52 A 21.5 21.5 0 0 1 24 12 Z" fill="#34d399" opacity="0.9" />
      <g stroke="url(#lg-gold)" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M36 52 V 16" />
      </g>
      <g fill="url(#lg-gold)">
        <ellipse cx="30.5" cy="22" rx="5" ry="2.6" transform="rotate(-35 30.5 22)" />
        <ellipse cx="41.5" cy="22" rx="5" ry="2.6" transform="rotate(35 41.5 22)" />
        <ellipse cx="30.5" cy="30" rx="5" ry="2.6" transform="rotate(-35 30.5 30)" />
        <ellipse cx="41.5" cy="30" rx="5" ry="2.6" transform="rotate(35 41.5 30)" />
        <ellipse cx="30.5" cy="38" rx="5" ry="2.6" transform="rotate(-35 30.5 38)" />
        <ellipse cx="41.5" cy="38" rx="5" ry="2.6" transform="rotate(35 41.5 38)" />
        <ellipse cx="36" cy="13.5" rx="2.6" ry="4.6" />
      </g>
      <path d="M14 14 l1.2 2.6 2.8 .3 -2.1 1.9 .6 2.8 -2.5 -1.5 -2.5 1.5 .6 -2.8 -2.1 -1.9 2.8 -.3 Z" fill="#fbbf24" />
    </svg>
  );
}

export function LogoLockup({ size = 44, dark = false, lang = 'en' }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      <div className="flex flex-col leading-tight">
        {lang === 'ur' ? (
          <>
            <span className={`font-urdu text-[17px] font-bold ${dark ? 'text-white' : 'text-brand-900'}`}>پاکستان کمیشن شاپ</span>
            <span className={`text-[10px] tracking-[0.18em] uppercase font-semibold ${dark ? 'text-brand-300' : 'text-brand-700/70'}`}>Pakistan Commission Shop</span>
          </>
        ) : (
          <>
            <span className={`text-[15px] font-extrabold tracking-tight ${dark ? 'text-white' : 'text-brand-900'}`}>Pakistan Commission Shop</span>
            <span className={`font-urdu text-[13px] ${dark ? 'text-brand-300' : 'text-brand-700/80'}`}>پاکستان کمیشن شاپ</span>
          </>
        )}
      </div>
    </div>
  );
}
