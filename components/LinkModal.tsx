'use client';
import { Link2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useState } from 'react';

export function LinkModal({ onSave, onClose }: { onSave: (url: string) => void; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const save = () => { const value = url.trim(); if (!value) return; onSave(/^https?:\/\//i.test(value) ? value : `https://${value}`); };
  return createPortal((
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-neutral-800"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-100 text-indigo-600"><Link2 className="h-4 w-4" /></div><div><h2 className="font-semibold">Add link</h2><p className="text-xs text-stone-500">Attach a clickable URL to this area</p></div></div><button className="btn btn-icon" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button></div>
        <div className="space-y-3 p-5"><label className="label">Website URL</label><input autoFocus className="field h-10 w-full" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" onKeyDown={e => { if (e.key === 'Enter') save(); }} /><p className="text-xs text-stone-500">You can enter a URL with or without https://</p><div className="flex justify-end gap-2 pt-2"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!url.trim()} onClick={save}>Add link</button></div></div>
      </div>
    </div>
  ), document.body);
}
