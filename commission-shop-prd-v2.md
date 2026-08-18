# PRD v2.0 — Grain Market Commission Shop Management System
## "Arhat Manager" (آڑھت منیجر)

**Version:** 2.0 (Final — incorporates all client decisions)
**Prepared for:** Grain Market (Mandi) Commission Shop, Punjab, Pakistan
**Type:** Bilingual (English + Urdu) Web Application, Offline-capable
**Users:** 1 Owner (Malik) + 1 or more Munshi (clerks)
**Timezone:** Asia/Karachi (PKT) — all timestamps
**Currency:** PKR (integers only, no paisa)

---

# PART A — BUSINESS CONTEXT & CONFIRMED DECISIONS

## A1. How a Commission Shop (Arhat) Works

A commission shop in a Pakistani grain mandi operates in two ways, often simultaneously:

**Mode 1 — Trading (خرید و فروخت / Khareed-o-Farokht):**
The shop BUYS produce from a seller (farmer) at one rate, holds it in its own stock, and later SELLS it to a buyer (beopari, flour mill, feed mill) at a higher rate. The shop's earning = margin (Sale − Purchase cost). Example: buy at Rs. 100, sell at Rs. 200 → earning Rs. 100.

**Mode 2 — Pure Commission (آڑھت / Arhat):**
The shop NEVER owns the goods. The farmer's produce passes through the shop directly to a buyer. The shop earns a commission (percentage of deal value or flat amount). Commission may be charged to the seller, the buyer, or both.

In both modes the shop also:
- Deducts market charges from the farmer's payment: Mandi fee (مارکیٹ فیس), Palledari/labor (پلے داری), Tulai/weighing (تلائی), Bardana/bags (باردانہ), Kaat/quality-moisture cut (کاٹ)
- Gives Peshgi/advances (پیشگی) to farmers before harvest and recovers them at purchase time
- Runs most business on credit (اُدھار) — every party has a running Khata (کھاتہ / ledger)

## A2. Confirmed Client Decisions (LOCKED — build accordingly)

| # | Question | Client Decision | Build Implication |
|---|----------|-----------------|-------------------|
| 1 | Trading, commission, or both? | **BOTH (دونوں)** | Every deal entry has a Mode selector: Trading Purchase / Trading Sale / Commission Deal. No mode is hidden. |
| 2 | Commission from seller, buyer, or both? | **Client selects per transaction himself.** If from both, he enters both values himself. | Commission Deal screen has independent commission fields for Seller side and Buyer side. Nothing auto-forced. Defaults can be saved in Settings but always editable per transaction. |
| 3 | Mandi fee / palledari / bardana standard rates? | **Client adds them himself.** | ZERO hardcoded rates anywhere. All charge types and their rates are created/edited by the Owner in Settings → Charges. Every transaction shows them pre-filled from Settings but fully editable per entry. |
| 4 | Extra charge on Peshgi (advance)? | **Client adds himself if he wants.** | Advance screen has an optional "Extra / Service Amount" field, plain manual number. System never auto-calculates interest. |
| 5 | Should Munshi see profit? | **NO — profit must NOT be visible to Munshi.** | Hard rule. Profit dashboard cards, Profit Report, stock valuation, margin columns — all hidden for Munshi role AND blocked at backend (security rules), not just hidden in UI. |
| 6 | Old balances (purani udhaar)? | Import needed | Opening Balance field per party + bulk Excel import tool for opening balances. |
| 7 | Printer available? | **YES (ہاں جی)** | Full print support: A5 voucher, 80mm thermal receipt option, A4 khata statement. All prints bilingual. |
| 8 | Online cost / backup / timestamps / language? | Wants **Google Drive backup**, **exact time on every entry**, **English + Urdu both** | See Part D (Backup), Part E (Timestamps & Audit), Part F (Bilingual). Hosting on free tier (cost breakdown in Part H). |

---

# PART B — USERS, ROLES & PERMISSIONS

## B1. Roles

**Owner (مالک):** full access to everything.

**Munshi (منشی):** data-entry operator. Restrictions below are enforced BOTH in UI and in backend security rules (a Munshi must not be able to fetch profit data even via browser devtools/API).

## B2. Permission Matrix

