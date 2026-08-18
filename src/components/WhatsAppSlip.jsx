import React, { useState } from 'react';
import { WhatsappLogo, Copy, CheckCircle, X } from '@phosphor-icons/react';
import { useStore } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs, fmtWeight, fmtDate, MANN_KG } from '../lib/format';
import { Modal, Button } from './ui';

/**
 * Generates a WhatsApp-ready weight slip message for a transaction.
 * Opens wa.me pre-filled link when "Open WhatsApp" is clicked.
 * Falls back to copy-to-clipboard if no phone number is available.
 */
export function WhatsAppSlip({ txn, partyPhone, partyName, open, onClose }) {
  const { db, lang } = useStore();
  const t = makeT(lang);
  const [copied, setCopied] = useState(false);

  if (!txn || !open) return null;

  const shopName = db.settings.shopNameEn || 'Commission Shop';
  const shopPhone = db.settings.phone || '';
  const shopAddress = db.settings.addressEn || '';

  // Build items label
  const items = txn.items?.length
    ? txn.items
    : [{ productId: txn.productId, weightKg: txn.weightKg, bags: txn.bags }];

  const itemLines = items.map((it) => {
    const prod = db.products.find((p) => p.id === it.productId);
    const prodName = prod ? `${prod.nameEn} / ${prod.nameUr}` : '';
    const totalKg = it.weightKg || 0;
    const mann = Math.floor(totalKg / MANN_KG);
    const remKg = Math.round((totalKg - mann * MANN_KG) * 100) / 100;
    const mannStr = mann > 0 ? `${mann} Mann` : '';
    const kgStr = remKg > 0 ? `${remKg} kg` : '';
    const weight = [mannStr, kgStr].filter(Boolean).join(' ');
    return `• ${prodName}: ${it.bags || 0} bags | ${weight}`;
  }).join('\n');

  const rate = txn.rate ? `Rs. ${txn.rate}/${txn.rateUnit === 'mann' ? 'Mann' : txn.rateUnit}` : '';
  const typeLabel = txn.type === 'purchase'
    ? `Purchase (خریداری) — ${partyName || 'Seller'}`
    : txn.type === 'sale'
    ? `Sale (فروخت) — ${partyName || 'Buyer'}`
    : `Commission Deal (آڑھت سودا)`;

  const message = [
    `🌾 *${shopName}*`,
    `📍 ${shopAddress}`,
    `📞 ${shopPhone}`,
    `─────────────────`,
    `📄 *${txn.voucherNo}* | ${fmtDate(txn.businessDate)}`,
    `${typeLabel}`,
    `─────────────────`,
    `*Weight / وزن:*`,
    itemLines,
    ``,
    rate ? `*Rate / ریٹ:* ${rate}` : '',
    txn.grossAmount || txn.netAmount
      ? `*Gross / کل رقم:* ${fmtRs(txn.grossAmount || txn.netAmount)}`
      : '',
    txn.netAmount
      ? `*Net / خالص رقم:* ${fmtRs(txn.netAmount)}`
      : '',
    `─────────────────`,
    `برائے کرم وزن اور رقم موقع پر جانچ لیں۔`,
    `Please verify weight & amount at time of deal.`,
  ].filter(Boolean).join('\n');

  const phone = (partyPhone || '').replace(/[^0-9]/g, '');
  const waPhone = phone.startsWith('0') ? '92' + phone.slice(1) : phone;
  const waUrl = phone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}` : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('whatsAppSlip')}>
      {/* Preview */}
      <div className="bg-[#f0f2f5] rounded-2xl p-4 mb-4 font-mono text-xs leading-relaxed whitespace-pre-wrap border border-zinc-200 max-h-72 overflow-y-auto text-zinc-700">
        {message}
      </div>

      {/* Party phone info */}
      <div className="mb-4 text-sm">
        {phone ? (
          <p className="text-zinc-600">
            Sending to: <span className="num font-bold text-zinc-800">{partyPhone}</span>
          </p>
        ) : (
          <p className="text-amber-600 font-semibold">⚠ {t('noPhone')} — you can copy the message instead.</p>
        )}
      </div>

      <p className="text-xs text-zinc-400 mb-4">{t('waHint')}</p>

      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="secondary" onClick={handleCopy}>
          {copied ? <CheckCircle size={16} weight="fill" className="text-green-600" /> : <Copy size={16} />}
          {copied ? t('messageCopied') : t('copyMessage')}
        </Button>
        {waUrl ? (
          <Button
            className="bg-[#25D366] hover:bg-[#1ebe5d] text-white"
            onClick={() => window.open(waUrl, '_blank', 'noopener')}>
            <WhatsappLogo size={18} weight="fill" /> {t('openWhatsApp')}
          </Button>
        ) : (
          <Button disabled className="opacity-50 cursor-not-allowed">
            <WhatsappLogo size={18} weight="fill" /> {t('openWhatsApp')}
          </Button>
        )}
      </div>
    </Modal>
  );
}
