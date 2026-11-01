# Inkwell PDF Editor
Local-only PDF editor. Next.js (App Router) + TypeScript + Tailwind + Zustand + PDF.js (render) + pdf-lib (export).

    npm install
    npm test        # history + geometry unit tests
    npm run dev     # http://localhost:3000

Nothing is uploaded: no backend, no external requests; the PDF.js worker is bundled. The original bytes are never modified; Save builds a new `-edited.pdf`.

## How existing-text editing works
Click "Edit text" then a line of text. The original run is covered with a white patch and a live text box replaces it (same position, size, serif/sans/mono guess). Standard fonts only (Helvetica/Times/Courier).

## Known limits
- Edit/whiteout **cover** content, they do not remove it from the file: the old text can still be selected/extracted from the saved PDF. Not safe for redaction.
- No content-stream rewriting, no reflow, no original embedded fonts. Text colour of the original is not detected (black).
- Pages with a /Rotate entry or a non-zero MediaBox origin are not exported correctly (rotated pages are refused with a message).
- Characters outside the standard fonts' WinAnsi set export as "?". Rotated source text is not editable.
- Signatures are visual (drawn/typed image), not cryptographic. Encrypted PDFs are not supported.
- Memory: pdf-lib loads the whole file on Save; pages render lazily and off-screen canvases are freed.
