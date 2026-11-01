'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { getTextItems, type TextItem } from '@/lib/pdf';
import { bboxOf } from '@/lib/geometry';
import { CSS_FONT, type Ann, type AnnType, type Tool } from '@/lib/types';
import { AnnNode } from './AnnNode';
import { LinkModal } from './LinkModal';

const TEXT_TOOLS: Tool[] = ['editText', 'highlight', 'underline', 'strike'];
const BOX_TYPE: Partial<Record<Tool, AnnType>> = { link: 'link', highlight: 'highlight', underline: 'underline', strike: 'strike', rect: 'rect', ellipse: 'ellipse', whiteout: 'whiteout' };
const MAX_PIXELS = 16e6;

export function PageView({ index }: { index: number }) {
  const doc = useStore(s => s.doc)!, size = useStore(s => s.pages[index]), zoom = useStore(s => s.zoom), tool = useStore(s => s.tool), anns = useStore(s => s.anns), findQuery = useStore(s => s.findQuery);
  const mine = useMemo(() => anns.filter(a => a.page === index), [anns, index]);
  const wrap = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), svg = useRef<SVGSVGElement>(null);
  const gesture = useRef<{ p0: { x: number; y: number }; draft: Ann | null } | null>(null);
  const [visible, setVisible] = useState(index < 2), [items, setItems] = useState<TextItem[] | null>(null), [draft, setDraft] = useState<Ann | null>(null), [linkDraft, setLinkDraft] = useState<Ann | null>(null);

  useEffect(() => {
    const el = wrap.current!;
    const a = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '900px 0px' });
    const b = new IntersectionObserver(([e]) => e.isIntersecting && useStore.getState().setCurrentPage(index), { threshold: 0.4 });
    a.observe(el); b.observe(el); return () => { a.disconnect(); b.disconnect(); };
  }, [index]);

  useEffect(() => { // render lazily, free memory when far off-screen
    const c = canvas.current!; if (!visible) { c.width = c.height = 0; return; }
    let task: { cancel(): void; promise: Promise<unknown> } | undefined, dead = false;
    (async () => {
      const page = await doc.getPage(index + 1); if (dead) return;
      const scale = Math.min(zoom * Math.min(window.devicePixelRatio || 1, 2), Math.sqrt(MAX_PIXELS / (size.w * size.h)));
      const vp = page.getViewport({ scale }); c.width = vp.width; c.height = vp.height;
      task = page.render({ canvasContext: c.getContext('2d')!, viewport: vp }); await task.promise.catch(() => {});
    })();
    return () => { dead = true; task?.cancel(); };
  }, [visible, zoom, doc, index, size.w, size.h]);

  useEffect(() => { if (visible && (tool === 'select' || TEXT_TOOLS.includes(tool) || findQuery.trim()) && !items) getTextItems(doc, index, size.h).then(setItems); }, [visible, tool, findQuery, items, doc, index, size.h]);

  const toPt = (e: { clientX: number; clientY: number }) => { const r = svg.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom }; };
  const covered = (it: TextItem) => mine.some(a => a.cover && Math.abs(a.cover.x - (it.x - 1)) < 0.01 && Math.abs(a.cover.y - it.y) < 0.01);
  const base = (type: AnnType, p: Partial<Ann>): Ann => ({ id: crypto.randomUUID(), page: index, type, x: 0, y: 0, w: 0, h: 0, rotation: 0, style: { ...useStore.getState().defaults }, ...p });

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; const st = useStore.getState();
    if (st.tool === 'select') { st.select(null); st.setEditing(null); return; }
    if (st.tool === 'text') {
      e.preventDefault();
      const p = toPt(e);
      const a = base('text', { x: p.x, y: p.y, w: 40, h: st.defaults.fontSize * 1.2, text: 'Text' });
      st.add(a); st.setEditing(a.id); st.setTool('select');
      return;
    }
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
    const p0 = toPt(e); let d: Ann | null = null;
    if (st.tool === 'draw') d = base('ink', { x: p0.x, y: p0.y, points: [[p0.x, p0.y]] });
    else if (st.tool === 'line') d = base('line', { x: p0.x, y: p0.y, points: [[p0.x, p0.y], [p0.x, p0.y]] });
    else if (BOX_TYPE[st.tool]) d = base(BOX_TYPE[st.tool]!, { x: p0.x, y: p0.y });
    gesture.current = { p0, draft: d }; setDraft(d);
  };
  const onMove = (e: React.PointerEvent) => {
    const g = gesture.current; if (!g?.draft) return; const p = toPt(e), t = useStore.getState().tool; let d = g.draft;
    if (t === 'draw' || t === 'line') { const pts: [number, number][] = t === 'draw' ? [...d.points!, [p.x, p.y]] : [d.points![0], [p.x, p.y]]; d = { ...d, points: pts, ...bboxOf(pts) }; }
    else d = { ...d, x: Math.min(g.p0.x, p.x), y: Math.min(g.p0.y, p.y), w: Math.abs(p.x - g.p0.x), h: Math.abs(p.y - g.p0.y) };
    g.draft = d; setDraft(d);
  };
  const onUp = (e: React.PointerEvent) => {
    const g = gesture.current; if (!g) return; gesture.current = null; setDraft(null);
    const st = useStore.getState(), p = toPt(e), t = st.tool, dist = Math.hypot(p.x - g.p0.x, p.y - g.p0.y) * zoom;
    if (TEXT_TOOLS.includes(t) && dist < 3) { // click on an existing text run
      const it = items?.find(i => !covered(i) && p.x >= i.x - 1 && p.x <= i.x + i.w + 1 && p.y >= i.y && p.y <= i.y + i.h); if (!it) return;
      if (t === 'editText') {
        const a = base('text', { x: it.x, y: it.y - it.size * 0.1, w: it.w, h: it.size * 1.2, text: it.str, cover: { x: it.x - 1, y: it.y, w: it.w + 2, h: it.h },
          style: { ...st.defaults, color: '#000000', opacity: 1, fontFamily: it.family, fontSize: it.size, bold: it.bold, italic: it.italic } });
        st.add(a); st.setEditing(a.id);
      } else st.add(base(t as AnnType, { x: it.x, y: it.y, w: it.w, h: it.h }));
      if (t !== 'editText') st.setTool('select'); return;
    }
    const d = g.draft; if (!d) return;
    const ok = d.points ? d.points.length > 1 && dist > 2 || t === 'draw' && d.points.length > 2 : d.type === 'underline' || d.type === 'strike' ? d.w > 3 : d.w > 3 && d.h > 3;
    if (ok && d.type === 'link') { setLinkDraft(d); return; }
    if (ok) { st.add(d); if (t !== 'draw') st.setTool('select'); }
  };

  return (
    <div id={`page-${index}`} ref={wrap} className="relative bg-white shadow-xl ring-1 ring-black/10" style={{ width: size.w * zoom, height: size.h * zoom }}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <svg ref={svg} viewBox={`0 0 ${size.w} ${size.h}`} className="absolute inset-0 h-full w-full touch-none select-none" style={{ cursor: tool === 'select' ? 'default' : tool === 'text' || tool === 'editText' ? 'text' : 'crosshair' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
        {tool === 'select' && items?.filter(i => !covered(i)).map((i, k) => (
          <text key={`copy-${k}`} x={i.x} y={i.y + i.size} fontFamily={CSS_FONT[i.family]} fontSize={i.size} fill="rgba(0,0,0,.01)"
            style={{ userSelect: 'text', cursor: 'text' }} onPointerDown={e => e.stopPropagation()}>{i.str}</text>
        ))}
        {mine.map(a => <AnnNode key={a.id} a={a} zoom={zoom} interactive={tool === 'select'} editOnly={tool === 'editText'} toPt={toPt} />)}
        {draft && <AnnNode a={draft} zoom={zoom} interactive={false} toPt={toPt} />}
        {TEXT_TOOLS.includes(tool) && items?.filter(i => !covered(i)).map((i, k) => <rect key={k} x={i.x} y={i.y} width={i.w} height={i.h} fill="rgba(99,102,241,.10)" stroke="rgba(99,102,241,.45)" strokeWidth={0.5} pointerEvents="none" />)}
        {findQuery.trim() && items?.filter(i => i.str.toLowerCase().includes(findQuery.trim().toLowerCase())).map((i, k) => <rect key={`find-${k}`} x={i.x - 1} y={i.y - 1} width={i.w + 2} height={i.h + 2} rx={1} fill="rgba(250,204,21,.35)" stroke="#d97706" strokeWidth={1} pointerEvents="none" />)}
      </svg>
      {linkDraft && <LinkModal onClose={() => { setLinkDraft(null); useStore.getState().setTool('select'); }} onSave={url => { useStore.getState().add({ ...linkDraft, url }); setLinkDraft(null); useStore.getState().setTool('select'); }} />}
    </div>
  );
}
