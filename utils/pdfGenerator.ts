import type { GeneratedPanel } from '../types.js';
import { COVER_PAGE_NUMBER, CENTERFOLD_PAGE_NUMBER } from '../constants.js';

declare const jspdf: any;

const getImageDimensions = (imgDataUrl: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            resolve({ width: 3, height: 4 });
            return;
        }
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = (err) => {
            console.error("Failed to load image for dimension check", err);
            resolve({ width: 3, height: 4 }); // Fallback to a default aspect ratio
        };
        img.src = imgDataUrl;
    });
};

// A simple layout engine for panels on a page
const calculatePanelLayouts = (panelCount: number, pageWidth: number, pageHeight: number, margin: number, gap: number) => {
    const layouts: { x: number, y: number, w: number, h: number }[] = [];
    const contentW = pageWidth - margin * 2;
    const contentH = pageHeight - margin * 2;
    const x = margin;
    const y = margin;

    switch (panelCount) {
        case 1:
            layouts.push({ x, y, w: contentW, h: contentH });
            break;
        case 2:
            {
                const h = (contentH - gap) / 2;
                layouts.push({ x, y, w: contentW, h });
                layouts.push({ x, y: y + h + gap, w: contentW, h });
            }
            break;
        case 3:
            {
                const h1 = (contentH - gap) / 2;
                const w2 = (contentW - gap) / 2;
                const h2 = contentH - h1 - gap;
                layouts.push({ x, y, w: contentW, h: h1 });
                layouts.push({ x, y: y + h1 + gap, w: w2, h: h2 });
                layouts.push({ x: x + w2 + gap, y: y + h1 + gap, w: w2, h: h2 });
            }
            break;
        case 4:
            {
                const w = (contentW - gap) / 2;
                const h = (contentH - gap) / 2;
                layouts.push({ x, y, w, h });
                layouts.push({ x: x + w + gap, y, w, h });
                layouts.push({ x, y: y + h + gap, w, h });
                layouts.push({ x: x + w + gap, y: y + h + gap, w, h });
            }
            break;
        default:
            // For 5, 6, etc. a 2-column grid
            const cols = 2;
            const rows = Math.ceil(panelCount / cols);
            const w = (contentW - ((cols - 1) * gap)) / cols;
            const h = (contentH - ((rows - 1) * gap)) / rows;
            for (let i = 0; i < panelCount; i++) {
                const row = Math.floor(i / cols);
                const col = i % cols;
                layouts.push({
                    x: x + col * (w + gap),
                    y: y + row * (h + gap),
                    w,
                    h
                });
            }
            break;
    }
    return layouts;
}

const addImageToPdfPage = async (doc: any, imgUrl: string, bounds: { x: number, y: number, w: number, h: number }) => {
    const imgDim = await getImageDimensions(imgUrl);
    const imgRatio = imgDim.width / imgDim.height;
    const boundRatio = bounds.w / bounds.h;

    let imgW, imgH, imgX, imgY;

    if (imgRatio > boundRatio) { // Image is wider than the container
        imgW = bounds.w;
        imgH = bounds.w / imgRatio;
        imgX = bounds.x;
        imgY = bounds.y + (bounds.h - imgH) / 2; // Center vertically
    } else { // Image is taller or same aspect ratio
        imgH = bounds.h;
        imgW = bounds.h * imgRatio;
        imgX = bounds.x + (bounds.w - imgW) / 2; // Center horizontally
        imgY = bounds.y;
    }
    doc.addImage(imgUrl, 'JPEG', imgX, imgY, imgW, imgH);
};

