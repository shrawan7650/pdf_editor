'use client';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';

function Thumb({ index }: { index: number }) {
  const doc = useStore(s => s.doc)!, size = useStore(s => s.pages[index]), active = useStore(s => s.currentPage === index);
  const ref = useRef<HTMLCanvasElement>(null), box = useRef<HTMLButtonElement>(null), [vis, setVis] = useState(false);
  const W = 120, h = (size.h / size.w) * W;
  useEffect(() => { const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting), { rootMargin: '300px' }); io.observe(box.current!); return () => io.disconnect(); }, []);
  useEffect(() => {
    const c = ref.current!; if (!vis) { c.width = c.height = 0; return; } let task: { cancel(): void; promise: Promise<unknown> } | undefined, dead = false;
    (async () => { const p = await doc.getPage(index + 1); if (dead) return; const vp = p.getViewport({ scale: (W / size.w) * 2 }); c.width = vp.width; c.height = vp.height; task = p.render({ canvasContext: c.getContext('2d')!, viewport: vp }); await task.promise.catch(() => {}); })();
    return () => { dead = true; task?.cancel(); };
  }, [vis, doc, index, size.w]);
  return (
    <button ref={box} onClick={() => document.getElementById(`page-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="group flex flex-col items-center gap-1.5">
      <div className={`overflow-hidden rounded-md bg-white shadow ${active ? 'ring-2 ring-indigo-500' : 'ring-1 ring-black/10 group-hover:ring-indigo-300'}`} style={{ width: W, height: h }}>
        <canvas ref={ref} className="h-full w-full" />
      </div>
      <span className={`text-xs ${active ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-stone-500'}`}>{index + 1}</span>
    </button>
  );
}
export function Thumbs() {
  const n = useStore(s => s.pages.length);
  return <div className="flex flex-col items-center gap-4 overflow-y-auto p-4">{Array.from({ length: n }, (_, i) => <Thumb key={i} index={i} />)}</div>;
}
