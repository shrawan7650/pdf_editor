'use client';
import { Search, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useStore } from '@/lib/store';

export function FindReplaceModal({ onClose }: { onClose: () => void }) {
  const replaceText = useStore(s => s.replaceText);
  const setFindQuery = useStore(s => s.setFindQuery);
  const [find, setFind] = useState(''), [replace, setReplace] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const run = async () => {
    if (!find.trim()) { setMessage('Enter text to find.'); return; }
    setBusy(true); setMessage('');
    try {
      const count = await replaceText(find, replace);
      setMessage(count ? `${count} text item${count === 1 ? '' : 's'} replaced.` : 'No matching text found.');
    } catch (e) {
      setMessage(`Could not replace text: ${(e as Error).message}`);
    } finally { setBusy(false); }
  };
  const close = () => { setFindQuery(''); onClose(); };
  return createPortal((
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={close}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-neutral-800"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Search className="h-5 w-5" /></div><div><h2 className="font-semibold">Find & Replace</h2><p className="text-xs text-stone-500">Search results highlight directly on the PDF</p></div></div><button className="btn btn-icon" aria-label="Close" onClick={close}><X className="h-4 w-4" /></button></div>
        <div className="space-y-4 p-5"><div><label className="label">Find text</label><input autoFocus className="field h-10 w-full" value={find} onChange={e => { setFind(e.target.value); setFindQuery(e.target.value); setMessage(''); }} placeholder="e.g. old name" /></div>
        <div><label className="label">Replace with</label><input className="field h-10 w-full" value={replace} onChange={e => setReplace(e.target.value)} placeholder="e.g. new name" onKeyDown={e => { if (e.key === 'Enter') run(); }} /></div>
        <div className="rounded-xl bg-stone-50 p-3 text-xs text-stone-500 dark:bg-neutral-800/70">Matching is case-insensitive. Existing PDF text stays unchanged until you click <b>Replace all</b>.</div>
        {message && <p className={`text-sm ${message.includes('Could not') ? 'text-red-600' : message.includes('No matching') ? 'text-amber-600' : 'text-emerald-600'}`}>{message}</p>}
        <div className="flex justify-end gap-2 pt-1"><button className="btn" onClick={close}>Cancel</button><button className="btn btn-primary" disabled={busy || !find.trim()} onClick={run}>{busy ? 'Replacing…' : 'Replace all'}</button></div></div>
      </div>
    </div>
  ), document.body);
}
