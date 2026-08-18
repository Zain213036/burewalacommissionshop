import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './lib/store';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Parties } from './pages/Parties';
import { TradeForm } from './pages/TradeForm';
import { CommissionForm } from './pages/CommissionForm';
import { Advances } from './pages/Advances';
import { ReceiptsPayments } from './pages/ReceiptsPayments';
import { Expenses } from './pages/Expenses';
import { Stock } from './pages/Stock';
import { CashBook } from './pages/CashBook';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { MandiSlip } from './pages/MandiSlip';
import { VoucherPrint, StatementPrint, RoznamchaPrint, TablePrint } from './components/Prints';
import { exportPdf } from './lib/export';

export default function App() {
  const { user } = useStore();
  const [page, setPage] = useState('dashboard');
  const [printJob, setPrintJob] = useState(null);
  const [editTxn, setEditTxn] = useState(null); // purchase/sale voucher being edited

  // trigger browser print — or PDF download — once the print job is rendered
  useEffect(() => {
    if (!printJob) return;
    if (printJob.output === 'pdf') {
      const id = setTimeout(async () => {
        const el = document.getElementById('print-root');
        try { await exportPdf(el, printJob.filename || 'report.pdf'); }
        finally { setPrintJob(null); }
      }, 450);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => window.print(), 350); // small delay lets Nastaliq font settle
    const clear = () => setPrintJob(null);
    window.addEventListener('afterprint', clear);
    return () => { clearTimeout(id); window.removeEventListener('afterprint', clear); };
  }, [printJob]);

  // F-key shortcuts (PRD I.4)
  useEffect(() => {
    const h = (e) => {
      if (!user) return;
      if (e.key === 'F2') { e.preventDefault(); setPage('purchase'); }
      if (e.key === 'F3') { e.preventDefault(); setPage('sale'); }
      if (e.key === 'F4') { e.preventDefault(); setPage('commission'); }
      if (e.key === 'F5') { e.preventDefault(); setPage('mandislip'); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [user]);

  // output: 'print' (default) or 'pdf' — pdf renders the same layout and downloads it
  const onSaved = useCallback((txn, print) => {
    if (print && txn) setPrintJob({ kind: 'voucher', txn });
  }, []);
  const onReprint = useCallback((txn, output) => setPrintJob({ kind: 'voucher', txn, output, filename: `${txn.voucherNo}.pdf` }), []);
  const onPrintStatement = useCallback((party, entries, output) =>
    setPrintJob({ kind: 'statement', party, entries, output, filename: `khata-${party.name.replace(/\s+/g, '-')}.pdf` }), []);
  const onPrintRoznamcha = useCallback((date, summary, output) =>
    setPrintJob({ kind: 'roznamcha', date, summary, output, filename: `roznamcha-${date}.pdf` }), []);
  const onPrintTable = useCallback((table, output) =>
    setPrintJob({ kind: 'table', ...table, output, filename: `${table.filename || 'report'}.pdf` }), []);
  const onEditTxn = useCallback((txn) => {
    if (txn.type !== 'purchase' && txn.type !== 'sale') return;
    setEditTxn(txn);
    setPage(txn.type);
  }, []);

  if (!user) return <div className="screen-root"><Login /></div>;

  const pages = {
    dashboard: <Dashboard setPage={setPage} onPrintRoznamcha={onPrintRoznamcha} />,
    parties: <Parties onPrintStatement={onPrintStatement} onSaved={onSaved} />,
    purchase: <TradeForm key="purchase" kind="purchase" onSaved={onSaved} onReprint={onReprint} onEditTxn={onEditTxn}
      editTxn={editTxn?.type === 'purchase' ? editTxn : null} onDoneEdit={() => setEditTxn(null)} />,
    sale: <TradeForm key="sale" kind="sale" onSaved={onSaved} onReprint={onReprint} onEditTxn={onEditTxn}
      editTxn={editTxn?.type === 'sale' ? editTxn : null} onDoneEdit={() => setEditTxn(null)} />,
    mandislip: <MandiSlip onSaved={onSaved} onReprint={onReprint} />,
    commission: <CommissionForm onSaved={onSaved} onReprint={onReprint} />,
    advances: <Advances onSaved={onSaved} />,
    receipts: <ReceiptsPayments onSaved={onSaved} onReprint={onReprint} />,
    expenses: <Expenses onSaved={onSaved} />,
    stock: <Stock />,
    cashbook: <CashBook />,
    reports: <Reports onPrintRoznamcha={onPrintRoznamcha} onReprint={onReprint} onPrintTable={onPrintTable} onEditTxn={onEditTxn} />,
    settings: <Settings />,
  };

  return (
    <>
      <div className="screen-root">
        <Layout page={page} setPage={setPage}>
          <AnimatePresence mode="wait">
            <motion.div key={page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {pages[page] || pages.dashboard}
            </motion.div>
          </AnimatePresence>
        </Layout>
      </div>

      <div
        id="print-root"
        className={printJob?.output === 'pdf' ? 'pdf-root' : ''}
        style={printJob?.output === 'pdf'
          ? { position: 'fixed', left: '-10000px', top: 0, width: '800px', background: '#fff', zIndex: -1 }
          : undefined}
      >
        {printJob?.kind === 'voucher' && printJob.txn.type === 'commission' ? (
          <div className="print-area">
            <VoucherPrint txn={printJob.txn} copy="seller" />
            <div style={{ pageBreakBefore: 'always' }} />
            <VoucherPrint txn={printJob.txn} copy="buyer" />
          </div>
        ) : printJob?.kind === 'voucher' ? (
          <VoucherPrint txn={printJob.txn} />
        ) : null}
        {printJob?.kind === 'statement' && <StatementPrint party={printJob.party} entries={printJob.entries} />}
        {printJob?.kind === 'roznamcha' && <RoznamchaPrint date={printJob.date} summary={printJob.summary} />}
        {printJob?.kind === 'table' && (
          <TablePrint title={printJob.title} subtitle={printJob.subtitle} columns={printJob.columns} rows={printJob.rows} footer={printJob.footer} />
        )}
      </div>
    </>
  );
}
