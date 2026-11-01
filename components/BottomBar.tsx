'use client';
import { Circle, Eraser, Highlighter, ImagePlus, Link2, Minus, MousePointer2, Pencil, PenTool, Square, Strikethrough, TextCursorInput, Type, Underline } from 'lucide-react';
import { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { fileToImage } from '@/lib/image';
import type { Tool } from '@/lib/types';
import { SignatureModal } from './SignatureModal';

const TOOLS: { id: Tool; label: string; Icon: typeof Type }[] = [
  { id: 'select', label: 'Select', Icon: MousePointer2 }, { id: 'editText', label: 'Edit text', Icon: TextCursorInput }, { id: 'text', label: 'Add text', Icon: Type }, { id: 'link', label: 'Add link', Icon: Link2 },
  { id: 'highlight', label: 'Highlight', Icon: Highlighter }, { id: 'underline', label: 'Underline', Icon: Underline }, { id: 'strike', label: 'Strike', Icon: Strikethrough },
  { id: 'draw', label: 'Draw', Icon: Pencil }, { id: 'rect', label: 'Rectangle', Icon: Square }, { id: 'ellipse', label: 'Ellipse', Icon: Circle },
  { id: 'line', label: 'Line', Icon: Minus }, { id: 'whiteout', label: 'Whiteout', Icon: Eraser },
];
export function BottomBar() {
  const tool = useStore(s => s.tool), setTool = useStore(s => s.setTool), addImage = useStore(s => s.addImage), has = useStore(s => !!s.doc);
  const input = useRef<HTMLInputElement>(null); const [sig, setSig] = useState(false);
  return (
    <nav className="bar shrink-0 border-t px-2 py-1.5">
      <div className="mx-auto flex max-w-full items-center gap-1 overflow-x-auto sm:justify-center">
        {TOOLS.map(({ id, label, Icon }) => (
          <button key={id} disabled={!has} onClick={() => setTool(id)} title={label} className={`btn flex-col !h-12 min-w-[3.5rem] !gap-0.5 !px-2 text-[11px] ${tool === id ? 'btn-on' : ''}`}><Icon className="h-4 w-4" />{label}</button>
        ))}
        <div className="mx-1 h-8 w-px shrink-0 bg-stone-300 dark:bg-neutral-700" />
        <button disabled={!has} onClick={() => input.current?.click()} className="btn flex-col !h-12 min-w-[3.5rem] !gap-0.5 !px-2 text-[11px]"><ImagePlus className="h-4 w-4" />Image</button>
        <button disabled={!has} onClick={() => setSig(true)} className="btn flex-col !h-12 min-w-[3.5rem] !gap-0.5 !px-2 text-[11px]"><PenTool className="h-4 w-4" />Sign</button>
        <input ref={input} type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { const im = await fileToImage(f); addImage(im.src, im.w, im.h); } catch (err) { alert((err as Error).message); } }} />
      </div>
      {sig && <SignatureModal onClose={() => setSig(false)} />}
    </nav>
  );
}