export async function createComicPdf(images: GeneratedPanel[], title: string, options: { output?: 'save' | 'blob' } = {}): Promise<Blob | null> {
  const { jsPDF } = jspdf;
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'in',
    format: [6.625, 10.25] // Standard comic book size
  });
  const outputType = options.output || 'save';

  const PAGE_W = 6.625;
  const PAGE_H = 10.25;
  const PAGE_MARGIN = 0.25;
  const PANEL_GAP = 0.1;

  const getPageSortValue = (pageNumber: string | number): number => {
    if (pageNumber === COVER_PAGE_NUMBER) return -1;
    if (pageNumber === CENTERFOLD_PAGE_NUMBER) return 10.5;
    const num = Number(pageNumber);
    return isNaN(num) ? Infinity : num;
  };
  
  const sortedImages = [...images].sort((a, b) => getPageSortValue(a.page_number) - getPageSortValue(b.page_number));

  const pages = sortedImages.reduce<Record<string, GeneratedPanel[]>>((acc, panel) => {
      const pageKey = String(panel.page_number);
      if (pageKey === '10' || pageKey === '11') { // Group centerfold pages
          if (!acc[CENTERFOLD_PAGE_NUMBER]) acc[CENTERFOLD_PAGE_NUMBER] = [];
          acc[CENTERFOLD_PAGE_NUMBER].push(panel);
      } else {
          if (!acc[pageKey]) acc[pageKey] = [];
          acc[pageKey].push(panel);
      }
      return acc;
  }, {});

  const sortedPageKeys = Object.keys(pages).sort((a, b) => getPageSortValue(a) - getPageSortValue(b));

  // Handle Cover on the first page
  const coverPanels = pages[String(COVER_PAGE_NUMBER)];
  if (coverPanels && coverPanels.length > 0) {
      await addImageToPdfPage(doc, coverPanels[0].imageUrl, { x: 0, y: 0, w: PAGE_W, h: PAGE_H });
  } else {
      // If no cover, add a blank first page so page numbering isn't off.
      // This is unlikely to happen but is a good safeguard.
      doc.addPage();
  }

  // Add subsequent pages
  for (const pageKey of sortedPageKeys) {
      if (pageKey === String(COVER_PAGE_NUMBER)) continue;

      const pagePanels = pages[pageKey];
      const isCenterfold = pageKey === CENTERFOLD_PAGE_NUMBER;
      
      let pageW = isCenterfold ? PAGE_H : PAGE_W; // Swapped for landscape
      let pageH = isCenterfold ? PAGE_W : PAGE_H;
      let orientation = isCenterfold ? 'l' : 'p';
      
      doc.addPage([pageW, pageH], orientation);
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageW, pageH, 'F');
      
      if (isCenterfold) { // Centerfold uses a simple side-by-side layout
          const leftPanels = pagePanels.filter(p => p.page_number === 10);
          const rightPanels = pagePanels.filter(p => p.page_number === 11);

          if (leftPanels.length > 0) {
              await addImageToPdfPage(doc, leftPanels[0].imageUrl, { x: 0, y: 0, w: PAGE_H, h: PAGE_W });
          }
          if (rightPanels.length > 0) {
              await addImageToPdfPage(doc, rightPanels[0].imageUrl, { x: PAGE_H, y: 0, w: PAGE_H, h: PAGE_W });
          }
      } else {
          const panelLayouts = calculatePanelLayouts(pagePanels.length, PAGE_W, PAGE_H, PAGE_MARGIN, PANEL_GAP);
          for (let i = 0; i < pagePanels.length; i++) {
              const panel = pagePanels[i];
              const layout = panelLayouts[i];
              await addImageToPdfPage(doc, panel.imageUrl, layout);
          }
      }
  }

  // Add a simple back cover
  doc.addPage([PAGE_W, PAGE_H], 'p');
  doc.setFillColor(17, 24, 39); // bg-gray-900
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.text('Comic Crafter AI', doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() / 2, { align: 'center' });

  // Remove the initial blank page jsPDF adds by default if a cover was not the first operation
  if (doc.internal.pages.length > 1 && !(coverPanels && coverPanels.length > 0)) {
    doc.deletePage(1);
  }

  if (outputType === 'blob') {
    return doc.output('blob');
  } else {
    doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}_comic.pdf`);
    return null;
  }
}