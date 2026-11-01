import { PDFDocument, StandardFonts, rgb, degrees, LineCapStyle, type PDFFont, type PDFImage } from 'pdf-lib';
import { PDFArray, PDFDict, PDFName, PDFString } from 'pdf-lib/cjs/core';
import type { Ann, Style } from './types';

const hex = (s: string) => { const n = parseInt(s.replace('#', ''), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
const FONTS = { Helvetica: ['Helvetica', 'HelveticaBold', 'HelveticaOblique', 'HelveticaBoldOblique'], Times: ['TimesRoman', 'TimesRomanBold', 'TimesRomanItalic', 'TimesRomanBoldItalic'], Courier: ['Courier', 'CourierBold', 'CourierOblique', 'CourierBoldOblique'] };

/** Absolute PDF point for a local offset (x right, y up from the box's bottom-left), rotated about the box centre. */
export function at(a: Ann, H: number, lx: number, ly: number) {
  const cx = a.x + a.w / 2, cy = H - (a.y + a.h / 2), phi = (-a.rotation * Math.PI) / 180, dx = lx - a.w / 2, dy = ly - a.h / 2;
  return { x: cx + dx * Math.cos(phi) - dy * Math.sin(phi), y: cy + dx * Math.sin(phi) + dy * Math.cos(phi) };
}

/** Builds a NEW pdf from the original bytes + annotations. The input bytes are never modified. */
export async function exportPdf(src: Uint8Array, anns: Ann[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(src); const pages = pdf.getPages();
  const fonts = new Map<string, PDFFont>(), imgs = new Map<string, PDFImage>();
  const font = async (s: Style) => { const n = FONTS[s.fontFamily][(s.bold ? 1 : 0) + (s.italic ? 2 : 0)]; if (!fonts.has(n)) fonts.set(n, await pdf.embedFont(StandardFonts[n as keyof typeof StandardFonts])); return fonts.get(n)!; };
  const addLink = (page: typeof pages[number], a: Ann) => {
    if (!a.url) return;
    const H = page.getHeight(), context = page.node.context;
    const uri = context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(a.url) });
    const annotation = context.obj({
      Type: 'Annot', Subtype: 'Link', Rect: context.obj([a.x, H - a.y - a.h, a.x + a.w, H - a.y]),
      Border: context.obj([0, 0, 0]), A: uri,
    });
    page.node.addAnnot(context.register(annotation));
  };
  for (const a of anns) {
    const page = pages[a.page]; if (!page) continue;
    if (page.getRotation().angle !== 0) throw new Error(`Page ${a.page + 1} has a built-in rotation, which this editor can't export yet.`);
    const H = page.getHeight(), s = a.style, col = hex(s.color), op = s.opacity, rot = degrees(-a.rotation), flip = (y: number) => H - y;
    if (a.type === 'link') { addLink(page, a); continue; }
    if (a.cover) page.drawRectangle({ x: a.cover.x, y: flip(a.cover.y + a.cover.h), width: a.cover.w, height: a.cover.h, color: rgb(1, 1, 1) });
    switch (a.type) {
      case 'whiteout': case 'highlight': page.drawRectangle({ x: a.x, y: flip(a.y + a.h), width: a.w, height: a.h, color: col, opacity: op }); break;
      case 'underline': case 'strike': { const y = flip(a.type === 'underline' ? a.y + a.h : a.y + a.h / 2); page.drawLine({ start: { x: a.x, y }, end: { x: a.x + a.w, y }, thickness: s.strokeWidth, color: col, opacity: op }); break; }
      case 'rect': { const o = at(a, H, 0, 0); page.drawRectangle({ x: o.x, y: o.y, width: a.w, height: a.h, rotate: rot, color: s.fill === 'none' ? undefined : hex(s.fill), borderColor: col, borderWidth: s.strokeWidth, opacity: op, borderOpacity: op }); break; }
      case 'ellipse': page.drawEllipse({ x: a.x + a.w / 2, y: flip(a.y + a.h / 2), xScale: a.w / 2, yScale: a.h / 2, rotate: rot, color: s.fill === 'none' ? undefined : hex(s.fill), borderColor: col, borderWidth: s.strokeWidth, opacity: op, borderOpacity: op }); break;
      case 'line': case 'ink': { const p = a.points ?? []; for (let i = 1; i < p.length; i++) page.drawLine({ start: { x: p[i - 1][0], y: flip(p[i - 1][1]) }, end: { x: p[i][0], y: flip(p[i][1]) }, thickness: s.strokeWidth, color: col, opacity: op, lineCap: LineCapStyle.Round }); break; }
      case 'image': {
        if (!a.src) break; let im = imgs.get(a.src);
        if (!im) { im = a.src.startsWith('data:image/png') ? await pdf.embedPng(a.src) : await pdf.embedJpg(a.src); imgs.set(a.src, im); }
        const o = at(a, H, 0, 0); page.drawImage(im, { x: o.x, y: o.y, width: a.w, height: a.h, rotate: rot, opacity: op }); break;
      }
      case 'text': {
        const f = await font(s); const ok = new Set(f.getCharacterSet()); const size = s.fontSize;
        const clean = (t: string) => [...t.replace(/\t/g, '    ')].map(c => (ok.has(c.codePointAt(0)!) ? c : '?')).join('');
        (a.text ?? '').split('\n').forEach((ln, i) => { if (!ln) return; const o = at(a, H, 0, a.h - size - i * size * 1.2); page.drawText(clean(ln), { x: o.x, y: o.y, size, font: f, color: col, opacity: op, rotate: rot }); });
      }
    }
  }
  return pdf.save();
}