| Capability | Owner | Munshi |
|------------|-------|--------|
| Create Purchase / Sale / Commission Deal | ✅ | ✅ |
| Create Receipts / Payments / Expenses / Advances | ✅ | ✅ |
| View party khata & balances | ✅ | ✅ |
| View stock quantities | ✅ | ✅ |
| View stock VALUATION (Rs.) | ✅ | ❌ |
| View Profit Report / margin columns / dashboard profit cards | ✅ | ❌ (hard-blocked) |
| Edit an entry same day (before day-close) | ✅ | ✅ (own entries only) |
| Edit/adjust past-dated entries | ✅ | ❌ |
| Delete (soft-delete) any entry | ✅ | ❌ |
| Manage Parties (add/edit) | ✅ | ✅ (add only; edit needs Owner toggle) |
| Manage Products, Charges, Settings | ✅ | ❌ |
| Manage users, reset passwords | ✅ | ❌ |
| Run/restore backups, export data | ✅ | ❌ |
| Opening balance import | ✅ | ❌ |

## B3. Authentication
- Email/username + password (Firebase Auth). No public signup — Owner creates Munshi accounts from Settings → Users.
- Session stays logged in on shop PC (trusted device), with optional 4-digit quick PIN lock for screen.
- Every user has displayName shown on all records ("Entry by: منشی اکرم").

---

# PART C — CORE MODULES (FULL SPECIFICATION)

## C1. Parties (پارٹیاں)

One unified list — in mandi, the same person can be seller today and buyer tomorrow.

**Fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| name | text | ✅ | e.g., "Muhammad Aslam" |
| fatherName (ولدیت) | text | — | Primary disambiguator in mandi |
| village / chak (گاؤں/چک) | text | — | |
| phone | text | — | Validate 03XXXXXXXXX loosely; WhatsApp icon if present |
| cnic | text | — | Format 12345-1234567-1, optional |
| partyType | enum | ✅ | Farmer/Seller (کسان) · Buyer/Beopari (بیوپاری) · Both (دونوں) |
| openingBalance | int + direction | — | "Party owes us" (لینا) / "We owe party" (دینا) |
| notes | text | — | |
| isActive | bool | default true | Inactive parties hidden from pickers, visible in reports |

