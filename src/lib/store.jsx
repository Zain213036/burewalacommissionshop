import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { uid, todayStr, MANN_KG } from './format';

const DB_KEY = 'pcs-db-v1';
const SESSION_KEY = 'pcs-session-v1';

// Demo-grade password hash (localStorage demo only — replaced by Firebase Auth in production phase)
export function hashPw(pw) {
  let h = 5381;
  const s = 'pcs::' + pw;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return 'h' + (h >>> 0).toString(36);
}

function seedDb() {
  const now = Date.now();
  return {
    version: 1,
    users: [
      { id: 'u-owner', name: 'Malik Sahib', nameUr: 'مالک صاحب', username: 'malik', pw: hashPw('malik123'), role: 'owner', active: true },
      { id: 'u-munshi', name: 'Munshi Akram', nameUr: 'منشی اکرم', username: 'munshi', pw: hashPw('munshi123'), role: 'munshi', active: true },
    ],
    parties: [
      { id: uid(), name: 'Muhammad Aslam', fatherName: 'Ghulam Rasool', village: 'Chak 47-JB', phone: '0301-4482913', cnic: '', type: 'seller', openingBalance: { amount: 0, direction: 'lena' }, notes: '', isActive: true, createdAt: now },
      { id: uid(), name: 'Rana Shafqat', fatherName: 'Rana Bashir', village: 'Kamalia', phone: '0345-7719204', cnic: '', type: 'buyer', openingBalance: { amount: 0, direction: 'lena' }, notes: 'Flour mill agent', isActive: true, createdAt: now },
      { id: uid(), name: 'Haji Nadeem', fatherName: 'Haji Sharif', village: 'Pirmahal', phone: '0300-6621458', cnic: '', type: 'both', openingBalance: { amount: 0, direction: 'lena' }, notes: '', isActive: true, createdAt: now },
    ],
    products: [
      { id: 'pr-wheat', nameEn: 'Wheat', nameUr: 'گندم', defaultRateUnit: 'mann', defaultBhartiKg: 50, commissionMethod: 'pct', isActive: true },
      { id: 'pr-maize', nameEn: 'Maize (Corn)', nameUr: 'مکئی (چھلی)', defaultRateUnit: 'mann', defaultBhartiKg: 70, commissionMethod: 'pct', isActive: true },
      { id: 'pr-moonji', nameEn: 'Paddy (Moonji)', nameUr: 'موونجی (دھان)', defaultRateUnit: 'mann', defaultBhartiKg: 60, commissionMethod: 'pct', isActive: true },
      { id: 'pr-rice', nameEn: 'Rice', nameUr: 'چاول', defaultRateUnit: 'mann', defaultBhartiKg: 60, commissionMethod: 'pct', isActive: true },
      { id: 'pr-cotton', nameEn: 'Cotton', nameUr: 'کپاس', defaultRateUnit: 'mann', defaultBhartiKg: 40, commissionMethod: 'perMann', isActive: true },
      { id: 'pr-sarson', nameEn: 'Sarson (Mustard)', nameUr: 'سرسوں', defaultRateUnit: 'mann', defaultBhartiKg: 40, commissionMethod: 'pct', isActive: true },
    ],
    chargeTypes: [
      { id: 'ch-mandi', nameEn: 'Mandi Fee', nameUr: 'منڈی فیس', calcMethod: 'pct', defaultValue: 1, appliesTo: ['purchase', 'commissionSeller'], retainedByShop: false, isActive: true },
      { id: 'ch-palledari', nameEn: 'Palledari', nameUr: 'پلے داری', calcMethod: 'perBag', defaultValue: 15, appliesTo: ['purchase', 'sale', 'commissionSeller'], retainedByShop: false, isActive: true },
      { id: 'ch-tulai', nameEn: 'Tulai', nameUr: 'تلائی', calcMethod: 'perBag', defaultValue: 5, appliesTo: ['purchase', 'commissionSeller'], retainedByShop: true, isActive: true },
      { id: 'ch-bardana', nameEn: 'Bardana', nameUr: 'باردانہ', calcMethod: 'perBag', defaultValue: 0, appliesTo: ['purchase'], retainedByShop: true, isActive: true },
      { id: 'ch-brokerage', nameEn: 'Brokerage', nameUr: 'دلالی', calcMethod: 'flat', defaultValue: 0, appliesTo: ['sale', 'commissionBuyer'], retainedByShop: true, isActive: true },
      { id: 'ch-loading', nameEn: 'Loading', nameUr: 'لوڈنگ', calcMethod: 'perBag', defaultValue: 0, appliesTo: ['sale', 'commissionBuyer'], retainedByShop: false, isActive: true },
    ],
    expenseCategories: [
      { id: 'ec-rent', nameEn: 'Rent', nameUr: 'کرایہ' },
      { id: 'ec-elec', nameEn: 'Electricity', nameUr: 'بجلی' },
      { id: 'ec-salary', nameEn: 'Salaries', nameUr: 'تنخواہیں' },
      { id: 'ec-tea', nameEn: 'Tea / Chai Pani', nameUr: 'چائے پانی' },
      { id: 'ec-transport', nameEn: 'Transport', nameUr: 'ٹرانسپورٹ' },
      { id: 'ec-misc', nameEn: 'Misc', nameUr: 'متفرق' },
    ],
    banks: [],
    transactions: [],
    ledger: [],      // { id, partyId, txnId, date, descEn, descUr, debit, credit, createdAt, reversal? }
    cashMoves: [],   // { id, txnId, date, dir:'in'|'out', amount, mode:'cash'|'bank', bankId?, createdAt, reversal? }
    stockMoves: [],  // { id, txnId, productId, deltaKg, date, createdAt, reversal? }
    productStats: {}, // productId -> { qtyKg, avgCostPerMann }
    counters: { P: 0, S: 0, C: 0, R: 0, PAY: 0, ADV: 0, EXP: 0 },
    settings: {
      shopNameEn: 'Burewala Commission Shop',
      shopNameUr: 'بریوالہ کمیشن شاپ',
      ownerName: 'Rashid Mehmood Chaudhary',
      ownerNameUr: 'راشد محمود چوہدری',
      phone: '0333-4373688 / 0333-6283528',
      addressEn: '77-G Grain Market, Burewala',
      addressUr: '۷۷-جی غلہ منڈی، بریوالہ',
      openingCash: 0,
      season: 'Wheat 2026 / گندم ۲۰۲۶',
    },
  };
}

