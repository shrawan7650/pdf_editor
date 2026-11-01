import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Family } from './types';

export async function loadPdf(bytes: Uint8Array) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString(); // bundled locally
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise; // copy: pdf.js transfers its buffer, the original stays intact
  const pages: { w: number; h: number }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i); const v = p.getViewport({ scale: 1 });
    pages.push({ w: v.width, h: v.height }); p.cleanup();
  }
  return { doc, pages };
}

export interface TextItem { str: string; x: number; y: number; w: number; h: number; size: number; family: Family; bold: boolean; italic: boolean }

export async function getTextItems(doc: PDFDocumentProxy, index: number, pageH: number): Promise<TextItem[]> {
  const page = await doc.getPage(index + 1); const tc = await page.getTextContent(); const out: TextItem[] = [];
  for (const it of tc.items) {
    if (!('str' in it) || !it.str.trim()) continue;
    const t = it.transform; if (Math.abs(t[1]) > 0.01) continue; // skip rotated text
    const size = Math.hypot(t[0], t[1]) || it.height; const ff = (tc.styles[it.fontName]?.fontFamily ?? '').toLowerCase();
    out.push({ str: it.str, x: t[4], y: pageH - t[5] - size * 0.9, w: it.width, h: size * 1.2, size,
      family: ff.includes('mono') ? 'Courier' : ff.includes('serif') && !ff.includes('sans') ? 'Times' : 'Helvetica', bold: false, italic: false });
  }
  return out;
}