**Rules:**
- No hard delete if any transaction exists — deactivate only.
- Duplicate warning on same name+fatherName (warn, don't block).
- Party detail page shows: current balance (big, color-coded: green = lena, red = dena), total season business, outstanding peshgi, last 10 transactions, buttons: View Full Khata · Receive · Pay · New Deal.
- Search: name / father name / village / phone, works with partial text, instant (client-side index).

**Opening Balance Import (Owner only):** upload Excel (template provided: Name, FatherName, Village, Phone, Type, Amount, Direction). Preview screen → confirm → creates parties with opening balance ledger entries dated as chosen "migration date."

## C2. Products (اجناس)

| Field | Notes |
|---|---|
| name (EN + UR) | Wheat/گندم, Maize/مکئی, Rice/چاول, Cotton/کپاس, Sarson/سرسوں — Owner adds freely |
| defaultRateUnit | per Mann (default) / per kg / per 100 kg |
| isActive | |

No pricing stored on product — rates are per-transaction.

## C3. Units & Weights (CRITICAL)

- **1 Mann = 40 kg** (fixed constant).
- Weight entry component used everywhere: operator can type **kg** OR **mann + kg** (e.g., 52 mann 20 kg) OR **bags + total weight**; the component always displays the converted value live in both formats.
- Bags (بوری) count is informational (variable weight) — stored for reference and palledari/bardana per-bag calculations.
- **Amount formula:** `amount = round((totalKg / 40) × ratePerMann)` (or per-kg/per-100kg variants).
- **Kaat (کاٹ):** entered as weight (kg) deducted from gross weight BEFORE amount calc, OR as a flat Rs. amount — operator chooses per entry. Both stored.
- All reports show weight as `X mann Y kg (Z bags)`.

## C4. Charges Engine (Settings-driven — NOTHING hardcoded)

Owner defines charge types in **Settings → Charges**. Each charge type:

| Field | Options |
|---|---|
| name (EN + UR) | e.g., Mandi Fee / منڈی فیس |
| calcMethod | `% of gross` · `flat per transaction` · `per bag` · `per mann` |
| defaultValue | number (Owner sets; editable per transaction) |
| appliesTo | Purchase (seller side) · Sale (buyer side) · Commission Deal seller side · Commission Deal buyer side (multi-select) |
| retainedByShop | ✅ = counts as shop income · ❌ = pass-through (collected but paid onward — recorded as liability, not income) |
| isActive | |

Suggested seed list on first run (all values BLANK, Owner fills): Mandi Fee, Palledari, Tulai, Bardana, Brokerage, Loading, Other. Owner can rename, add, remove.

On every transaction form, active applicable charges appear as editable rows (pre-filled with default value, changeable or removable per entry, plus "Add other charge" free row).

## C5. Trading Purchase Entry (خریداری — buy from seller)

**Fields:** date (default today, editable), auto voucher no. (`P-0001`…), party (seller, search picker with "+ new party" inline), product, bags, weight (component above), rate + rate unit, **Gross Amount (auto)**, Kaat (weight or Rs.), Charges rows (from Charges Engine), → **Net Payable to Seller = Gross − kaat − charges**.

**Payment section:** Paid Now (amount + mode: Cash / Bank picker) — remainder auto-posts to seller khata as *We owe them*.

**Peshgi auto-adjust:** if seller has outstanding advances, a highlighted box shows total with per-advance checkboxes: "Adjust Rs. ___ against this purchase" → reduces cash to pay, settles advance(s) partially/fully. Adjustment appears as its own ledger line.

**Effects (single atomic batch):** stock + · seller ledger entries (gross credit, deduction lines, payment line) · cash/bank book − · retained charges → income records; pass-through charges → liability records.

**Voucher print** immediately offered (A5 + thermal, bilingual — spec in C13).

## C6. Trading Sale Entry (فروخت — sell to buyer)

Mirror of C5: voucher `S-0001`…, buyer party, product, bags, weight, rate → Gross; buyer-side charges (added ON TOP, e.g., loading) → **Net Receivable**; Received Now + remainder to buyer khata as *They owe us*.

**Stock rule:** validate against available stock; if exceeding → warning modal "Stock will go negative by X mann — continue?" (allow; mandi reality). Negative stock flagged red in stock screen.

**Profit computation (Owner-only visibility):** weighted-average cost method per product. Each sale stores `costSnapshot = avgCostPerMann × mannSold` at time of entry. Profit = net sale − costSnapshot. This value NEVER appears in Munshi UI or Munshi-accessible API responses. (Lot-wise linking = Phase 3 optional.)

## C7. Commission Deal Entry (آڑھت سودا — pass-through)

Voucher `C-0001`…

**Fields:** date, **Seller party**, **Buyer party**, product, bags, weight, rate → **Gross Deal Value (auto)**.

**Commission section (per client decision #2 — fully manual/selectable):**
- Seller-side commission: [none | % | flat] + value
- Buyer-side commission: [none | % | flat] + value
- Both fields independent; operator fills whichever apply. Settings may store default % for each side; always editable.

**Charges:** seller-side deduction rows + buyer-side addition rows (Charges Engine).

**Auto summary panel (live):**
- Buyer owes = Gross + buyer commission + buyer charges
- Seller receives = Gross − seller commission − seller deductions − kaat
- **Shop income = seller commission + buyer commission + retained charges** (Owner-only figure on reports; the entry screen shows it in a collapsible box hidden for Munshi)

**Payments:** Received from buyer now ± Paid to seller now; remainders to respective khatas.

**Effects:** NO stock movement. Two ledgers updated. Commission income records created. One deal = one voucher printed in two variants: Seller copy (کسان کاپی) and Buyer copy (بیوپاری کاپی).

## C8. Peshgi / Advance (پیشگی)

**Give Advance:** date, party, principal amount, mode (cash/bank), optional **Extra/Service Amount (manual, per decision #4)** — if filled, total recoverable = principal + extra; note field ("wheat 2026 advance"). Posts to party khata as *They owe us*, cash −.

**Recover:** (a) auto-adjust inside Purchase entry (C5), (b) standalone cash receipt tagged against the advance, (c) partial recoveries tracked per advance with remaining balance.

**Advance register:** list with party, date+time, principal, extra, recovered, outstanding, age in days; filter by season tag.

## C9. Receipts & Payments (وصولی / ادائیگی)

Standalone vouchers `R-0001` / `PAY-0001`: date, party, amount, mode (Cash / specific Bank), note, optional link to a specific deal/advance. Partial amounts fully supported. Posts to party khata + cash/bank book. Thermal/A5 receipt print with time.

## C10. Expenses (اخراجات)

Shop's own costs (non-party): date, category (Owner-manageable list: Rent, Electricity, Salaries, Tea/چائے پانی, Transport, Association Fee, Misc), amount, mode, note. Feeds Profit Report (Owner-only) and cash book (visible to Munshi as cash-out lines without profit context).

## C11. Stock (سٹاک)

- Product cards: current qty (mann+kg), approx bags, **valuation Rs. (Owner-only)**, negative-stock red flag.
- Stock ledger per product: every purchase (+), sale (−), manual adjustment (± with mandatory reason — سوکھ/dryness loss, sweeping, counting correction) — adjustments Owner-only.
- Weighted average cost maintained per product (Owner-only field).

## C12. Khata — Party Ledger (کھاتہ) — THE HEART

Per-party chronological statement:

| Date | Time | Voucher | Description (bilingual) | Debit — They owe (لینا) | Credit — We owe (دینا) | Balance |

- Every module auto-posts here; descriptions auto-composed bilingually, e.g., "Purchase P-0042 — Wheat 50 mann @ 3200 / خریداری گندم ۵۰ من".
- Running balance with direction label in both languages.
- Filters: date range, type, season tag. Jump-to-voucher on click.
- **Print/PDF statement (A4):** shop header (Urdu name in Nastaliq + English), party details, date range, table, closing balance in words (English + Urdu numerals option), signature lines. This is handed to parties — must look professional.
- WhatsApp share button: generates PDF → opens WhatsApp share with party's number (Phase 2).

## C13. Cash & Bank Book (روزنامچہ کیش / بینک)

- **Cash Book:** opening balance → every cash in/out with time and voucher link → live closing balance. Day-close summary at end of day (Owner can "lock day" — after lock, edits to that day are Owner-only and audit-logged).
- **Banks:** multiple accounts (name, bank, account no.), same ledger pattern; Cash↔Bank transfer entry type.

## C14. Printing Specification (client HAS printer)

| Document | Sizes | Content |
|---|---|---|
| Purchase / Sale / Commission voucher | **A5** + **80mm thermal** | Shop header (bilingual), voucher no., **date + exact time**, party, product, bags/weight (mann+kg), rate, gross, kaat, itemized charges, net, paid/received now, balance after this entry, "Entry by" user, Urdu footer line (terms), signature space (A5 only) |
| Receipt / Payment | A5 + thermal | Amount in figures + words (both languages), mode, balance after |
| Khata statement | **A4** | As C12 |
| Roznamcha (day book) | A4 | Full day listing + cash closing |

- Print via browser print CSS (`@media print`), dedicated stylesheet per size; thermal = 80mm width, large font, no borders.
- Urdu rendering: **Noto Nastaliq Urdu** embedded; test prints for glyph clipping (Nastaliq needs extra line-height ~2).

---

# PART D — GOOGLE DRIVE BACKUP (client requirement)

## D1. Goals
Owner's data must be safe even if the PC dies or Firebase account is lost. Backups go to the **client's own Google Drive** (his account, his 15 GB free storage — Rs. 0 cost).

## D2. Design (zero-server-cost approach)
- Owner connects Google account once: **OAuth 2.0, `drive.file` scope only** (app can only touch files it created — safe, no access to his other Drive files).
- App creates folder `Arhat-Backup/` in his Drive.
- **Auto backup:** when the Owner's app is open and last successful backup is >20 hours old, a background job runs (client-side — works on Firebase FREE tier, no Cloud Functions needed). Also a visible **"Backup Now" (ابھی بیک اپ کریں)** button.
- **Backup contents per run:**
  1. `arhat-full-YYYY-MM-DD-HHmm.json` — complete raw data dump (all collections)
  2. `arhat-ledgers-YYYY-MM-DD.xlsx` — human-readable Excel: sheet per report (Parties+balances, All transactions, Cash book, Stock) so the client can open backups WITHOUT the app
- **Retention:** keep last 30 daily + 12 monthly; older auto-pruned (configurable).
- **Status widget** on Settings & Dashboard (Owner): "Last backup: 17 Jul 2026, 9:04 PM ✅ / ⚠️ 3 days old — backup now".
- **Restore (Owner only):** pick a JSON backup from Drive → preview counts (parties: 214, transactions: 5,801…) → typed confirmation ("RESTORE") → full restore. Restores are additive-safe: current data snapshotted to Drive first automatically.
- **Local export** always available too: download JSON/Excel to PC (works fully offline).

## D3. Failure handling
- If Drive token expires → red banner for Owner with one-click re-connect.
- If offline at backup time → retry on reconnect; never lose the schedule.

---

# PART E — TIMESTAMPS & AUDIT TRAIL (client requirement: exact time on every entry)

- **Every document** stores: `createdAt` (server timestamp, to the second, PKT), `createdBy` (user id + name), `updatedAt`, `updatedBy`.
- **Entry time is displayed** on: voucher prints, roznamcha rows, khata rows (Time column), stock ledger, everywhere a record is listed. Format: `17-07-2026 09:41:33 PM`.
- **Business date vs entry time:** the operator-chosen transaction date (backdating allowed per permissions) is separate from the immutable system `createdAt`. Both shown; reports group by business date but display entry time.
- **Offline entries:** stamped with device time + `enteredOffline: true` flag; on sync, server sync time also stored (`syncedAt`). Roznamcha marks these with a small ⟳ icon.
- **Edit history:** every edit writes an immutable audit record (who, when, field-level before→after). Owner can open "History" on any voucher. Soft-deletes store reason + full reversal entries (ledger/stock/cash effects reversed by explicit counter-entries, never silent removal).
- Day-lock (C13) + audit trail together = trustable books (mandi disputes are common; the audit log is the shop's defense).

---

# PART F — BILINGUAL: ENGLISH + URDU (client requirement)

## F1. Mechanics
- **Language toggle** in header: EN / اردو — per user, remembered.
- i18n via key-based dictionary (e.g., `next-intl` or `i18next`); **every string** in the dictionary — zero hardcoded UI text.
- **Urdu = full RTL layout** (dir="rtl"): mirrored navigation, table alignment, form flow. Numbers/amounts remain LTR Western digits (mandi standard); optional Urdu-Indic digits toggle for prints only.
- Font: **Noto Nastaliq Urdu** for Urdu UI/prints; increased line-height; fallback Noto Naskh for dense tables (Nastaliq is tall — tables may use Naskh for readability, Owner toggle).
- Dates: `17-07-2026` both languages; day names bilingual on roznamcha (Friday / جمعہ).
- **Prints are ALWAYS bilingual** (both languages side-by-side on vouchers/statements) regardless of UI language — parties may read either.

## F2. Core Glossary (seed translation table — extend during build)
| English | Urdu |
|---|---|
| Purchase | خریداری |
| Sale | فروخت |
| Commission Deal | آڑھت سودا |
| Party | پارٹی |
| Farmer / Seller | کسان / بیچنے والا |
| Buyer | بیوپاری / خریدار |
| Ledger / Khata | کھاتہ |
| Balance | بقایا |
| They owe us / Receivable | لینا |
| We owe them / Payable | دینا |
| Advance | پیشگی |
| Receipt | وصولی |
| Payment | ادائیگی |
| Expense | خرچہ |
| Stock | سٹاک / مال |
| Weight | وزن |
| Mann | من |
| Bag(s) | بوری |
| Rate | ریٹ / بھاؤ |
| Gross Amount | کل رقم |
| Deduction | کٹوتی |
| Kaat | کاٹ |
| Mandi Fee | منڈی فیس |
| Palledari | پلے داری |
| Tulai | تلائی |
| Bardana | باردانہ |
| Net Payable | خالص ادائیگی |
| Net Receivable | خالص وصولی |
| Day Book | روزنامچہ |
| Cash | نقد |
| Bank | بینک |
| Report | رپورٹ |
| Settings | ترتیبات |
| Backup | بیک اپ |
| Print | پرنٹ |
| Voucher | واؤچر / رسید |
| Season | سیزن / فصل |

---

# PART G — REPORTS (all with date range, print, PDF)

1. **Roznamcha / Day Book (روزنامچہ):** every entry of the day with time, type, party, amount; sections: purchases, sales, commission deals, receipts, payments, expenses; cash opening → closing. Evening one-click print. *Munshi CAN view (no profit lines).*
2. **Profit Report (Owner only, hard-blocked for Munshi):** trading margin (sales − weighted-avg COGS) + commission income + retained charges income − expenses = Net Profit; product-wise and date-range breakdown; season comparison.
3. **Receivables (لینے):** party-wise amounts, aging buckets 0–15 / 16–30 / 31–60 / 60+ days, phone column, total. Sort by amount/age.
4. **Payables (دینے):** mirror of above.
5. **Advances Outstanding:** per C8 register.
6. **Stock Report:** quantities (all users) + valuation (Owner only).
7. **Party Business Report:** per-party total volume & value bought/sold in range — for season-end negotiation.
8. **Charges Collected Report:** per charge type — retained (income) vs pass-through (to be paid onward, e.g., market committee) with outstanding pass-through balance.
9. **Cash/Bank Book prints.**
10. **User Activity (Owner):** entries per user per day, edit/delete log.

---

# PART H — TECHNOLOGY, COST & ARCHITECTURE

## H1. Stack
- **Frontend:** Next.js (App Router) + Tailwind CSS. UI language: react i18n lib with RTL support.
- **Backend:** Firebase — Auth + **Firestore** (with **offline persistence ON**) + Firebase Hosting.
- **No paid Cloud Functions needed** in v1 (backup runs client-side per Part D) → stays on FREE Spark plan.
- **PDF/Print:** print CSS for vouchers; `pdf-lib`/browser print-to-PDF for statements.
- **Excel:** SheetJS for imports/exports.
- **Google Drive:** Google Identity Services + Drive REST v3, `drive.file` scope.

## H2. Monthly Cost (client's question answered)
| Item | Cost |
|---|---|
| Firebase Spark (Auth+Firestore+Hosting) — one shop ≈ 200–400 writes/day vs 20,000/day free quota | **Rs. 0 / month** |
| Google Drive backup (client's own free 15 GB) | **Rs. 0** |
| Domain (optional; free `.web.app` URL works) | ~Rs. 4,000–5,000 / **year** |
| Worst-case future upgrade (Blaze pay-as-you-go, only if usage explodes) | < Rs. 1,000 / month (unlikely for one shop) |

## H3. Offline Behavior (mandi internet is unreliable)
- Firestore offline persistence: all reads served from local cache; writes queue and sync automatically.
- Header **sync indicator:** 🟢 Online-synced / 🟡 X entries pending sync / 🔴 Offline.
- Offline-created vouchers print immediately (local data); flagged per Part E.
- Multi-device conflict policy: last-write-wins on same doc + audit log; in practice one PC per shop, Owner phone read-mostly.

## H4. Firestore Data Model
```
users/{uid}: { name, role: 'owner'|'munshi', pin?, lang, active }
parties/{id}: { name, fatherName, village, phone, cnic, type, openingBalance:{amount,direction}, isActive, createdAt, createdBy, ... }
products/{id}: { nameEn, nameUr, defaultRateUnit, isActive }
chargeTypes/{id}: { nameEn, nameUr, calcMethod, defaultValue, appliesTo[], retainedByShop, isActive }
transactions/{id}: {
  type: 'purchase'|'sale'|'commission'|'receipt'|'payment'|'advance'|'advanceRecovery'|'expense'|'stockAdjust'|'transfer'|'openingBalance',
  voucherNo, businessDate, seasonTag,
  partyId?, sellerId?, buyerId?, productId?,
  bags?, weightKg?, rate?, rateUnit?, grossAmount?,
  kaat?: { kg?, amount? },
  charges?: [ { chargeTypeId, name, method, value, amount, side:'seller'|'buyer', retained } ],
  commission?: { seller:{method,value,amount}?, buyer:{method,value,amount}? },
  netAmount, paidNow?, receivedNow?, mode?, bankId?,
  advanceExtraAmount?, linkedAdvanceIds?,
  costSnapshot?   // OWNER-ONLY subfield, see H5
  status:'active'|'voided', voidReason?,
  createdAt, createdBy, updatedAt, updatedBy, enteredOffline?, syncedAt?
}
ledgerEntries/{id}: { partyId, transactionId, businessDate, descEn, descUr, debit, credit, createdAt }   // denormalized, powers khata fast
stockMovements/{id}: { productId, transactionId, deltaKg, businessDate, createdAt }
cashbook/{id} & bankbook/{id}: { direction:'in'|'out', amount, transactionId, businessDate, createdAt }
auditLog/{id}: { transactionId, action:'edit'|'void'|'dayLock', byUid, at, changes:{field:{from,to}} }
settings/shop: { nameEn, nameUr, address, phone, headerLines, lockedDates[], backupConfig, voucherCounters }
```
Every financial action = **one Firestore batch write** touching transaction + ledgerEntries + stock + cash/bank atomically. Voucher numbers via transaction-safe counter.

## H5. Enforcing "Munshi cannot see profit" at backend
- `costSnapshot`, product avg cost, and Profit Report queries live behind Owner-only access: either (a) mirrored into an `ownerPrivate/` collection with security rule `allow read: role=='owner'`, or (b) Firestore rules deny Munshi reads on profit aggregate docs. UI hiding alone is NOT acceptable — implement rule-level denial and verify with a Munshi test account.
- Stock valuation & Charges-income report similarly gated.

## H6. Security Rules Summary
- All access requires auth; role read from `users/{uid}`.
- Munshi: create transactions ✅; update only own, same business-day, day not locked; delete ❌; settings/users/chargeTypes/backups read-only or denied per matrix B2.
- Owner: full. All writes validated for shape (amounts ≥ 0, weight > 0 where applicable).

---

# PART I — SCREENS LIST (build checklist)

1. Login (+ PIN lock)
2. **Dashboard with DAILY OVERVIEW BOX (آج کا خلاصہ)** — full spec in section I-A below. Plus: receivables/payables totals, stock summary, backup status widget, quick action buttons. Munshi variant: same MINUS all profit/valuation elements (backend-gated).
3. Parties list · Party detail (khata) · Party form · Opening-balance import wizard (Owner)
4. **New Purchase** · **New Sale** · **New Commission Deal** (keyboard-first: Enter advances fields, party picker with arrow keys, F-key shortcuts F2=new purchase, F3=sale, F4=deal, F9=print last voucher)
5. Advances (give / register / recover)
6. Receipts & Payments
7. Expenses
8. Stock (cards + product ledger + adjust)
9. Cash Book · Bank Book (+ transfer)
10. Reports hub (Part G) with print/PDF everywhere
11. Settings: Shop profile · Charges · Products · Users · Seasons · Backup & Restore · Day-lock · Language defaults
12. Voucher reprint/search screen (find any voucher by number/party/date)

## I-A. DAILY OVERVIEW BOX (آج کا خلاصہ) — FULL SPEC

**Purpose:** Owner ya Munshi dashboard kholte hi, bina koi report khole, ek nazar mein pura din dekh le. This is the FIRST thing on the dashboard — full width, top position.

**Behavior:**
- Defaults to TODAY; updates LIVE in real time (Firestore listeners) — every new entry anywhere instantly changes the box numbers.
- Date navigator arrows `‹ ›` + date picker to view any PAST day's box (read-only, built from that day's records — same layout).
- Every number is TAPPABLE → opens the filtered list behind it (e.g., tap "Sales 6" → today's 6 sale vouchers).
- Top-right buttons: **Print Roznamcha (روزنامچہ پرنٹ)** · sync status dot (🟢/🟡/🔴).
- Header line: `Today's Overview / آج کا خلاصہ — Friday, 17-07-2026 / جمعہ` (bilingual always).

**SECTION 1 — Cash Position (نقدی کی صورتحال)** — one horizontal strip:

| Opening Cash صبح کی نقدی | + Cash In آج آمد | − Cash Out آج اخراج | = **CASH IN HAND موجودہ نقدی** (large, bold) | Bank Total بینک |

Color coding: Cash In green, Cash Out red, Cash In Hand bold blue.

**SECTION 2 — Today's Activity Grid (آج کا کاروبار)** — 7 tiles, each showing `count · quantity · Rs. value`:

| Tile | Shows | Example |
|---|---|---|
| Purchases خریداری | entries · mann · Rs. | 4 · 210 mann · Rs. 672,000 |
| Sales فروخت | entries · mann · Rs. | 6 · 180 mann · Rs. 630,000 |
| Commission Deals آڑھت سودے | deals · mann · deal value Rs. | 2 · 300 mann · Rs. 720,000 |
| Receipts وصولی | count · Rs. received | 5 · Rs. 145,000 |
| Payments ادائیگی | count · Rs. paid | 3 · Rs. 96,650 |
| Expenses اخراجات | count · Rs. | 2 · Rs. 4,200 |
| Advances پیشگی | given Rs. / recovered Rs. | dia: 20,000 / wapsi: 15,000 |

**SECTION 3 — Udhaar Movement (ادھار کی حرکت)** — one strip:
- New udhaar created today (آج نیا لینا بنا): Rs. …
- Udhaar recovered today (آج وصول ہوا): Rs. …
- **Total Receivables now (کل لینا):** Rs. … · **Total Payables now (کل دینا):** Rs. …

**SECTION 4 — Owner-Only Profit Strip (صرف مالک)** — rendered ONLY for Owner; for Munshi this block is never sent from backend (rule-gated per H5):
- Today's Profit = trading margin + commission income + retained charges − today's expenses = **Rs. …**
- Breakdown chips: Margin Rs. … · Commission Rs. … · Charges Rs. … · Expenses −Rs. …

**SECTION 5 — Alerts Row (اطلاعات)** — only shows when applicable:
- 🟡 X entries pending sync · ⚠️ Backup 3 days old — Backup Now · 🔴 Negative stock: Wheat −12 mann · 🔒 **Day-Lock button** (Owner, end of day)

**Data source:** all figures computed from the same records that power the Roznamcha (Part G #1) — the Daily Box and printed Roznamcha for a day MUST always match rupee-to-rupee (acceptance test #9).

---

# PART J — VALIDATION & EDGE CASES

- Amounts: positive integers; rate can be decimal (2 dp) but final amounts rounded to Rs.
- Weight must be > 0 on goods transactions; kaat (kg) < gross weight.
- Paid/Received Now ≤ Net amount + tolerance toggle (Owner setting "allow overpayment → creates advance credit on party").
- Same-party seller & buyer in a commission deal → block with message.
- Backdated entry into a locked day → Owner-only + audit.
- Negative stock → warn-and-allow (flagged), never silent.
- Duplicate voucher prevention via atomic counters even offline (offline temp numbers `P-TMP-xxx` re-sequenced on sync — printed voucher shows both if reprinted).
- Party with outstanding peshgi being deactivated → block until settled or Owner override.
- Restore from backup → automatic pre-restore snapshot (D2).
- Deleting a charge type used historically → deactivate only.

---

# PART K — DELIVERY PHASES & ACCEPTANCE

**Phase 1 (MVP — go-live):** Auth+roles, Parties (+opening import), Products, Charges Engine, Purchase, Sale, Receipts/Payments, Khata + A4 statement print, Cash Book, Roznamcha, A5/thermal vouchers with exact time, bilingual UI (EN+UR, RTL), offline persistence, local export.
**Phase 2:** Commission Deal module, Peshgi module, Expenses, Banks, Google Drive backup+restore, Profit Report (Owner-gated, rules-verified), Receivable/Payable aging, day-lock, audit history UI.
**Phase 3:** WhatsApp statement share, season comparisons, charges pass-through report, user-activity report, optional lot-wise stock, Urdu-digit prints toggle.

**Acceptance tests (must pass before handover):**
1. Buy 50 mann @3200 with kaat 20 kg + 3 charges → verify net payable manually; ledger, cash, stock all correct in ONE atomic write.
2. Sell above stock → warning, negative stock flagged.
3. Commission deal with commission on BOTH sides → both khatas + shop income correct.
4. Munshi account: profit report request → **denied at backend** (test via direct API call, not just UI).
5. Turn internet OFF → make 5 entries + print vouchers → internet ON → all sync with correct timestamps and re-sequenced voucher numbers.
6. Backup to Drive → wipe test environment → restore → data identical.
7. Switch to اردو → full RTL, all screens translated, voucher prints bilingual with Nastaliq rendering clean.
8. Edit a voucher → audit history shows field-level before/after with user + time.
9. Make one entry of EVERY type in a day → Daily Overview Box updates live, every tile count/qty/Rs. matches the printed Roznamcha exactly; tapping each tile opens the correct filtered list; Munshi login pe profit strip backend se aata hi nahi (API-verified); date arrows se pichla din kholne pe us din ke figures sahi dikhte hain.
