export type Tool = 'select'|'editText'|'text'|'link'|'highlight'|'underline'|'strike'|'draw'|'rect'|'ellipse'|'line'|'whiteout';
export type AnnType = 'text'|'image'|'link'|'highlight'|'underline'|'strike'|'whiteout'|'rect'|'ellipse'|'line'|'ink';
export type Family = 'Helvetica'|'Times'|'Courier';
export interface Style { color: string; fill: string; strokeWidth: number; opacity: number; fontFamily: Family; fontSize: number; bold: boolean; italic: boolean }
export interface Ann {
  id: string; page: number; type: AnnType;
  x: number; y: number; w: number; h: number; rotation: number; // PDF points, origin top-left
  style: Style; text?: string; points?: [number, number][]; src?: string; url?: string;
  cover?: { x: number; y: number; w: number; h: number }; // white patch hiding the original text this text replaces
}
export const ROTATABLE: AnnType[] = ['text', 'image', 'rect', 'ellipse'];
export const CSS_FONT: Record<Family, string> = { Helvetica: 'Helvetica, Arial, sans-serif', Times: '"Times New Roman", Times, serif', Courier: '"Courier New", Courier, monospace' };
