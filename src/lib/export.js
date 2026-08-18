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
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#ffffff',
          onclone: (doc) => {
            const canvas = doc.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            const elements = doc.querySelectorAll('*');
            for (let i = 0; i < elements.length; i++) {
              const el = elements[i];
              const style = doc.defaultView.getComputedStyle(el);
              
              const props = [
                'color', 'backgroundColor', 'borderTopColor', 
                'borderRightColor', 'borderBottomColor', 'borderLeftColor',
                'textDecorationColor', 'outlineColor'
              ];
              
              for (const prop of props) {
                const val = style[prop];
                if (val && (val.includes('oklch') || val.includes('color-mix') || val.includes('oklab'))) {
                   ctx.clearRect(0, 0, 1, 1);
                   ctx.fillStyle = val;
                   ctx.fillRect(0, 0, 1, 1);
                   const d = ctx.getImageData(0, 0, 1, 1).data;
                   el.style[prop] = `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${d[3] / 255})`;
                }
              }
            }
          }
        },
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
