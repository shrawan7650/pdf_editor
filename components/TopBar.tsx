'use client';
import { Download, FilePlus2, FolderOpen, Maximize2, Moon, PanelLeft, PanelRight, Redo2, Search, Sun, Undo2, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { exportPdf } from '@/lib/export';
import { FindReplaceModal } from './FindReplaceModal';

export function TopBar() {
  const s = useStore(); const input = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false), [findOpen, setFindOpen] = useState(false);
  const has = !!s.doc;
  const open = (f?: File) => { if (!f) return; if (s.anns.length && !confirm('Open another file? Unsaved edits will be lost.')) return; s.openFile(f); };
  const fit = () => { const w = document.getElementById('workspace')?.clientWidth; if (w && s.pages[0]) s.setZoom((w - 64) / s.pages[0].w); };
  const save = async () => {
    setBusy(true);
    try {
      const out = await exportPdf(s.bytes!, s.anns); const url = URL.createObjectURL(new Blob([out as BlobPart], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = s.fileName.replace(/\.pdf$/i, '') + '-edited.pdf'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (e) { alert('Could not save: ' + (e as Error).message); } finally { setBusy(false); }
  };
  const dark = s.theme === 'dark';
  return (
    <header className="bar flex h-14 shrink-0 items-center gap-1 border-b px-2 sm:px-3">
      <button className="btn btn-icon lg:hidden" aria-label="Pages" disabled={!has} onClick={() => s.toggle('leftOpen')}><PanelLeft className="h-4 w-4" /></button>
      <div className="mr-2 flex min-w-0 items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">I</span>
        <div className="hidden min-w-0 sm:block"><div className="text-sm font-semibold leading-none">Inkwell</div><div className="max-w-[14rem] truncate text-xs text-stone-500">{s.fileName || 'No file open'}</div></div>
      </div>
      <button className="btn" onClick={() => input.current?.click()}><FolderOpen className="h-4 w-4" /><span className="hidden md:inline">Open</span></button>
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={e => { open(e.target.files?.[0]); e.target.value = ''; }} />
      <button className="btn" disabled={!has || s.loading} title="Insert a blank page after the current page" onClick={s.insertPage}><FilePlus2 className="h-4 w-4" /><span className="hidden md:inline">Insert page</span></button>
      <button className="btn" disabled={!has} title="Find and replace text" onClick={() => setFindOpen(true)}><Search className="h-4 w-4" /><span className="hidden md:inline">Find & Replace</span></button>
      <div className="mx-1 h-5 w-px bg-stone-300 dark:bg-neutral-700" />
      <button className="btn btn-icon" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!s.past.length} onClick={s.undo}><Undo2 className="h-4 w-4" /></button>
      <button className="btn btn-icon" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!s.future.length} onClick={s.redo}><Redo2 className="h-4 w-4" /></button>
      <div className="ml-auto flex items-center gap-1">
        <div className="hidden items-center sm:flex">
          <button className="btn btn-icon" aria-label="Zoom out" disabled={!has} onClick={() => s.setZoom(s.zoom - 0.1)}><ZoomOut className="h-4 w-4" /></button>
          <span className="w-12 text-center text-sm tabular-nums">{Math.round(s.zoom * 100)}%</span>
          <button className="btn btn-icon" aria-label="Zoom in" disabled={!has} onClick={() => s.setZoom(s.zoom + 0.1)}><ZoomIn className="h-4 w-4" /></button>
          <button className="btn btn-icon" aria-label="Fit width" title="Fit width" disabled={!has} onClick={fit}><Maximize2 className="h-4 w-4" /></button>
        </div>
        <button className="btn btn-icon" aria-label="Toggle theme" onClick={() => s.setTheme(dark ? 'light' : 'dark')}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
        <button className="btn btn-primary" disabled={!has || busy} onClick={save}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}<span className="hidden sm:inline">Save</span></button>
        <button className="btn btn-icon lg:hidden" aria-label="Properties" disabled={!has} onClick={() => s.toggle('rightOpen')}><PanelRight className="h-4 w-4" /></button>
      </div>
      {findOpen && <FindReplaceModal onClose={() => setFindOpen(false)} />}
    </header>
  );
}
