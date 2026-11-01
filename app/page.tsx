'use client';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { TopBar } from '@/components/TopBar';
import { BottomBar } from '@/components/BottomBar';
import { Thumbs } from '@/components/Thumbs';
import { Workspace } from '@/components/Workspace';
import { Properties } from '@/components/Properties';

export default function Page() {
  const has = useStore(s => !!s.doc), theme = useStore(s => s.theme), left = useStore(s => s.leftOpen), right = useStore(s => s.rightOpen);
  useEffect(() => { const t = localStorage.getItem('theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); useStore.getState().setTheme(t as 'light' | 'dark'); if (innerWidth < 1024) useStore.setState({ leftOpen: false, rightOpen: false }); }, []);
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('theme', theme); }, [theme]);
  useEffect(() => {
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (!f || !/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') return;
      const st = useStore.getState(); if (st.anns.length && !confirm('Open this file? Unsaved edits will be lost.')) return; st.openFile(f);
    };
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]')) return;
      const st = useStore.getState(), m = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
      if (m && k === 'z') { e.preventDefault(); e.shiftKey ? st.redo() : st.undo(); }
      else if (m && k === 'y') { e.preventDefault(); st.redo(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && st.selectedId) { e.preventDefault(); st.remove(st.selectedId); }
      else if (e.key === 'Escape') { st.select(null); st.setTool('select'); }
    };
    const warn = (e: BeforeUnloadEvent) => { if (useStore.getState().anns.length) e.preventDefault(); };
    addEventListener('dragover', over); addEventListener('drop', drop); addEventListener('keydown', key); addEventListener('beforeunload', warn);
    return () => { removeEventListener('dragover', over); removeEventListener('drop', drop); removeEventListener('keydown', key); removeEventListener('beforeunload', warn); };
  }, []);
  const panel = 'bar absolute inset-y-0 z-20 w-64 shrink-0 overflow-hidden border-stone-200 shadow-xl transition-transform lg:static lg:z-auto lg:shadow-none dark:border-neutral-800';
  return (
    <div className="flex h-dvh flex-col">
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        {has && <aside className={`${panel} left-0 border-r ${left ? '' : '-translate-x-full lg:hidden'}`}><Thumbs /></aside>}
        <main className="min-w-0 flex-1 lg:pr-72"><Workspace /></main>
        {has && <aside className={`${panel} right-0 w-72 border-l lg:fixed lg:bottom-[5.5rem] lg:top-14 ${right ? '' : 'translate-x-full lg:hidden'}`}><Properties /></aside>}
      </div>
      <BottomBar />
    </div>
  );
}
