import React from 'react';
import { useStore, partyBalance } from '../lib/store';
import { fmtRs, fmtDate, fmtDateTime, fmtWeight, amountWordsEn, amountWordsUr, dayNameBoth } from '../lib/format';
import { LogoMark } from './Logo';

// All prints are ALWAYS bilingual (EN + UR) regardless of UI language — PRD Part F.

function ShopHeader({ db, sub }) {
  const s = db.settings;
  return (
    <div className="flex items-start justify-between border-b-2 border-zinc-800 pb-3 mb-3">
      <div className="flex items-center gap-3">
        <LogoMark size={52} />
        <div>
          <div className="text-xl font-extrabold tracking-tight">{s.shopNameEn}</div>
          {s.ownerName && <div className="text-[11px] font-semibold text-zinc-700">{s.ownerName}</div>}
          <div className="text-[11px] text-zinc-600">{s.addressEn}</div>
          <div className="text-[11px] text-zinc-600 num">☎ {s.phone}</div>
        </div>
      </div>
      <div className="text-end" dir="rtl">
        <div className="font-urdu text-2xl font-bold leading-[1.6]">{s.shopNameUr}</div>
        {s.ownerNameUr && <div className="font-urdu text-[12px] font-semibold text-zinc-700">{s.ownerNameUr}</div>}
        <div className="font-urdu text-[12px] text-zinc-600">{s.addressUr}</div>
        {sub && <div className="font-urdu text-[13px] font-bold mt-1 text-zinc-800">{sub}</div>}
      </div>
    </div>
  );
}

function BiLabel({ en, ur, className = '' }) {
  return (
    <span className={className}>
      {en} <span className="font-urdu text-[0.95em]" dir="rtl">/ {ur}</span>
    </span>
  );
}

const TYPE_TITLES = {
  purchase: { en: 'PURCHASE VOUCHER', ur: 'خریداری واؤچر' },
  sale: { en: 'SALE VOUCHER', ur: 'فروخت واؤچر' },
  commission: { en: 'COMMISSION DEAL', ur: 'آڑھت سودا' },
  receipt: { en: 'RECEIPT', ur: 'رسیدِ وصولی' },
  payment: { en: 'PAYMENT VOUCHER', ur: 'رسیدِ ادائیگی' },
  advance: { en: 'ADVANCE (PESHGI)', ur: 'پیشگی' },
  advanceRecovery: { en: 'ADVANCE RECOVERY', ur: 'پیشگی واپسی' },
  expense: { en: 'EXPENSE VOUCHER', ur: 'خرچہ واؤچر' },
};

