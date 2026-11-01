import { create } from 'zustand';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { loadPdf } from './pdf';
import { getTextItems } from './pdf';
import type { Ann, Style, Tool } from './types';

export const DEFAULT_STYLE: Style = { color: '#111827', fill: 'none', strokeWidth: 2, opacity: 1, fontFamily: 'Helvetica', fontSize: 14, bold: false, italic: false };
const PRESET: Partial<Record<Tool, Partial<Style>>> = {
  text: { color: '#111827', opacity: 1 }, link: { color: '#2563eb', opacity: 0.2 }, highlight: { color: '#facc15', opacity: 0.4 },
  underline: { color: '#ef4444', opacity: 1, strokeWidth: 1.5 }, strike: { color: '#ef4444', opacity: 1, strokeWidth: 1.5 },
  draw: { color: '#2563eb', opacity: 1, strokeWidth: 2 }, rect: { color: '#2563eb', opacity: 1 }, ellipse: { color: '#2563eb', opacity: 1 },
  line: { color: '#2563eb', opacity: 1 }, whiteout: { color: '#ffffff', opacity: 1 },
};
const MAX = 100; let lastKey = '', lastT = 0;

interface State {
  fileName: string; bytes: Uint8Array | null; doc: PDFDocumentProxy | null; pages: { w: number; h: number }[];
  loading: boolean; error: string | null; zoom: number; currentPage: number; tool: Tool;
  findQuery: string;
  anns: Ann[]; past: Ann[][]; future: Ann[][]; selectedId: string | null; editingId: string | null;
  defaults: Style; theme: 'light' | 'dark'; leftOpen: boolean; rightOpen: boolean;
  openFile(f: File): Promise<void>; setZoom(z: number): void; setTool(t: Tool): void; setCurrentPage(i: number): void;
  insertPage(): Promise<void>;
  replaceText(find: string, replace: string): Promise<number>;
  setFindQuery(query: string): void;
  add(a: Ann): void; update(id: string, p: Partial<Ann>, key?: string): void; patch(id: string, p: Partial<Ann>): void; begin(): void;
  remove(id: string): void; duplicate(id: string): void; select(id: string | null): void; setEditing(id: string | null): void;
  setStyle(p: Partial<Style>): void; addImage(src: string, w: number, h: number): void; undo(): void; redo(): void;
  setTheme(t: 'light' | 'dark'): void; toggle(side: 'leftOpen' | 'rightOpen'): void;
}
const push = (s: State) => ({ past: [...s.past.slice(-(MAX - 1)), s.anns], future: [] as Ann[][] });

