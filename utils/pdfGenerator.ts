

// FIX: Use GeneratedPanel type as GeneratedImage is not defined.
import type { GeneratedPanel } from '../types.js';
import { COVER_PAGE_NUMBER, CENTERFOLD_PAGE_NUMBER } from '../constants.js';

declare const jspdf: any;

// FIX: Use GeneratedPanel[] for the images parameter.
export async function createComicPdf(images: GeneratedPanel[], title: string, options: { output?: 'save' | 'blob' } = {}): Promise<Blob | null> {
  const { jsPDF } = jspdf;
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'in',
    format: [6.625, 10.25] // Standard comic book size
  });
  const outputType = options.output || 'save';

  const getPageSortValue = (pageNumber: string | number): number => {
    if (pageNumber === COVER_PAGE_NUMBER) return -1;
    if (pageNumber === CENTERFOLD_PAGE_NUMBER) return 10.5;
    const num = Number(pageNumber);
    return isNaN(num) ? Infinity : num;
  };

  // FIX: Use page_number property from GeneratedPanel type.
  const sortedImages = [...images].sort((a, b) => getPageSortValue(a.page_number) - getPageSortValue(b.page_number));
  
  const addImageToPage = (imgUrl: string, isLandscape: boolean) => {
    let width, height;
    if (isLandscape) {
      // Centerfold: double width, standard height
      width = 6.625 * 2;
      height = 10.25;
      // For landscape orientation in jsPDF, you provide [height, width] and 'l'
      doc.addPage([height, width], 'l');
    } else {
      // Standard page
      width = 6.625;
      height = 10.25;
      doc.addPage([width, height], 'p');
    }
    doc.addImage(imgUrl, 'JPEG', 0, 0, width, height);
  };
  
  // First page (cover)
  const coverImage = sortedImages.shift();
  if(coverImage) {
      doc.addImage(coverImage.imageUrl, 'JPEG', 0, 0, 6.625, 10.25);
  }

  // Add subsequent pages
  for (const image of sortedImages) {
    // FIX: Use page_number property from GeneratedPanel type.
    // FIX: Fix type error by converting number to string for comparison. The types 'number' and 'string' have no overlap.
    const isCenterfold = String(image.page_number) === CENTERFOLD_PAGE_NUMBER;
    addImageToPage(image.imageUrl, isCenterfold);
  }

  // Add a simple back cover
  doc.addPage([6.625, 10.25], 'p');
  doc.setFillColor(17, 24, 39); // bg-gray-900
  doc.rect(0, 0, 6.625, 10.25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.text('Comic Crafter AI', doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() / 2, { align: 'center' });

  if (outputType === 'blob') {
    return doc.output('blob');
  } else {
    doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}_comic.pdf`);
    return null;
  }
}