'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/lib/store';
import { FileImage, PenLine, Type, Upload, X } from 'lucide-react';
import { fileToImage } from '@/lib/image';

const FONTS = [
  '"Segoe Script", "Brush Script MT", cursive', '"Snell Roundhand", "Lucida Handwriting", cursive', '"Bradley Hand", cursive',
  '"Comic Sans MS", cursive', '"URW Chancery L", cursive', '"Apple Chancery", cursive', '"Kunstler Script", cursive',
  '"Monotype Corsiva", cursive', '"Vladimir Script", cursive', '"Lucida Calligraphy", cursive', '"Segoe Print", cursive',
  '"Courier New", monospace', 'Georgia, serif', '"Times New Roman", serif', 'cursive', 'fantasy', '"Trebuchet MS", cursive',
  '"Palatino Linotype", serif', '"Arial", sans-serif', '"Brush Script MT", cursive',
];
const W = 600, H = 200;

function trim(c: HTMLCanvasElement) {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 <= x0) return null; const o = document.createElement('canvas'); o.width = x1 - x0 + 8; o.height = y1 - y0 + 8;
  o.getContext('2d')!.drawImage(c, x0 - 4, y0 - 4, o.width, o.height, 0, 0, o.width, o.height); return o;
}

export function SignatureModal({ onClose }: { onClose: () => void }) {
  const addImage = useStore(s => s.addImage); const cv = useRef<HTMLCanvasElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'draw' | 'type'>('draw'), [text, setText] = useState(''), [font, setFont] = useState(0), [color, setColor] = useState('#000000'), [dirty, setDirty] = useState(false);
  const down = useRef(false);
  const pos = (e: React.PointerEvent) => { const r = cv.current!.getBoundingClientRect(); return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height]; };
  const clear = () => { cv.current!.getContext('2d')!.clearRect(0, 0, W, H); setDirty(false); };
  useEffect(() => { // typed preview
    if (mode !== 'type') return; const c = cv.current!, g = c.getContext('2d')!; g.clearRect(0, 0, W, H);
    g.fillStyle = color; g.font = `80px ${FONTS[font]}`; g.textBaseline = 'middle'; g.fillText(text, 20, H / 2, W - 40);
  }, [mode, text, font, color]);
  const use = () => { const t = trim(cv.current!); if (!t) return; addImage(t.toDataURL('image/png'), t.width, t.height); onClose(); };
  const ready = mode === 'draw' ? dirty : !!text.trim();
  return createPortal((
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-neutral-800"><div><h2 className="text-lg font-semibold">Create signature</h2><p className="text-xs text-stone-500">Type, draw, or upload your signature</p></div><button className="btn btn-icon" aria-label="Close" onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div className="flex items-center gap-1 border-b border-stone-200 px-4 pt-3 dark:border-neutral-800">
          <button className={`btn rounded-t-lg rounded-b-none border-b-2 ${mode === 'type' ? 'border-indigo-600 text-indigo-600' : 'border-transparent'}`} onClick={() => { setMode('type'); clear(); }}><Type className="h-4 w-4" />Type</button>
          <button className={`btn rounded-t-lg rounded-b-none border-b-2 ${mode === 'draw' ? 'border-indigo-600 text-indigo-600' : 'border-transparent'}`} onClick={() => { setMode('draw'); clear(); }}><PenLine className="h-4 w-4" />Draw</button>
          <button className="btn rounded-t-lg rounded-b-none border-b-2 border-transparent" onClick={() => upload.current?.click()}><FileImage className="h-4 w-4" />Upload image</button>
          <input ref={upload} type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { const im = await fileToImage(f); addImage(im.src, im.w, im.h); onClose(); } catch (err) { alert((err as Error).message); } }} />
          <div className="ml-auto flex items-center gap-2">
            <button type="button" aria-label="Use black ink" title="Black" onClick={() => setColor('#000000')} className={`h-6 w-6 rounded-full border-2 bg-black ${color.toLowerCase() === '#000000' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-stone-300'}`} />
            <input type="color" aria-label="Ink color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0" />
          </div>
        </div>
        <div className="p-5">
        {mode === 'type' && <>
          <input className="field mb-4 w-full text-base" placeholder="Enter your name" value={text} onChange={e => { setText(e.target.value); setFont(0); }} autoFocus />
          {text.trim() ? <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {FONTS.map((family, i) => <button key={i} type="button" onClick={() => setFont(i)} className={`min-h-16 rounded-xl border-2 px-3 py-2 text-left transition hover:border-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10 ${font === i ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15' : 'border-stone-200 dark:border-neutral-700'}`}>
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">Style {i + 1}</span>
              <span className="block truncate text-2xl" style={{ fontFamily: family, color }}>{text}</span>
            </button>)}
          </div> : <div className="grid h-32 place-items-center rounded-xl border border-dashed border-stone-300 text-sm text-stone-400 dark:border-neutral-700">Type your name to preview 20 styles</div>}
        </>}
        <canvas ref={cv} width={W} height={H} className="w-full touch-none rounded-xl border border-dashed border-stone-300 bg-stone-50 dark:border-neutral-700 dark:bg-neutral-800" style={{ cursor: mode === 'draw' ? 'crosshair' : 'default' }}
          onPointerDown={e => { if (mode !== 'draw') return; down.current = true; e.currentTarget.setPointerCapture(e.pointerId); const g = cv.current!.getContext('2d')!; const [x, y] = pos(e); g.strokeStyle = color; g.lineWidth = 4; g.lineCap = g.lineJoin = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 0.1, y + 0.1); g.stroke(); setDirty(true); }}
          onPointerMove={e => { if (!down.current) return; const g = cv.current!.getContext('2d')!; const [x, y] = pos(e); g.lineTo(x, y); g.stroke(); }}
          onPointerUp={() => { down.current = false; }} />
        <div className="mt-4 flex justify-end gap-2"><button className="btn" onClick={clear}>Clear</button><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!ready} onClick={use}><Upload className="h-4 w-4" />Place on page</button></div>
        </div>
      </div>
    </div>
  ), document.body);
}