export const useStore = create<State>((set, get) => ({
  fileName: '', bytes: null, doc: null, pages: [], loading: false, error: null, zoom: 1, currentPage: 0, tool: 'select',
  anns: [], past: [], future: [], selectedId: null, editingId: null, findQuery: '', defaults: DEFAULT_STYLE, theme: 'light', leftOpen: true, rightOpen: true,
  async openFile(file) {
    set({ loading: true, error: null });
    try {
      const bytes = new Uint8Array(await file.arrayBuffer()); const { doc, pages } = await loadPdf(bytes);
      get().doc?.destroy();
      set({ fileName: file.name, bytes, doc, pages, anns: [], past: [], future: [], selectedId: null, editingId: null, currentPage: 0, tool: 'select', loading: false });
    } catch (e) { set({ loading: false, error: `Couldn't open this file (${(e as Error).message}). It may be damaged or password-protected.` }); }
  },
  setZoom: z => set({ zoom: Math.min(4, Math.max(0.25, Math.round(z * 100) / 100)) }),
  setTool: t => set(s => ({ tool: t, selectedId: t === 'select' ? s.selectedId : null, defaults: { ...s.defaults, ...(PRESET[t] ?? {}) } })),
  setCurrentPage: i => { if (get().currentPage !== i) set({ currentPage: i }); },
  setFindQuery: findQuery => set({ findQuery }),
  async insertPage() {
    const s = get(), page = s.pages[s.currentPage];
    if (!s.bytes || !s.doc || !page) return;
    set({ loading: true, error: null });
    try {
      const pdf = await PDFDocument.load(s.bytes);
      const insertAt = Math.min(s.currentPage + 1, pdf.getPageCount());
      pdf.insertPage(insertAt, [page.w, page.h]);
      const bytes = new Uint8Array(await pdf.save());
      const loaded = await loadPdf(bytes);
      s.doc.destroy();
      set({
        bytes, doc: loaded.doc, pages: loaded.pages, loading: false, currentPage: insertAt,
        anns: s.anns.map(a => a.page >= insertAt ? { ...a, page: a.page + 1 } : a),
        past: [], future: [], selectedId: null, editingId: null, tool: 'select',
      });
    } catch (e) {
      set({ loading: false, error: `Couldn't insert a page (${(e as Error).message}).` });
    }
  },
  async replaceText(find, replace) {
    const s = get(), needle = find.trim();
    if (!needle || !s.doc) return 0;
    const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizedNeedle = normalize(needle);
    const additions: Ann[] = [];
    for (let page = 0; page < s.pages.length; page++) {
      const items = await getTextItems(s.doc, page, s.pages[page].h);
      for (const it of items) {
        if (!normalize(it.str).includes(normalizedNeedle)) continue;
        const alreadyCovered = s.anns.some(a => a.page === page && a.cover && Math.abs(a.cover.x - (it.x - 1)) < 0.01 && Math.abs(a.cover.y - it.y) < 0.01);
        if (alreadyCovered) continue;
        const directPattern = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const replacement = directPattern.test(it.str)
          ? it.str.replace(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replace)
          : replace;
        additions.push({
          id: crypto.randomUUID(), page, type: 'text', x: it.x, y: it.y - it.size * 0.1, w: it.w, h: it.size * 1.2, rotation: 0,
          text: replacement,
          cover: { x: it.x - 1, y: it.y, w: it.w + 2, h: it.h },
          style: { ...s.defaults, color: '#000000', opacity: 1, fontFamily: it.family, fontSize: it.size, bold: it.bold, italic: it.italic },
        });
      }
    }
    if (!additions.length) return 0;
    set(state => ({ ...push(state), anns: [...state.anns, ...additions], selectedId: null, editingId: null, findQuery: '', tool: 'select' }));
    return additions.length;
  },
  add: a => set(s => ({ ...push(s), anns: [...s.anns, a], selectedId: a.id })),
  update(id, p, key) {
    const now = Date.now(); const co = !!key && key === lastKey && now - lastT < 1000; lastKey = key ?? ''; lastT = now;
    set(s => ({ ...(co ? {} : push(s)), anns: s.anns.map(a => (a.id === id ? { ...a, ...p } : a)) }));
  },
  patch: (id, p) => set(s => ({ anns: s.anns.map(a => (a.id === id ? { ...a, ...p } : a)) })),
  begin: () => { lastKey = ''; set(s => push(s)); },
  remove: id => set(s => ({ ...push(s), anns: s.anns.filter(a => a.id !== id), selectedId: null, editingId: null })),
  duplicate(id) {
    const a = get().anns.find(x => x.id === id); if (!a) return;
    get().add({ ...a, id: crypto.randomUUID(), x: a.x + 12, y: a.y + 12, cover: undefined, points: a.points?.map(([x, y]) => [x + 12, y + 12] as [number, number]) });
  },
  select: id => set({ selectedId: id }),
  setEditing: id => set({ editingId: id }),
  setStyle(p) {
    const { selectedId, anns, defaults } = get(); const sel = anns.find(a => a.id === selectedId);
    if (sel) get().update(sel.id, { style: { ...sel.style, ...p } }, 'style:' + Object.keys(p)[0]); else set({ defaults: { ...defaults, ...p } });
  },
  addImage(src, nw, nh) {
    const s = get(); const pg = s.pages[s.currentPage]; if (!pg) return;
    const w = Math.min(nw, pg.w * 0.35), h = (w * nh) / nw;
    s.add({ id: crypto.randomUUID(), page: s.currentPage, type: 'image', x: (pg.w - w) / 2, y: (pg.h - h) / 2, w, h, rotation: 0, src, style: { ...s.defaults, opacity: 1 } });
    set({ tool: 'select' });
  },
  undo: () => set(s => s.past.length ? { anns: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.anns, ...s.future], selectedId: null, editingId: null } : s),
  redo: () => set(s => s.future.length ? { anns: s.future[0], future: s.future.slice(1), past: [...s.past, s.anns], selectedId: null, editingId: null } : s),
  setTheme: theme => set({ theme }),
  toggle: side => set(s => ({ [side]: !s[side] }) as Partial<State>),
}));