export function VoucherPrint({ txn, copy }) {
  const { db } = useStore();
  if (!txn) return null;
  const party = db.parties.find((p) => p.id === (txn.partyId || (copy === 'buyer' ? txn.buyerId : txn.sellerId)));
  const product = db.products.find((p) => p.id === txn.productId);
  const title = TYPE_TITLES[txn.type] || { en: 'VOUCHER', ur: 'واؤچر' };
  const bal = party ? partyBalance(db, party.id) : 0;
  const isCommission = txn.type === 'commission';
  const mainAmount = isCommission
    ? (copy === 'buyer' ? txn.buyerOwes : txn.sellerReceives)
    : txn.netAmount;

  return (
    <div className="print-area print-a5 text-zinc-900 p-2 max-w-[560px] mx-auto bg-white">
      <ShopHeader db={db} sub={copy === 'buyer' ? 'بیوپاری کاپی' : copy === 'seller' ? 'کسان کاپی' : null} />

      <div className="flex items-center justify-between mb-2">
        <div className="px-3 py-1 bg-zinc-900 text-white text-[12px] font-bold rounded">
          {title.en} <span className="font-urdu ms-1">/ {title.ur}</span>
        </div>
        <div className="text-end text-[11px]">
          <div className="font-bold num text-[14px]">{txn.voucherNo}</div>
          <div className="num">{fmtDateTime(txn.createdAt)}</div>
        </div>
      </div>

      <table className="w-full text-[12px] border border-zinc-300 mb-2">
        <tbody>
          <Row en="Party" ur="پارٹی" v={party ? `${party.name}${party.fatherName ? ' s/o ' + party.fatherName : ''}${party.village ? ' — ' + party.village : ''}` : '—'} />
          <Row en="Date" ur="تاریخ" v={fmtDate(txn.businessDate)} />
          {!txn.items?.length && product && <Row en="Product" ur="جنس" v={<BiLabel en={product.nameEn} ur={product.nameUr} />} />}
          {!txn.items?.length && txn.weightKg > 0 && <Row en="Weight" ur="وزن" v={`${fmtWeight(txn.weightKg)} (${txn.bags || 0} bags / بوری)`} />}
          {!txn.items?.length && txn.rate > 0 && <Row en="Rate" ur="ریٹ" v={`${fmtRs(txn.rate)} / ${txn.rateUnit === 'kg' ? 'kg' : txn.rateUnit === '100kg' ? '100 kg' : 'Mann من'}`} />}
          {txn.items?.length > 0 && <Row en="Total Weight" ur="کل وزن" v={`${fmtWeight(txn.weightKg)} (${txn.bags || 0} bags / بوری)`} />}
          {txn.grossAmount > 0 && <Row en="Gross Amount" ur="کل رقم" v={fmtRs(txn.grossAmount)} bold />}
          {(txn.kaat?.kg > 0 || txn.kaat?.amount > 0) && (
            <Row en="Kaat" ur="کاٹ" v={`${txn.kaat.kg ? '− ' + txn.kaat.kg + ' kg' : ''} ${txn.kaat.amount ? '− ' + fmtRs(txn.kaat.amount) : ''}`} />
          )}
        </tbody>
      </table>

      {/* itemised lines — one row per product in the deal */}
      {txn.items?.length > 0 && (
        <table className="w-full text-[11px] border border-zinc-300 mb-2">
          <thead>
            <tr className="bg-zinc-100">
              <th className="text-start px-2 py-1 border-b border-zinc-300"><BiLabel en="Item" ur="جنس" /></th>
              <th className="text-end px-2 py-1 border-b border-zinc-300"><BiLabel en="Bags" ur="بوری" /></th>
              <th className="text-end px-2 py-1 border-b border-zinc-300"><BiLabel en="Weight" ur="وزن" /></th>
              <th className="text-end px-2 py-1 border-b border-zinc-300"><BiLabel en="Rate" ur="ریٹ" /></th>
              <th className="text-end px-2 py-1 border-b border-zinc-300 w-24"><BiLabel en="Rs." ur="روپے" /></th>
            </tr>
          </thead>
          <tbody>
            {txn.items.map((it, i) => {
              const p = db.products.find((x) => x.id === it.productId);
              return (
                <tr key={i} className="border-b border-zinc-200 last:border-0">
                  <td className="px-2 py-1">{p?.nameEn} <span className="font-urdu" dir="rtl">/ {p?.nameUr}</span></td>
                  <td className="px-2 py-1 text-end num">{it.bags || 0}</td>
                  <td className="px-2 py-1 text-end num">{fmtWeight(it.netKg ?? it.weightKg)}</td>
                  <td className="px-2 py-1 text-end num">{fmtRs(it.rate)}/{it.rateUnit === 'kg' ? 'kg' : it.rateUnit === '100kg' ? '100kg' : 'من'}</td>
                  <td className="px-2 py-1 text-end num font-bold">{fmtRs(it.gross)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {(txn.charges || []).filter((c) => !copy || c.side === copy || !c.side).length > 0 && (
        <table className="w-full text-[11px] border border-zinc-300 mb-2">
          <thead>
            <tr className="bg-zinc-100">
              <th className="text-start px-2 py-1 border-b border-zinc-300"><BiLabel en="Charges" ur="کٹوتیاں" /></th>
              <th className="text-end px-2 py-1 border-b border-zinc-300 w-28"><BiLabel en="Rs." ur="روپے" /></th>
            </tr>
          </thead>
          <tbody>
            {(txn.charges || []).filter((c) => !copy || c.side === copy || !c.side).map((c, i) => (
              <tr key={i}>
                <td className="px-2 py-0.5">{c.nameEn} <span className="font-urdu" dir="rtl">/ {c.nameUr}</span></td>
                <td className="px-2 py-0.5 text-end num">{fmtRs(c.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isCommission && (
        <table className="w-full text-[11px] border border-zinc-300 mb-2">
          <tbody>
            {copy !== 'buyer' && txn.commission?.seller?.amount > 0 && (
              <Row en="Seller Commission" ur="کسان کمیشن" v={'− ' + fmtRs(txn.commission.seller.amount)} />
            )}
            {copy !== 'seller' && txn.commission?.buyer?.amount > 0 && (
              <Row en="Buyer Commission" ur="بیوپاری کمیشن" v={'+ ' + fmtRs(txn.commission.buyer.amount)} />
            )}
          </tbody>
        </table>
      )}

      <div className="flex items-center justify-between bg-zinc-900 text-white px-3 py-2 rounded mb-1">
        <BiLabel
          en={isCommission ? (copy === 'buyer' ? 'Buyer Owes' : 'Seller Receives') : txn.type === 'purchase' ? 'Net Payable' : txn.type === 'sale' ? 'Net Receivable' : 'Amount'}
          ur={isCommission ? (copy === 'buyer' ? 'بیوپاری کے ذمے' : 'کسان کو ملیں گے') : txn.type === 'purchase' ? 'خالص ادائیگی' : txn.type === 'sale' ? 'خالص وصولی' : 'رقم'}
          className="text-[12px] font-bold"
        />
        <span className="num text-[16px] font-extrabold">{fmtRs(mainAmount)}</span>
      </div>

      <div className="text-[11px] mb-2 border border-zinc-300 rounded px-2 py-1.5">
        <div><b>Amount in words:</b> {amountWordsEn(mainAmount)} Rupees only</div>
        <div className="font-urdu text-end leading-[1.9]" dir="rtl"><b>رقم بالفاظ:</b> {amountWordsUr(mainAmount)} روپے صرف</div>
      </div>

      <table className="w-full text-[11px] mb-2">
        <tbody>
          {txn.paidNow > 0 && <Row en="Paid Now" ur="ابھی ادا کیا" v={`${fmtRs(txn.paidNow)} (${txn.mode === 'bank' ? 'Bank بینک' : 'Cash نقد'})`} plain />}
          {txn.receivedNow > 0 && <Row en="Received Now" ur="ابھی وصول کیا" v={`${fmtRs(txn.receivedNow)} (${txn.mode === 'bank' ? 'Bank بینک' : 'Cash نقد'})`} plain />}
          {txn.advanceAdjust > 0 && <Row en="Advance Adjusted" ur="پیشگی ایڈجسٹ" v={fmtRs(txn.advanceAdjust)} plain />}
          {party && <Row en="Balance after this entry" ur="اس اندراج کے بعد بقایا"
            v={`${fmtRs(Math.abs(bal))} ${bal >= 0 ? '(Lena لینا)' : '(Dena دینا)'}`} plain bold />}
        </tbody>
      </table>

      <div className="flex justify-between text-[10px] text-zinc-500 mb-6">
        <span>Entry by / اندراج: {txn.createdByName}</span>
        <span className="num">{fmtDateTime(txn.createdAt)}</span>
      </div>

      <div className="flex justify-between gap-8 mb-3">
        <div className="flex-1 border-t border-zinc-400 pt-1 text-center text-[10px]">Signature / دستخط (Shop)</div>
        <div className="flex-1 border-t border-zinc-400 pt-1 text-center text-[10px]">Signature / دستخط (Party)</div>
      </div>

      <div className="font-urdu text-center text-[11px] text-zinc-600 border-t border-dashed border-zinc-300 pt-2" dir="rtl">
        وزن اور رقم موقع پر جانچ لیں۔ غلطی کی صورت میں اسی دن اطلاع دیں۔ شکریہ!
      </div>
      <div className="text-center text-[9px] text-zinc-400 mt-1">
        {db.settings.shopNameEn} · {db.settings.phone}
      </div>
    </div>
  );
}

function Row({ en, ur, v, bold, plain }) {
  return (
    <tr className={plain ? '' : 'border-b border-zinc-200 last:border-0'}>
      <td className={`px-2 py-1 ${bold ? 'font-bold' : ''} w-44`}>
        {en} <span className="font-urdu" dir="rtl">/ {ur}</span>
      </td>
      <td className={`px-2 py-1 ${bold ? 'font-extrabold' : 'font-semibold'} num-wrap`}>{typeof v === 'string' || typeof v === 'number' ? <span className="num-inline">{v}</span> : v}</td>
    </tr>
  );
}

export function StatementPrint({ party, entries }) {
  const { db } = useStore();
  if (!party) return null;
  let run = 0;
  const rows = entries.map((l) => { run += (l.debit || 0) - (l.credit || 0); return { ...l, run }; });
  const closing = run;
  return (
    <div className="print-area print-a4 text-zinc-900 p-2 bg-white">
      <ShopHeader db={db} />
      <div className="flex items-center justify-between mb-2">
        <div className="px-3 py-1 bg-zinc-900 text-white text-[12px] font-bold rounded">
          KHATA STATEMENT <span className="font-urdu ms-1">/ کھاتہ گوشوارہ</span>
        </div>
        <div className="text-[11px] text-end">
          <div className="font-bold text-[13px]">{party.name}{party.fatherName ? ` s/o ${party.fatherName}` : ''}</div>
          <div>{[party.village, party.phone].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      <table className="w-full text-[11px] border border-zinc-300">
        <thead>
          <tr className="bg-zinc-100 text-[10px]">
            <th className="px-1.5 py-1 border border-zinc-300">Date / تاریخ</th>
            <th className="px-1.5 py-1 border border-zinc-300">Time / وقت</th>
            <th className="px-1.5 py-1 border border-zinc-300 text-start">Description / تفصیل</th>
            <th className="px-1.5 py-1 border border-zinc-300">Debit — Lena / لینا</th>
            <th className="px-1.5 py-1 border border-zinc-300">Credit — Dena / دینا</th>
            <th className="px-1.5 py-1 border border-zinc-300">Balance / بقایا</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id}>
              <td className="px-1.5 py-1 border border-zinc-200 num text-center">{fmtDate(l.date)}</td>
              <td className="px-1.5 py-1 border border-zinc-200 num text-center">{fmtDateTime(l.createdAt).split(' ').slice(1).join(' ')}</td>
              <td className="px-1.5 py-1 border border-zinc-200">
                {l.descEn}
                <div className="font-urdu text-[10px] text-zinc-500 leading-[1.8]" dir="rtl">{l.descUr}</div>
              </td>
              <td className="px-1.5 py-1 border border-zinc-200 num text-end">{l.debit ? fmtRs(l.debit) : ''}</td>
              <td className="px-1.5 py-1 border border-zinc-200 num text-end">{l.credit ? fmtRs(l.credit) : ''}</td>
              <td className="px-1.5 py-1 border border-zinc-200 num text-end font-bold">
                {fmtRs(Math.abs(l.run))} {l.run >= 0 ? 'L' : 'D'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between bg-zinc-900 text-white px-3 py-2 rounded mt-2">
        <span className="text-[12px] font-bold">Closing Balance <span className="font-urdu">/ اختتامی بقایا</span></span>
        <span className="num text-[15px] font-extrabold">
          {fmtRs(Math.abs(closing))} {closing >= 0 ? '(Lena لینا)' : '(Dena دینا)'}
        </span>
      </div>
      <div className="text-[11px] mt-1.5 border border-zinc-300 rounded px-2 py-1.5">
        <div><b>In words:</b> {amountWordsEn(Math.abs(closing))} Rupees only</div>
        <div className="font-urdu text-end leading-[1.9]" dir="rtl"><b>بالفاظ:</b> {amountWordsUr(Math.abs(closing))} روپے صرف</div>
      </div>
      <div className="flex justify-between gap-8 mt-10">
        <div className="flex-1 border-t border-zinc-400 pt-1 text-center text-[10px]">Signature / دستخط (Shop)</div>
        <div className="flex-1 border-t border-zinc-400 pt-1 text-center text-[10px]">Signature / دستخط (Party)</div>
      </div>
    </div>
  );
}

// Generic bilingual tabular report (receivables, payables, advances, stock, profit…)
// columns: [{ en, ur, align?: 'end' }], rows: array of string/number arrays, footer: same shape as a row
export function TablePrint({ title, subtitle, columns, rows, footer }) {
  const { db } = useStore();
  return (
    <div className="print-area print-a4 text-zinc-900 p-2 bg-white">
      <ShopHeader db={db} />
      <div className="flex items-center justify-between mb-2">
        <div className="px-3 py-1 bg-zinc-900 text-white text-[12px] font-bold rounded">
          {title.en} <span className="font-urdu ms-1">/ {title.ur}</span>
        </div>
        {subtitle && <div className="text-[11px] font-bold num">{subtitle}</div>}
      </div>
      <table className="w-full text-[11px] border border-zinc-300">
        <thead>
          <tr className="bg-zinc-100 text-[10px]">
            {columns.map((c, i) => (
              <th key={i} className={`px-1.5 py-1 border border-zinc-300 ${c.align === 'end' ? 'text-end' : 'text-start'}`}>
                {c.en} <span className="font-urdu">/ {c.ur}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((v, ci) => (
                <td key={ci} className={`px-1.5 py-1 border border-zinc-200 num ${columns[ci]?.align === 'end' ? 'text-end' : ''}`}>{v}</td>
              ))}
            </tr>
          ))}
          {footer && (
            <tr className="bg-zinc-100 font-extrabold">
              {footer.map((v, ci) => (
                <td key={ci} className={`px-1.5 py-1 border border-zinc-300 num ${columns[ci]?.align === 'end' ? 'text-end' : ''}`}>{v}</td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
      <div className="text-[9px] text-zinc-400 mt-2 text-center">
        {db.settings.shopNameEn} · {db.settings.phone}
      </div>
    </div>
  );
}

export function RoznamchaPrint({ date, summary }) {
  const { db } = useStore();
  const day = dayNameBoth(date);
  const s = summary;
  const parties = Object.fromEntries(db.parties.map((p) => [p.id, p.name]));
  const label = {
    purchase: 'Purchase خریداری', sale: 'Sale فروخت', commission: 'Commission آڑھت',
    receipt: 'Receipt وصولی', payment: 'Payment ادائیگی', expense: 'Expense خرچہ',
    advance: 'Advance پیشگی', advanceRecovery: 'Recovery واپسی',
  };
  return (
    <div className="print-area print-a4 text-zinc-900 p-2 bg-white">
      <ShopHeader db={db} />
      <div className="flex items-center justify-between mb-2">
        <div className="px-3 py-1 bg-zinc-900 text-white text-[12px] font-bold rounded">
          ROZNAMCHA (DAY BOOK) <span className="font-urdu ms-1">/ روزنامچہ</span>
        </div>
        <div className="text-[12px] font-bold num">{fmtDate(date)} — {day.en} / <span className="font-urdu">{day.ur}</span></div>
      </div>
      <table className="w-full text-[11px] border border-zinc-300 mb-3">
        <thead>
          <tr className="bg-zinc-100 text-[10px]">
            <th className="px-1.5 py-1 border border-zinc-300">Voucher</th>
            <th className="px-1.5 py-1 border border-zinc-300">Time / وقت</th>
            <th className="px-1.5 py-1 border border-zinc-300">Type / قسم</th>
            <th className="px-1.5 py-1 border border-zinc-300 text-start">Party / پارٹی</th>
            <th className="px-1.5 py-1 border border-zinc-300 text-end">Rs. / روپے</th>
          </tr>
        </thead>
        <tbody>
          {s.txns.map((t) => (
            <tr key={t.id}>
              <td className="px-1.5 py-1 border border-zinc-200 num text-center">{t.voucherNo}</td>
              <td className="px-1.5 py-1 border border-zinc-200 num text-center">{fmtDateTime(t.createdAt).split(' ').slice(1).join(' ')}</td>
              <td className="px-1.5 py-1 border border-zinc-200 text-center">{label[t.type]}</td>
              <td className="px-1.5 py-1 border border-zinc-200">{parties[t.partyId] || [parties[t.sellerId], parties[t.buyerId]].filter(Boolean).join(' ⇄ ') || '—'}</td>
              <td className="px-1.5 py-1 border border-zinc-200 num text-end">{fmtRs(t.netAmount || t.grossAmount || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="w-full text-[12px] border border-zinc-300">
        <tbody>
          <Row en="Opening Cash" ur="صبح کی نقدی" v={fmtRs(s.cash.opening)} />
          <Row en="Cash In" ur="آج آمد" v={'+ ' + fmtRs(s.cash.cashIn)} />
          <Row en="Cash Out" ur="آج اخراج" v={'− ' + fmtRs(s.cash.cashOut)} />
          <Row en="Cash In Hand (Closing)" ur="موجودہ نقدی" v={fmtRs(s.cash.inHand)} bold />
        </tbody>
      </table>
    </div>
  );
}
