export const MANN_KG = 40;

export function fmtRs(n) {
  const v = Math.round(Number(n) || 0);
  return 'Rs. ' + v.toLocaleString('en-PK');
}

export function fmtNum(n) {
  return (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-PK');
}

export function kgToMann(kg) {
  const totalKg = Number(kg) || 0;
  const mann = Math.floor(totalKg / MANN_KG);
  const rem = Math.round((totalKg - mann * MANN_KG) * 100) / 100;
  return { mann, kg: rem };
}

export function fmtWeight(kg, t) {
  const { mann, kg: rem } = kgToMann(kg);
  const unit = t ? t('mann') : 'mann';
  const kgU = t ? t('kg') : 'kg';
  if (mann === 0) return `${rem} ${kgU}`;
  if (rem === 0) return `${mann} ${unit}`;
  return `${mann} ${unit} ${rem} ${kgU}`;
}

export function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }); // YYYY-MM-DD
}

export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

export function fmtDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Karachi',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  }).replace(',', '');
}

export function fmtTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

const DAY_UR = { Monday: 'پیر', Tuesday: 'منگل', Wednesday: 'بدھ', Thursday: 'جمعرات', Friday: 'جمعہ', Saturday: 'ہفتہ', Sunday: 'اتوار' };

export function dayName(iso, lang) {
  const d = new Date(iso + 'T12:00:00');
  const en = d.toLocaleDateString('en-US', { weekday: 'long' });
  return lang === 'ur' ? DAY_UR[en] || en : en;
}

export function dayNameBoth(iso) {
  const d = new Date(iso + 'T12:00:00');
  const en = d.toLocaleDateString('en-US', { weekday: 'long' });
  return { en, ur: DAY_UR[en] || en };
}

// ---------- Amount in words (South Asian: thousand, lakh, crore) ----------
const EN_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const EN_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function enBelow100(n) {
  if (n < 20) return EN_ONES[n];
  return (EN_TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + EN_ONES[n % 10] : '')).trim();
}
function enBelow1000(n) {
  const h = Math.floor(n / 100), r = n % 100;
  let s = h ? EN_ONES[h] + ' Hundred' : '';
  if (r) s += (s ? ' ' : '') + enBelow100(r);
  return s;
}
export function amountWordsEn(n) {
  n = Math.round(Math.abs(Number(n) || 0));
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  let parts = [];
  if (crore) parts.push(enBelow100(crore) + ' Crore');
  if (lakh) parts.push(enBelow100(lakh) + ' Lakh');
  if (thousand) parts.push(enBelow100(thousand) + ' Thousand');
  if (n) parts.push(enBelow1000(n));
  return parts.join(' ');
}

const UR_ONES = ['', 'ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھ', 'سات', 'آٹھ', 'نو', 'دس', 'گیارہ', 'بارہ', 'تیرہ', 'چودہ', 'پندرہ', 'سولہ', 'سترہ', 'اٹھارہ', 'انیس',
  'بیس', 'اکیس', 'بائیس', 'تئیس', 'چوبیس', 'پچیس', 'چھبیس', 'ستائیس', 'اٹھائیس', 'انتیس',
  'تیس', 'اکتیس', 'بتیس', 'تینتیس', 'چونتیس', 'پینتیس', 'چھتیس', 'سینتیس', 'اڑتیس', 'انتالیس',
  'چالیس', 'اکتالیس', 'بیالیس', 'تینتالیس', 'چوالیس', 'پینتالیس', 'چھیالیس', 'سینتالیس', 'اڑتالیس', 'انچاس',
  'پچاس', 'اکاون', 'باون', 'ترپن', 'چون', 'پچپن', 'چھپن', 'ستاون', 'اٹھاون', 'انسٹھ',
  'ساٹھ', 'اکسٹھ', 'باسٹھ', 'ترسٹھ', 'چونسٹھ', 'پینسٹھ', 'چھیاسٹھ', 'سڑسٹھ', 'اڑسٹھ', 'انہتر',
  'ستر', 'اکہتر', 'بہتر', 'تہتر', 'چوہتر', 'پچہتر', 'چھہتر', 'ستتر', 'اٹھہتر', 'اناسی',
  'اسی', 'اکیاسی', 'بیاسی', 'تراسی', 'چوراسی', 'پچاسی', 'چھیاسی', 'ستاسی', 'اٹھاسی', 'نواسی',
  'نوے', 'اکانوے', 'بانوے', 'ترانوے', 'چورانوے', 'پچانوے', 'چھیانوے', 'ستانوے', 'اٹھانوے', 'ننانوے'];

function urBelow100(n) { return UR_ONES[n] || ''; }
function urBelow1000(n) {
  const h = Math.floor(n / 100), r = n % 100;
  let s = h ? UR_ONES[h] + ' سو' : '';
  if (r) s += (s ? ' ' : '') + urBelow100(r);
  return s;
}
export function amountWordsUr(n) {
  n = Math.round(Math.abs(Number(n) || 0));
  if (n === 0) return 'صفر';
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  let parts = [];
  if (crore) parts.push(urBelow100(crore) + ' کروڑ');
  if (lakh) parts.push(urBelow100(lakh) + ' لاکھ');
  if (thousand) parts.push(urBelow100(thousand) + ' ہزار');
  if (n) parts.push(urBelow1000(n));
  return parts.join(' ');
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
