import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Inkwell PDF Editor', description: 'Edit PDFs privately in your browser. Nothing is uploaded.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
