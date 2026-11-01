'use client';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { Ann, CSS_FONT, ROTATABLE } from '@/lib/types';
import { moved, resized } from '@/lib/geometry';

type Pt = { clientX: number; clientY: number };

function TextNode({ a, editing }: { a: Ann; editing: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { patch, update, remove, setEditing } = useStore.getState();
  const s = a.style;
  useLayoutEffect(() => {
    if (ref.current && ref.current.innerText !== (a.text ?? '')) ref.current.innerText = a.text ?? '';
  }, [a.text, editing]);
  useLayoutEffect(() => { // measure so selection box, rotation and export use the real size
    const el = ref.current; if (!el) return;
    if (editing) return;
    if (Math.abs(el.offsetWidth - a.w) > 0.5 || Math.abs(el.offsetHeight - a.h) > 0.5) patch(a.id, { w: el.offsetWidth, h: el.offsetHeight });
  }, [a.id, a.w, a.h, editing, patch]);
  useEffect(() => {
    if (!editing || !ref.current) return; const el = ref.current; el.focus();
    const r = document.createRange(); r.selectNodeContents(el); const sel = getSelection()!; sel.removeAllRanges(); sel.addRange(r);
  }, [editing]);
  const commit = () => {
    const t = (ref.current?.innerText ?? '').replace(/\n$/, ''); setEditing(null);
    if (!t.trim() && !a.cover) remove(a.id); else if (t !== a.text) update(a.id, { text: t });
  };
  return (
    <foreignObject x={a.x} y={a.y} width={Math.max(a.w, 20) + 40} height={Math.max(a.h, s.fontSize * 1.2) + 10} style={{ overflow: 'visible', pointerEvents: editing ? 'auto' : 'none' }}>
      <div ref={ref} contentEditable={editing} suppressContentEditableWarning spellCheck={false}
        onPointerDown={e => e.stopPropagation()} onBlur={commit} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') ref.current?.blur(); }}
        style={{ display: 'block', width: 'max-content', whiteSpace: 'pre', minWidth: 4, lineHeight: 1.2, textAlign: 'left', direction: 'ltr', unicodeBidi: 'plaintext', fontFamily: CSS_FONT[s.fontFamily], fontSize: s.fontSize, fontWeight: s.bold ? 700 : 400, fontStyle: s.italic ? 'italic' : 'normal', color: s.color, opacity: s.opacity, outline: editing ? '1px dashed #6366f1' : 'none', cursor: editing ? 'text' : 'move' }} />
    </foreignObject>
  );
}

function Shape({ a, editing }: { a: Ann; editing: boolean }) {
  const s = a.style;
  switch (a.type) {
    case 'text': return <TextNode a={a} editing={editing} />;
    case 'link': return <rect x={a.x} y={a.y} width={a.w} height={a.h} fill="#2563eb" opacity={0.12} stroke="#2563eb" strokeWidth={1} strokeDasharray="4 2" />;
    case 'image': return <image href={a.src} x={a.x} y={a.y} width={a.w} height={a.h} preserveAspectRatio="none" opacity={s.opacity} />;
    case 'highlight': return <rect x={a.x} y={a.y} width={a.w} height={a.h} fill={s.color} opacity={s.opacity} style={{ mixBlendMode: 'multiply' }} />;
    case 'whiteout': return <rect x={a.x} y={a.y} width={a.w} height={a.h} fill={s.color} opacity={s.opacity} />;
    case 'underline': case 'strike': { const y = a.type === 'underline' ? a.y + a.h : a.y + a.h / 2; return <line x1={a.x} x2={a.x + a.w} y1={y} y2={y} stroke={s.color} strokeWidth={s.strokeWidth} opacity={s.opacity} />; }
    case 'rect': return <rect x={a.x} y={a.y} width={a.w} height={a.h} fill={s.fill} stroke={s.color} strokeWidth={s.strokeWidth} opacity={s.opacity} />;
    case 'ellipse': return <ellipse cx={a.x + a.w / 2} cy={a.y + a.h / 2} rx={a.w / 2} ry={a.h / 2} fill={s.fill} stroke={s.color} strokeWidth={s.strokeWidth} opacity={s.opacity} />;
    case 'line': case 'ink': return <polyline points={(a.points ?? []).map(p => p.join(',')).join(' ')} fill="none" stroke={s.color} strokeWidth={s.strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={s.opacity} />;
  }
}

export function AnnNode({ a, zoom, interactive, editOnly = false, toPt }: { a: Ann; zoom: number; interactive: boolean; editOnly?: boolean; toPt: (e: Pt) => { x: number; y: number } }) {
  const selected = useStore(s => s.selectedId === a.id), editing = useStore(s => s.editingId === a.id);
  const st = useStore.getState;
  const dragged = useRef(false);
  const rotatable = ROTATABLE.includes(a.type), rot = rotatable ? a.rotation : 0;
  const pad = 3, hs = 9 / zoom, sw = 1.5 / zoom, cx = a.x + a.w / 2, cy = a.y + a.h / 2;

  const startDrag = (e: React.PointerEvent, mode: 'move' | 'resize' | 'rotate') => {
    e.stopPropagation(); e.preventDefault(); dragged.current = false; st().select(a.id);
    const p0 = toPt(e), o = a, th = (o.rotation * Math.PI) / 180; let began = false;
    const mv = (ev: PointerEvent) => {
      const p = toPt(ev), dx = p.x - p0.x, dy = p.y - p0.y;
      if (!began) { if (Math.hypot(dx, dy) * zoom < 3) return; began = true; dragged.current = true; st().begin(); }
      const { patch } = st();
      if (mode === 'move') patch(o.id, moved(o, dx, dy));
      else if (mode === 'rotate') patch(o.id, { rotation: Math.round((((Math.atan2(p.y - (o.y + o.h / 2), p.x - (o.x + o.w / 2)) * 180) / Math.PI + 90) + 360) % 360) });
      else {
        const lx = dx * Math.cos(th) + dy * Math.sin(th), ly = -dx * Math.sin(th) + dy * Math.cos(th);
        if (o.type === 'text') patch(o.id, { style: { ...o.style, fontSize: Math.max(4, Math.round(o.style.fontSize * Math.max(0.2, (o.w + lx) / o.w) * 10) / 10) } });
        else if (o.type === 'image') { const nw = Math.max(8, o.w + lx); patch(o.id, resized(o, nw, (nw * o.h) / o.w)); }
        else patch(o.id, resized(o, o.w + lx, o.h + ly));
      }
    };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  };

  return (
    <g>
      {a.cover && <rect x={a.cover.x} y={a.cover.y} width={a.cover.w} height={a.cover.h} fill="#fff" />}
      <g transform={`rotate(${rot} ${cx} ${cy})`} style={{ pointerEvents: interactive || (editOnly && a.type === 'text') ? 'auto' : 'none' }}>
        <Shape a={a} editing={editing} />
        {!editing && <rect x={a.x - pad} y={a.y - pad} width={a.w + 2 * pad} height={a.h + 2 * pad} fill="transparent" style={{ cursor: a.type === 'text' ? 'text' : 'move' }}
          onPointerDown={e => {
            if (editOnly && a.type === 'text') {
              e.stopPropagation();
              e.preventDefault();
              st().select(a.id);
              st().setEditing(a.id);
              return;
            }
            startDrag(e, 'move');
          }}
          onClick={e => {
            e.stopPropagation();
            if (a.type === 'text' && !dragged.current) {
              st().select(a.id);
              st().setEditing(a.id);
            }
          }} />}
        {selected && interactive && !editOnly && !editing && <>
          <rect x={a.x - pad} y={a.y - pad} width={a.w + 2 * pad} height={a.h + 2 * pad} fill="none" stroke="#6366f1" strokeWidth={sw} strokeDasharray={4 / zoom} pointerEvents="none" />
          <rect x={a.x + a.w - hs / 2} y={a.y + a.h - hs / 2} width={hs} height={hs} rx={hs / 4} fill="#fff" stroke="#6366f1" strokeWidth={sw} style={{ cursor: 'nwse-resize' }} onPointerDown={e => startDrag(e, 'resize')} />
          {rotatable && <>
            <line x1={cx} x2={cx} y1={a.y - pad} y2={a.y - 20 / zoom} stroke="#6366f1" strokeWidth={sw} pointerEvents="none" />
            <circle cx={cx} cy={a.y - 20 / zoom} r={5 / zoom} fill="#fff" stroke="#6366f1" strokeWidth={sw} style={{ cursor: 'grab' }} onPointerDown={e => startDrag(e, 'rotate')} />
          </>}
        </>}
      </g>
    </g>
  );
}
