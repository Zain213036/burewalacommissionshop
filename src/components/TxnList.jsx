import React, { useState } from 'react';
import { PencilSimple, Trash, Printer, HandCoins, ListDashes, FilePdf, WhatsappLogo } from '@phosphor-icons/react';
import { useStore } from '../lib/store';
import { makeT } from '../lib/i18n';
import { fmtRs, fmtWeight, fmtDateTime, todayStr } from '../lib/format';
import { Card, EmptyState, Badge, Input, IconBtn } from './ui';
import { PartialCashModal } from './PartialCashModal';
import { WhatsAppSlip } from './WhatsAppSlip';

// Daily entries table shown under every entry form.
// types: e.g. ['purchase'] — which transaction types to list
// onEditTxn: only wired for purchase/sale; onReprint: print voucher; onSaved: for partial-cash prints
export function TxnList({ types, onEditTxn, onReprint, onSaved }) {
  const { db, lang, api, user } = useStore();
  const t = makeT(lang);
  const [date, setDate] = useState(todayStr());
  const [cashFor, setCashFor] = useState(null);
  const [waSlip, setWaSlip] = useState(null); // { txn, partyPhone, partyName }

  const list = db.transactions
    .filter((x) => types.includes(x.type) && x.businessDate === date)
    .sort((a, b) => b.createdAt - a.createdAt);

  const pname = (id) => db.parties.find((p) => p.id === id)?.name;
  const partyOf = (x) => db.parties.find((p) => p.id === (x.partyId || x.buyerId));
  const prodName = (x) => {
    const p = db.products.find((pr) => pr.id === x.productId);
    const first = p ? (lang === 'ur' ? p.nameUr : p.nameEn) : '';
    return x.items?.length > 1 ? `${first} +${x.items.length - 1}` : first;
  };
  const canModify = (x) => user?.role === 'owner' || x.businessDate === todayStr();
  const doDelete = (x) => {
    if (window.confirm(`${t('confirmDeleteEntry')} (${x.voucherNo})`)) api.voidTransaction(x.id, 'deleted');
  };

  const totalRs = list.filter((x) => x.status === 'active').reduce((s, x) => s + (x.netAmount || x.grossAmount || 0), 0);

  return (
    <>
      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-zinc-100">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-600">
            <ListDashes size={17} className="text-brand-700" />
            {t('todayEntries')}
            <Badge tone="green">{list.filter((x) => x.status === 'active').length}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="num text-sm font-extrabold text-zinc-700">{fmtRs(totalRs)}</span>
            <Input type="date" className="num !w-40 !h-9" value={date} max={todayStr()}
              onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
        </div>
        {list.length === 0 ? (
          <EmptyState icon={ListDashes} title={t('noEntries')} hint={t('noEntriesHint')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
                  <th className="text-start font-bold px-4 py-2.5">{t('voucher')}</th>
                  <th className="text-start font-bold px-4 py-2.5">{t('party')}</th>
                  <th className="text-start font-bold px-4 py-2.5">{t('qty')}</th>
                  <th className="text-end font-bold px-4 py-2.5">{t('amount')}</th>
                  <th className="text-end font-bold px-4 py-2.5">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((x) => {
                  const voided = x.status === 'voided';
                  const label = x.type === 'commission'
                    ? `${pname(x.sellerId) || '—'} ⇄ ${pname(x.buyerId) || '—'}`
                    : pname(x.partyId) || '—';
                  return (
                    <tr key={x.id} className={`border-b border-zinc-50 last:border-0 ${voided ? 'opacity-40' : 'hover:bg-zinc-50/60'}`}>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="num font-bold text-zinc-700">{x.voucherNo}</span>
                        <span className="block text-[11px] text-zinc-400 num">{fmtDateTime(x.createdAt).split(' ').slice(1).join(' ')}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-zinc-800">{label}</span>
                        {voided && <Badge tone="red">{t('voided')}</Badge>}
                        {x.note && !voided && <span className="block text-[11px] text-zinc-400">{x.note}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap">
                        {x.weightKg > 0 ? (
                          <>
                            <span className="font-semibold">{prodName(x)}</span>
                            <span className="num block text-[11px]">{fmtWeight((x.weightKg || 0) - (x.kaat?.kg || 0), t)}</span>
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 num text-end font-extrabold text-zinc-900 whitespace-nowrap">
                        {fmtRs(x.netAmount || x.grossAmount || 0)}
                      </td>
                      <td className="px-3 py-2.5 text-end whitespace-nowrap">
                        <div className="inline-flex gap-1.5">
                          {!voided && ['purchase', 'sale'].includes(x.type) && canModify(x) && onEditTxn && (
                            <IconBtn icon={PencilSimple} tone="amber" label={t('edit')} onClick={() => onEditTxn(x)} />
                          )}
                          {!voided && partyOf(x) && (
                            <IconBtn icon={HandCoins} tone="green" label={`${t('receiveCash')} / ${t('payCash')}`}
                              onClick={() => setCashFor(partyOf(x))} />
                          )}
                          {!voided && onReprint && (
                            <>
                              <IconBtn icon={Printer} tone="brand" label={t('print')} onClick={() => onReprint(x)} />
                              <IconBtn icon={FilePdf} tone="zinc" label={t('downloadPdf')} onClick={() => onReprint(x, 'pdf')} />
                            </>
                          )}
                          {!voided && partyOf(x)?.phone && (
                            <IconBtn
                              icon={WhatsappLogo}
                              tone="green"
                              label={t('sendWhatsApp')}
                              onClick={() => {
                                const party = partyOf(x);
                                setWaSlip({ txn: x, partyPhone: party?.phone, partyName: party?.name });
                              }}
                            />
                          )}
                          {!voided && canModify(x) && (
                            <IconBtn icon={Trash} tone="red" label={t('delete')} onClick={() => doDelete(x)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <PartialCashModal party={cashFor} onClose={() => setCashFor(null)} onSaved={onSaved} />
      {waSlip && (
        <WhatsAppSlip
          open={!!waSlip}
          txn={waSlip.txn}
          partyPhone={waSlip.partyPhone}
          partyName={waSlip.partyName}
          onClose={() => setWaSlip(null)}
        />
      )}
    </>
  );
}
