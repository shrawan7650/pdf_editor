'use client';
import { FileUp, Lock, Loader2 } from 'lucide-react';
import { useRef } from 'react';
import { useStore } from '@/lib/store';
import { PageView } from './PageView';

export function Workspace() {
  const { doc, pages, loading, error, openFile } = useStore();
  const input = useRef<HTMLInputElement>(null);
  if (!doc) return (
    <div className="grid h-full place-items-center p-6">
      <div onClick={() => input.current?.click()} className="w-full max-w-lg cursor-pointer rounded-3xl border-2 border-dashed border-stone-300 p-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-neutral-700 dark:hover:bg-indigo-500/5">
        {loading ? <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-indigo-500" /> : <FileUp className="mx-auto mb-4 h-10 w-10 text-indigo-500" />}
        <h1 className="text-2xl font-semibold tracking-tight">Drop a PDF to start editing</h1>
        <p className="mt-2 text-sm text-stone-500">or click to choose a file</p>
        <p className="mx-auto mt-5 flex max-w-xs items-center justify-center gap-2 text-xs text-stone-500"><Lock className="h-3.5 w-3.5 shrink-0" />Files stay on this device. Your original is never changed. Saving makes a new copy.</p>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
        <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={e => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ''; }} />
      </div>
    </div>
  );
  return (
    <div id="workspace" className="h-full overflow-auto border-red-500 bg-stone-200/60 dark:bg-neutral-950 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex w-max min-w-full flex-col items-center gap-6 p-4 sm:p-8">{pages.map((_, i) => <PageView key={i} index={i} />)}</div>
    </div>
  );
}