function migrateDb(d) {
  let changed = false;
  // Upgrade generic shop name to real client name
  if (d.settings?.shopNameEn === 'Pakistan Commission Shop') {
    d.settings = {
      ...d.settings,
      shopNameEn: 'Burewala Commission Shop',
      shopNameUr: 'بریوالہ کمیشن شاپ',
      ownerName: 'Rashid Mehmood Chaudhary',
      ownerNameUr: 'راشد محمود چوہدری',
      phone: '0333-4373688 / 0333-6283528',
      addressEn: '77-G Grain Market, Burewala',
      addressUr: '۷۷-جی غلہ منڈی، بریوالہ',
    };
    changed = true;
  }
  // Upgrade products to include defaultBhartiKg and commissionMethod
  if (d.products && d.products.some(p => !p.commissionMethod)) {
    d.products = d.products.map(p => {
      if (p.commissionMethod) return p;
      const patch = { commissionMethod: 'pct', defaultBhartiKg: 50 };
      if (p.id === 'pr-cotton') { patch.commissionMethod = 'perMann'; patch.defaultBhartiKg = 40; }
      else if (p.id === 'pr-maize') patch.defaultBhartiKg = 70;
      else if (p.id === 'pr-moonji' || p.id === 'pr-rice') patch.defaultBhartiKg = 60;
      else if (p.id === 'pr-sarson') patch.defaultBhartiKg = 40;
      return { ...p, ...patch };
    });
    changed = true;
  }
  if (changed) localStorage.setItem(DB_KEY, JSON.stringify(d));
  return d;
}

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return migrateDb(JSON.parse(raw));
  } catch (e) { console.error('db load failed', e); }
  return seedDb();
}

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [db, setDb] = useState(loadDb);
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  });
  const [lang, setLang] = useState(() => localStorage.getItem('pcs-lang') || 'en');

  useEffect(() => { localStorage.setItem(DB_KEY, JSON.stringify(db)); }, [db]);
  useEffect(() => { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }, [session]);
  useEffect(() => {
    localStorage.setItem('pcs-lang', lang);
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const user = useMemo(() => db.users.find((u) => u.id === session?.uid) || null, [db.users, session]);

  const api = useMemo(() => makeApi(db, setDb, user, setSession), [db, user]);

  const value = { db, user, lang, setLang, login: api.login, logout: api.logout, api };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  return useContext(StoreCtx);
}

// ---------------- Posting engine (immutable, atomic-style updates) ----------------

function nextVoucher(counters, prefix) {
  const n = (counters[prefix] || 0) + 1;
  return { counters: { ...counters, [prefix]: n }, voucherNo: `${prefix}-${String(n).padStart(4, '0')}` };
}

function makeApi(db, setDb, user, setSession) {
  const stamp = () => ({ createdAt: Date.now(), createdBy: user?.id, createdByName: user?.name });

  function login(username, password) {
    const u = db.users.find((x) => x.username === username.trim().toLowerCase() && x.active);
    if (!u || u.pw !== hashPw(password)) return false;
    setSession({ uid: u.id, at: Date.now() });
    return true;
  }
  function logout() { setSession(null); }

  // Generic collection helpers
  const addTo = (coll, item) => setDb((d) => ({ ...d, [coll]: [...d[coll], item] }));
  const updateIn = (coll, id, patch) =>
    setDb((d) => ({ ...d, [coll]: d[coll].map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  function addParty(p) {
    const item = { ...p, id: uid(), isActive: true, ...stamp() };
    setDb((d) => {
      let ledger = d.ledger;
      const amt = Number(p.openingBalance?.amount) || 0;
      if (amt > 0) {
        ledger = [...ledger, {
          id: uid(), partyId: item.id, txnId: null, date: todayStr(),
          descEn: 'Opening balance', descUr: 'سابقہ بقایا',
          debit: p.openingBalance.direction === 'lena' ? amt : 0,
          credit: p.openingBalance.direction === 'dena' ? amt : 0,
          createdAt: Date.now(),
        }];
      }
      return { ...d, parties: [...d.parties, item], ledger };
    });
    return item;
  }

  function updateParty(id, patch) { updateIn('parties', id, patch); }
  function saveProduct(p) {
    if (p.id) { updateIn('products', p.id, p); return p; }
    const item = { ...p, id: uid(), isActive: true };
    addTo('products', item);
    return item;
  }
  function saveChargeType(c) {
    if (c.id) updateIn('chargeTypes', c.id, c);
    else addTo('chargeTypes', { ...c, id: uid(), isActive: true });
  }
  function saveUser(u) {
    const { newPw, ...patch } = u;
    if (patch.username) patch.username = patch.username.toLowerCase();
    setDb((d) => {
      if (patch.id) {
        return { ...d, users: d.users.map((x) => x.id === patch.id ? { ...x, ...patch, pw: newPw ? hashPw(newPw) : x.pw } : x) };
      }
      return { ...d, users: [...d.users, { id: uid(), name: patch.name, nameUr: patch.nameUr || patch.name, username: patch.username, pw: hashPw(newPw || '1234'), role: patch.role, active: true }] };
    });
  }
  function saveBank(b) {
    if (b.id) updateIn('banks', b.id, b);
    else addTo('banks', { ...b, id: uid() });
  }
  function saveSettings(patch) { setDb((d) => ({ ...d, settings: { ...d.settings, ...patch } })); }
  function addExpenseCategory(c) { addTo('expenseCategories', { ...c, id: uid() }); }

  // Core: post a transaction with all its effects in ONE setDb (atomic within localStorage)
  function postTransaction(txn) {
    let saved = null;
    setDb((d) => {
      const prefixMap = { purchase: 'P', sale: 'S', commission: 'C', receipt: 'R', payment: 'PAY', advance: 'ADV', advanceRecovery: 'R', expense: 'EXP' };
      // an edit re-posts under the SAME voucher number — only brand-new entries take a fresh number
      let counters = d.counters;
      let voucherNo = txn.voucherNo;
      if (!voucherNo) {
        const r = nextVoucher(d.counters, prefixMap[txn.type] || 'V');
        counters = r.counters; voucherNo = r.voucherNo;
      }
      const t = { ...txn, id: uid(), voucherNo, status: 'active', ...stamp() };

      const ledger = [...d.ledger];
      const cashMoves = [...d.cashMoves];
      const stockMoves = [...d.stockMoves];
      const productStats = { ...d.productStats };
      let transactions = [...d.transactions];

      const L = (partyId, descEn, descUr, debit, credit) =>
        ledger.push({ id: uid(), partyId, txnId: t.id, date: t.businessDate, descEn, descUr, debit: Math.round(debit || 0), credit: Math.round(credit || 0), createdAt: t.createdAt });
      const CM = (dir, amount, mode, bankId) => {
        if (!amount) return;
        cashMoves.push({ id: uid(), txnId: t.id, date: t.businessDate, dir, amount: Math.round(amount), mode: mode || 'cash', bankId: bankId || null, createdAt: t.createdAt });
      };
      const SM = (productId, deltaKg) => {
        stockMoves.push({ id: uid(), txnId: t.id, productId, deltaKg, date: t.businessDate, createdAt: t.createdAt });
        const st = productStats[productId] || { qtyKg: 0, avgCostPerMann: 0 };
        productStats[productId] = { ...st, qtyKg: Math.round((st.qtyKg + deltaKg) * 100) / 100 };
      };

      const pn = (id) => d.parties.find((p) => p.id === id)?.name || '';
      const prodName = (id) => d.products.find((p) => p.id === id);

      // every trade is a list of items — old single-item vouchers become a one-item list
      const tradeItems = (t.items && t.items.length)
        ? t.items
        : [{ productId: t.productId, weightKg: t.weightKg || 0, kaatKg: t.kaat?.kg || 0, netKg: (t.weightKg || 0) - (t.kaat?.kg || 0), gross: t.grossAmount || 0 }];
      const itemsLabel = (nameKey) => {
        const first = prodName(tradeItems[0]?.productId)?.[nameKey] || '';
        return tradeItems.length > 1 ? `${first} +${tradeItems.length - 1}` : first;
      };

      if (t.type === 'purchase') {
        const desc = `Purchase ${voucherNo} — ${itemsLabel('nameEn')} ${t.weightLabel}`;
        const descUr = `خریداری ${voucherNo} — ${itemsLabel('nameUr')} ${t.weightLabel}`;
        L(t.partyId, desc, descUr, 0, t.netAmount);
        if (t.paidNow > 0) { L(t.partyId, `Paid — ${voucherNo}`, `ادائیگی — ${voucherNo}`, t.paidNow, 0); CM('out', t.paidNow, t.mode, t.bankId); }
        if (t.advanceAdjust > 0) {
          L(t.partyId, `Advance adjusted — ${voucherNo}`, `پیشگی ایڈجسٹ — ${voucherNo}`, t.advanceAdjust, 0);
          transactions = transactions.map((x) => t.linkedAdvanceIds?.includes(x.id)
            ? { ...x, recovered: Math.min((x.recovered || 0) + (t.advanceAdjustMap?.[x.id] || 0), (x.principal || 0) + (x.extra || 0)) } : x);
        }
        // stock in + weighted average cost per product; net cost split across items by their gross share
        const totalGross = tradeItems.reduce((s, it) => s + (it.gross || 0), 0);
        tradeItems.forEach((it) => {
          const netKg = it.netKg ?? ((it.weightKg || 0) - (it.kaatKg || 0));
          if (!it.productId || netKg <= 0) return;
          SM(it.productId, netKg);
          const costShare = totalGross > 0 ? t.netAmount * ((it.gross || 0) / totalGross) : t.netAmount / tradeItems.length;
          const st = productStats[it.productId];
          const prevQty = st.qtyKg - netKg;
          const prevVal = (prevQty / MANN_KG) * (st.avgCostPerMann || 0);
          const newQtyMann = st.qtyKg / MANN_KG;
          productStats[it.productId] = { ...st, avgCostPerMann: newQtyMann > 0 ? Math.round((prevVal + costShare) / newQtyMann) : 0 };
        });
      }

      if (t.type === 'sale') {
        const desc = `Sale ${voucherNo} — ${itemsLabel('nameEn')} ${t.weightLabel}`;
        const descUr = `فروخت ${voucherNo} — ${itemsLabel('nameUr')} ${t.weightLabel}`;
        L(t.partyId, desc, descUr, t.netAmount, 0);
        if (t.receivedNow > 0) { L(t.partyId, `Received — ${voucherNo}`, `وصولی — ${voucherNo}`, 0, t.receivedNow); CM('in', t.receivedNow, t.mode, t.bankId); }
        // stock out per item; cost snapshot = sum of each item's qty × its product's avg cost (OWNER-ONLY)
        let cost = 0;
        tradeItems.forEach((it) => {
          const netKg = it.netKg ?? ((it.weightKg || 0) - (it.kaatKg || 0));
          if (!it.productId || netKg <= 0) return;
          const st = d.productStats[it.productId] || { qtyKg: 0, avgCostPerMann: 0 };
          cost += (netKg / MANN_KG) * (st.avgCostPerMann || 0);
          SM(it.productId, -netKg);
        });
        t.costSnapshot = Math.round(cost);
      }

      if (t.type === 'commission') {
        L(t.buyerId, `Commission deal ${voucherNo} — ${itemsLabel('nameEn')} ${t.weightLabel}`, `آڑھت سودا ${voucherNo} — ${itemsLabel('nameUr')} ${t.weightLabel}`, t.buyerOwes, 0);
        if (t.receivedNow > 0) { L(t.buyerId, `Received — ${voucherNo}`, `وصولی — ${voucherNo}`, 0, t.receivedNow); CM('in', t.receivedNow, t.mode, t.bankId); }
        L(t.sellerId, `Commission deal ${voucherNo} — ${itemsLabel('nameEn')} ${t.weightLabel}`, `آڑھت سودا ${voucherNo} — ${itemsLabel('nameUr')} ${t.weightLabel}`, 0, t.sellerReceives);
        if (t.paidNow > 0) { L(t.sellerId, `Paid — ${voucherNo}`, `ادائیگی — ${voucherNo}`, t.paidNow, 0); CM('out', t.paidNow, t.mode, t.bankId); }
      }

      if (t.type === 'receipt') { L(t.partyId, `Receipt ${voucherNo}${t.note ? ' — ' + t.note : ''}`, `وصولی ${voucherNo}`, 0, t.netAmount); CM('in', t.netAmount, t.mode, t.bankId); }
      if (t.type === 'payment') { L(t.partyId, `Payment ${voucherNo}${t.note ? ' — ' + t.note : ''}`, `ادائیگی ${voucherNo}`, t.netAmount, 0); CM('out', t.netAmount, t.mode, t.bankId); }

      if (t.type === 'advance') {
        const totalRec = (t.principal || 0) + (t.extra || 0);
        t.netAmount = totalRec; t.recovered = 0;
        L(t.partyId, `Advance ${voucherNo}${t.note ? ' — ' + t.note : ''}`, `پیشگی ${voucherNo}`, totalRec, 0);
        CM('out', t.principal, t.mode, t.bankId);
      }

      if (t.type === 'advanceRecovery') {
        L(t.partyId, `Advance recovery ${voucherNo}`, `پیشگی واپسی ${voucherNo}`, 0, t.netAmount);
        CM('in', t.netAmount, t.mode, t.bankId);
        transactions = transactions.map((x) => x.id === t.advanceId
          ? { ...x, recovered: Math.min((x.recovered || 0) + t.netAmount, (x.principal || 0) + (x.extra || 0)) } : x);
      }

      if (t.type === 'expense') { CM('out', t.netAmount, t.mode, t.bankId); }

      transactions.push(t);
      saved = t;
      return { ...d, counters, transactions, ledger, cashMoves, stockMoves, productStats };
    });
    return saved;
  }

  function voidTransaction(txnId, reason) {
    setDb((d) => {
      const t = d.transactions.find((x) => x.id === txnId);
      if (!t || t.status === 'voided') return d;
      const now = Date.now();
      const rev = (arr, invert) => [
        ...arr,
        ...arr.filter((e) => e.txnId === txnId && !e.reversal).map((e) => invert(e, now)),
      ];
      const ledger = rev(d.ledger, (e, ts) => ({ ...e, id: uid(), debit: e.credit, credit: e.debit, descEn: `REVERSAL — ${e.descEn}`, descUr: `منسوخی — ${e.descUr}`, createdAt: ts, reversal: true }));
      const cashMoves = rev(d.cashMoves, (e, ts) => ({ ...e, id: uid(), dir: e.dir === 'in' ? 'out' : 'in', createdAt: ts, reversal: true }));
      const stockMoves = rev(d.stockMoves, (e, ts) => ({ ...e, id: uid(), deltaKg: -e.deltaKg, createdAt: ts, reversal: true }));
      const productStats = { ...d.productStats };
      d.stockMoves.filter((e) => e.txnId === txnId && !e.reversal).forEach((e) => {
        const st = productStats[e.productId];
        if (st) productStats[e.productId] = { ...st, qtyKg: Math.round((st.qtyKg - e.deltaKg) * 100) / 100 };
      });
      const transactions = d.transactions.map((x) => x.id === txnId
        ? { ...x, status: 'voided', voidReason: reason || '', voidedAt: now, voidedBy: user?.id } : x);
      return { ...d, transactions, ledger, cashMoves, stockMoves, productStats };
    });
  }

  // Edit = void the old entry (leaves an audit reversal) + repost under the same voucher number
  function editTransaction(txnId, data) {
    const old = db.transactions.find((x) => x.id === txnId);
    if (!old || old.status === 'voided') return null;
    voidTransaction(txnId, 'edited');
    return postTransaction({ ...data, voucherNo: old.voucherNo, editedFrom: txnId });
  }

  function exportJson() {
    return JSON.stringify(db, null, 2);
  }
  function importJson(text) {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.parties)) throw new Error('invalid');
    setDb(parsed);
  }

  return {
    login, logout, addParty, updateParty, saveProduct, saveChargeType, saveUser, saveBank,
    saveSettings, addExpenseCategory, postTransaction, voidTransaction, editTransaction, exportJson, importJson,
  };
}

// ---------------- Selectors ----------------

// Duplicate-entry guard: same type + same party + same amount + same day, saved in the last 10 minutes
export function findDuplicate(db, { type, partyId, sellerId, buyerId, netAmount, businessDate }) {
  const cutoff = Date.now() - 10 * 60 * 1000;
  return db.transactions.find((t) =>
    t.status === 'active' && t.type === type && t.businessDate === businessDate &&
    (t.partyId || null) === (partyId || null) &&
    (t.sellerId || null) === (sellerId || null) &&
    (t.buyerId || null) === (buyerId || null) &&
    Math.round(t.netAmount || 0) === Math.round(netAmount || 0) &&
    t.createdAt >= cutoff);
}

export function partyBalance(db, partyId) {
  return db.ledger.filter((l) => l.partyId === partyId)
    .reduce((s, l) => s + (l.debit || 0) - (l.credit || 0), 0); // + = lena, − = dena
}

export function allBalances(db) {
  const map = {};
  db.ledger.forEach((l) => { map[l.partyId] = (map[l.partyId] || 0) + (l.debit || 0) - (l.credit || 0); });
  return map;
}

export function cashBalance(db, uptoDate) {
  let bal = Number(db.settings.openingCash) || 0;
  db.cashMoves.forEach((m) => {
    if (m.mode !== 'cash') return;
    if (uptoDate && m.date > uptoDate) return;
    bal += m.dir === 'in' ? m.amount : -m.amount;
  });
  return bal;
}

export function bankBalance(db) {
  let bal = 0;
  db.cashMoves.forEach((m) => { if (m.mode === 'bank') bal += m.dir === 'in' ? m.amount : -m.amount; });
  return bal;
}

export function stockQty(db, productId) {
  return db.productStats[productId]?.qtyKg || 0;
}

export function outstandingAdvances(db, partyId) {
  return db.transactions.filter((t) => t.type === 'advance' && t.status === 'active'
    && (!partyId || t.partyId === partyId)
    && ((t.principal || 0) + (t.extra || 0)) - (t.recovered || 0) > 0);
}

export function retainedChargesIncome(txn) {
  let inc = 0;
  (txn.charges || []).forEach((c) => { if (c.retained) inc += c.amount || 0; });
  return inc;
}

export function commissionIncomeOf(txn) {
  return (txn.commission?.seller?.amount || 0) + (txn.commission?.buyer?.amount || 0);
}

export function daySummary(db, date) {
  const txns = db.transactions.filter((t) => t.businessDate === date && t.status === 'active');
  const of = (type) => txns.filter((t) => t.type === type);
  const sum = (arr, f) => arr.reduce((s, t) => s + (f(t) || 0), 0);
  const kgOf = (arr) => arr.reduce((s, t) => s + ((t.weightKg || 0) - (t.kaat?.kg || 0)), 0);

  const purchases = of('purchase'), sales = of('sale'), commissions = of('commission');
  const receipts = of('receipt'), payments = of('payment'), expenses = of('expense');
  const advances = of('advance'), recoveries = of('advanceRecovery');

  const dayCash = db.cashMoves.filter((m) => m.date === date && m.mode === 'cash');
  const cashIn = dayCash.filter((m) => m.dir === 'in').reduce((s, m) => s + m.amount, 0);
  const cashOut = dayCash.filter((m) => m.dir === 'out').reduce((s, m) => s + m.amount, 0);

  let opening = Number(db.settings.openingCash) || 0;
  db.cashMoves.forEach((m) => {
    if (m.mode !== 'cash' || m.date >= date) return;
    opening += m.dir === 'in' ? m.amount : -m.amount;
  });

  const dayLedger = db.ledger.filter((l) => l.date === date);
  const newUdhaar = dayLedger.reduce((s, l) => s + (l.debit || 0), 0);
  const udhaarRecovered = dayLedger.reduce((s, l) => s + (l.credit || 0), 0);

  const balances = allBalances(db);
  let totalReceivables = 0, totalPayables = 0;
  Object.values(balances).forEach((b) => { if (b > 0) totalReceivables += b; else totalPayables += -b; });

  const marginToday = sum(sales, (t) => (t.netAmount || 0) - (t.costSnapshot || 0));
  const commissionToday = sum(commissions, commissionIncomeOf);
  const chargesToday = sum(txns, retainedChargesIncome);
  const expensesToday = sum(expenses, (t) => t.netAmount);
  const profitToday = marginToday + commissionToday + chargesToday - expensesToday;

  return {
    date, txns,
    cash: { opening, cashIn, cashOut, inHand: opening + cashIn - cashOut, bank: bankBalance(db) },
    tiles: {
      purchases: { count: purchases.length, kg: kgOf(purchases), rs: sum(purchases, (t) => t.netAmount) },
      sales: { count: sales.length, kg: kgOf(sales), rs: sum(sales, (t) => t.netAmount) },
      commissions: { count: commissions.length, kg: kgOf(commissions), rs: sum(commissions, (t) => t.grossAmount) },
      receipts: { count: receipts.length, rs: sum(receipts, (t) => t.netAmount) },
      payments: { count: payments.length, rs: sum(payments, (t) => t.netAmount) },
      expenses: { count: expenses.length, rs: sum(expenses, (t) => t.netAmount) },
      advances: { given: sum(advances, (t) => t.principal), recovered: sum(recoveries, (t) => t.netAmount) + sum(purchases, (t) => t.advanceAdjust) },
    },
    udhaar: { created: newUdhaar, recovered: udhaarRecovered, totalReceivables, totalPayables },
    profit: { margin: marginToday, commission: commissionToday, charges: chargesToday, expenses: expensesToday, net: profitToday },
    negativeStock: db.products.filter((p) => p.isActive && (db.productStats[p.id]?.qtyKg || 0) < 0),
  };
}
