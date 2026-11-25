/* Renders the résumé PDF as crisp "paper sheets" with live links (PDF.js).
   Always reads the PDF itself, so updating the résumé = replacing one file. */
const viewer = document.querySelector('[data-pdf]');

const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/legacy/build/';

function fallback(url) {
  viewer.setAttribute('aria-busy', 'false');
  viewer.innerHTML = `
    <div class="pdf-fallback">
      <iframe src="${url}#view=FitH" title="Résumé (PDF)" loading="lazy"></iframe>
      <p>The inline viewer didn't load. <a class="text-link" href="${url}">Open the PDF directly</a>.</p>
    </div>`;
}

async function render() {
  const url = viewer.dataset.pdf;
  let pdfjsLib;
  try {
    pdfjsLib = await import(`${PDFJS}pdf.min.mjs`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS}pdf.worker.min.mjs`;
  } catch (err) {
    console.warn('PDF.js failed to load', err);
    fallback(url);
    return;
  }

  try {
    const doc = await pdfjsLib.getDocument({ url, isEvalSupported: false }).promise;
    const pages = [];
    const frag = document.createDocumentFragment();

    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });

      const wrap = document.createElement('figure');
      wrap.className = 'sheet-wrap';
      const sheet = document.createElement('div');
      sheet.className = 'sheet';
      sheet.style.aspectRatio = `${base.width} / ${base.height}`;
      const canvas = document.createElement('canvas');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `Résumé, page ${n} of ${doc.numPages}`);
      sheet.appendChild(canvas);

      // Keep the PDF's hyperlinks clickable (positioned in % so they scale).
      const annotations = await page.getAnnotations();
      annotations
        .filter((a) => a.subtype === 'Link' && a.url)
        .forEach((a) => {
          const [x1, y1, x2, y2] = base.convertToViewportRectangle(a.rect);
          const link = document.createElement('a');
          link.className = 'sheet-link';
          link.href = a.url;
          if (!a.url.startsWith('mailto:')) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
          }
          link.setAttribute('aria-label', a.url.replace(/^mailto:/, 'Email '));
          link.style.left = `${(Math.min(x1, x2) / base.width) * 100}%`;
          link.style.top = `${(Math.min(y1, y2) / base.height) * 100}%`;
          link.style.width = `${(Math.abs(x2 - x1) / base.width) * 100}%`;
          link.style.height = `${(Math.abs(y2 - y1) / base.height) * 100}%`;
          sheet.appendChild(link);
        });

      const cap = document.createElement('figcaption');
      cap.className = 'sheet-cap';
      cap.textContent = `Page ${n} / ${doc.numPages}`;
      wrap.append(sheet, cap);
      frag.appendChild(wrap);
      pages.push({ page, base, canvas, sheet, task: null });
    }

    viewer.replaceChildren(frag);
    viewer.setAttribute('aria-busy', 'false');

    const paint = async () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      for (const p of pages) {
        const cssWidth = p.sheet.clientWidth || 800;
        const scale = Math.min(cssWidth * dpr, 2200) / p.base.width;
        const viewport = p.page.getViewport({ scale });
        if (p.task) p.task.cancel();
        const ctx = p.canvas.getContext('2d', { alpha: false });
        p.canvas.width = Math.floor(viewport.width);
        p.canvas.height = Math.floor(viewport.height);
        p.task = p.page.render({ canvasContext: ctx, viewport });
        try { await p.task.promise; } catch (e) { /* cancelled by a newer paint */ }
      }
    };
    await paint();

    // Re-paint only when the column changes size meaningfully.
    let lastWidth = viewer.clientWidth;
    let timer;
    new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (Math.abs(viewer.clientWidth - lastWidth) > 60) {
          lastWidth = viewer.clientWidth;
          paint();
        }
      }, 220);
    }).observe(viewer);
  } catch (err) {
    console.warn('Could not render the résumé', err);
    fallback(url);
  }
}

if (viewer) render();
