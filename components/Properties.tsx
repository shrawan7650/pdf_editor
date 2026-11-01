'use client';
import { Bold, Copy, Italic, Move, Palette, Ruler, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { ROTATABLE, type AnnType, type Family, type Tool } from '@/lib/types';

const TOOL_KIND: Partial<Record<Tool, AnnType>> = { text: 'text', editText: 'text', highlight: 'highlight', underline: 'underline', strike: 'strike', draw: 'ink', rect: 'rect', ellipse: 'ellipse', line: 'line', whiteout: 'whiteout' };

function Section({ icon: Icon, title, children }: { icon: typeof Move; title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-950/50">
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500"><Icon className="h-3.5 w-3.5 text-indigo-500" />{title}</div>
    {children}
  </section>;
}

function NumberField({ label, value, min = 0, onChange }: { label: string; value: number; min?: number; onChange: (value: number) => void }) {
  return <label className="block"><span className="label">{label}</span><input type="number" min={min} step="0.1" className="field w-full" value={Math.round(value * 10) / 10} onChange={e => onChange(Math.max(min, +e.target.value || min))} /></label>;
}

export function Properties() {
  const { anns, selectedId, tool, defaults, setStyle, update, remove, duplicate } = useStore();
  const sel = anns.find(a => a.id === selectedId); const s = sel?.style ?? defaults; const kind = sel?.type ?? TOOL_KIND[tool];
  if (!kind) return <div className="space-y-3 p-4">
    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><SlidersHorizontal className="h-6 w-6" /></div>
    <h2 className="text-base font-semibold">Properties</h2>
    <p className="text-sm leading-6 text-stone-500">Select an item on the page or choose a tool below to see its controls here.</p>
    <div className="rounded-xl border border-dashed border-stone-300 p-3 text-xs text-stone-500 dark:border-neutral-700">Tip: Double-click text to edit it in place.</div>
  </div>;
  const shape = ['rect', 'ellipse'].includes(kind), stroke = ['rect', 'ellipse', 'line', 'ink', 'underline', 'strike'].includes(kind);
  const title = { text: 'Text', image: 'Image', link: 'Link', highlight: 'Highlight', underline: 'Underline', strike: 'Strikethrough', whiteout: 'Whiteout', rect: 'Rectangle', ellipse: 'Ellipse', line: 'Line', ink: 'Drawing' }[kind];
  return (
    <div className="h-full select-none space-y-4 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="sticky top-0 z-10 -mx-4 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
        <div className="flex items-center gap-2"><div className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><SlidersHorizontal className="h-3.5 w-3.5" /></div><div><h2 className="text-sm font-semibold">{title}{sel ? '' : ' (next one)'}</h2><p className="text-[11px] text-stone-500">{sel ? 'Selected item' : 'Tool defaults'}</p></div></div>
      </div>
      {kind === 'text' && <Section icon={Ruler} title="Text style">
        <div><span className="label">Font family</span><select className="field w-full" value={s.fontFamily} onChange={e => setStyle({ fontFamily: e.target.value as Family })}><option value="Helvetica">Sans (Helvetica)</option><option value="Times">Serif (Times)</option><option value="Courier">Mono (Courier)</option></select></div>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1"><span className="label">Font size</span><input type="number" min={4} max={200} className="field w-full" value={Math.round(s.fontSize * 10) / 10} onChange={e => setStyle({ fontSize: Math.max(4, +e.target.value || 12) })} /></div>
          <button aria-label="Bold" className={`btn btn-icon ${s.bold ? 'btn-on' : ''}`} onClick={() => setStyle({ bold: !s.bold })}><Bold className="h-4 w-4" /></button>
          <button aria-label="Italic" className={`btn btn-icon ${s.italic ? 'btn-on' : ''}`} onClick={() => setStyle({ italic: !s.italic })}><Italic className="h-4 w-4" /></button>
        </div></Section>}
      {sel && !sel.points && <Section icon={Move} title="Position & size">
        <div className="grid grid-cols-2 gap-2"><NumberField label="X" value={sel.x} onChange={x => update(sel.id, { x }, 'x')} /><NumberField label="Y" value={sel.y} onChange={y => update(sel.id, { y }, 'y')} /></div>
        <div className="mt-3 grid grid-cols-2 gap-2"><NumberField label="Width" value={sel.w} min={4} onChange={w => update(sel.id, { w }, 'w')} /><NumberField label="Height" value={sel.h} min={4} onChange={h => update(sel.id, { h }, 'h')} /></div>
      </Section>}
      {kind !== 'image' && <Section icon={Palette} title="Appearance"><span className="label">{shape || kind === 'line' || kind === 'ink' ? 'Stroke color' : 'Color'}</span><input type="color" className="h-9 w-full cursor-pointer rounded-md" value={s.color} onChange={e => setStyle({ color: e.target.value })} />
      {shape && <div className="mt-3"><label className="label flex items-center gap-2"><input type="checkbox" checked={s.fill !== 'none'} onChange={e => setStyle({ fill: e.target.checked ? '#fde68a' : 'none' })} />Fill</label>
        {s.fill !== 'none' && <input type="color" className="h-9 w-full cursor-pointer rounded-md" value={s.fill} onChange={e => setStyle({ fill: e.target.value })} />}</div>}
      {stroke && <div className="mt-3"><span className="label">Thickness ({s.strokeWidth}pt)</span><input type="range" min={0.5} max={20} step={0.5} className="w-full" value={s.strokeWidth} onChange={e => setStyle({ strokeWidth: +e.target.value })} /></div>}
      {kind !== 'whiteout' && <div className="mt-3"><span className="label">Opacity ({Math.round(s.opacity * 100)}%)</span><input type="range" min={0.1} max={1} step={0.05} className="w-full" value={s.opacity} onChange={e => setStyle({ opacity: +e.target.value })} /></div>}</Section>}
      {sel && ROTATABLE.includes(sel.type) && <Section icon={Ruler} title="Transform"><span className="label">Rotation ({sel.rotation}°)</span><input type="range" min={0} max={359} className="w-full" value={sel.rotation} onChange={e => update(sel.id, { rotation: +e.target.value }, 'rot')} /></Section>}
      {sel && <div className="flex gap-2 pt-1"><button className="btn flex-1 border border-stone-300 dark:border-neutral-700" onClick={() => duplicate(sel.id)}><Copy className="h-4 w-4" />Duplicate</button>
        <button className="btn flex-1 border border-red-300 text-red-600 dark:border-red-500/40 dark:text-red-400" onClick={() => remove(sel.id)}><Trash2 className="h-4 w-4" />Delete</button></div>}
    </div>
  );
}
