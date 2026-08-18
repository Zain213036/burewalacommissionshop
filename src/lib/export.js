import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

// sheets: [{ name, rows }] — rows is array-of-arrays (first row = header) or array of objects
export function exportExcel(filename, sheets) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = Array.isArray(rows[0])
      ? XLSX.utils.aoa_to_sheet(rows)
      : XLSX.utils.json_to_sheet(rows);
    // sensible column widths from content
    const data = Array.isArray(rows[0]) ? rows : [Object.keys(rows[0] || {}), ...rows.map((r) => Object.values(r))];
    ws['!cols'] = (data[0] || []).map((_, ci) => ({
      wch: Math.min(40, Math.max(10, ...data.map((r) => String(r?.[ci] ?? '').length + 2))),
    }));
    XLSX.utils.book_append_sheet(wb, ws, String(name).slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

export async function exportPdf(element, filename) {
  await document.fonts.ready; // make sure the Urdu Nastaliq font is rendered
  try {
    await html2pdf()
      .set({
        margin: [8, 8, 10, 8],
        filename,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(element)
      .save();
  } finally {
    // html2pdf can leave an invisible overlay behind that blocks all clicks — always remove it
    document.querySelectorAll('.html2pdf__overlay, .html2pdf__container').forEach((el) => el.remove());
  }
}
