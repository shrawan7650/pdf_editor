export async function fileToImage(file: File): Promise<{ src: string; w: number; h: number }> {
  const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Unsupported image')); i.src = url; });
  let src = url;
  if (!/^data:image\/(png|jpeg)/.test(url)) { // PDF embeds PNG/JPEG natively; convert anything else (webp, gif...)
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d')!.drawImage(img, 0, 0); src = c.toDataURL('image/png');
  }
  return { src, w: img.naturalWidth, h: img.naturalHeight };
}
