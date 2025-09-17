import type {
  CharacterProfile,
  StoryDevelopmentPackage,
  StoryOutline,
  GeneratedCharacter,
  CharacterImage,
  GeneratedPanel
} from '../types.js';
import { COVER_PAGE_NUMBER, CENTERFOLD_PAGE_NUMBER } from '../constants.js';

declare const jspdf: any;

// Helper function to add styled text and handle word wrapping
const addWrappedText = (doc: any, text: string, x: number, y: number, maxWidth: number, options: any = {}) => {
  const lines = doc.splitTextToSize(text || '', maxWidth);
  doc.text(lines, x, y, options);
  // Calculate height of the text block
  const lineHeight = doc.getLineHeight();
  const fontRatio = doc.internal.scaleFactor;
  return (lines.length * lineHeight) / fontRatio;
};

// Main function to create the creative book
export async function createCreativeBookPdf(
  title: string,
  initialImageBase64: string | null,
  characterProfile: CharacterProfile | null,
  storyDevelopmentPackage: StoryDevelopmentPackage | null,
  story: StoryOutline | null,
  characterRoster: GeneratedCharacter[],
  sceneImages: Map<string, Record<string, CharacterImage>>,
  generatedPanels: GeneratedPanel[]
): Promise<Blob> {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'in',
        format: [6.625, 10.25] // Standard comic book size
    });

    const pageW = 6.625;
    const pageH = 10.25;
    const margin = 0.5;
    const contentW = pageW - margin * 2;
    let currentY = 0;

    const addPageWithDefaults = (pageTitle?: string) => {
        doc.addPage();
        doc.setFillColor(17, 24, 39); // bg-gray-900
        doc.rect(0, 0, pageW, pageH, 'F');
        doc.setTextColor(253, 224, 71); // text-yellow-300
        if(pageTitle) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.text(pageTitle, pageW / 2, margin * 1.5, { align: 'center' });
        }
        currentY = margin * 2.5;
    };

    // --- Cover Page ---
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, pageW, pageH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(48);
    doc.setTextColor(255, 255, 255);
    doc.text("The Creative's Book", pageW / 2, pageH / 2 - 1, { align: 'center' });
    doc.setFontSize(32);
    doc.setTextColor(253, 224, 71); // text-yellow-300
    doc.text(title, pageW / 2, pageH / 2, { align: 'center' });
    
    // --- 1. Spark of Inspiration ---
    if (initialImageBase64) {
        addPageWithDefaults("The Spark of Inspiration");
        const imgH = contentW;
        if(currentY + imgH < pageH - margin) {
            doc.addImage(initialImageBase64, 'JPEG', margin, currentY, contentW, imgH);
        }
    }
    
    // --- 2. Character Blueprint ---
    if (characterProfile) {
        addPageWithDefaults("Character Blueprint");
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        currentY += addWrappedText(doc, "AI Analysis:", margin, currentY, contentW);
        currentY += 0.2;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(209, 213, 219); // text-gray-300
        
        const profileText = [
            `Art Style: ${characterProfile.art_style}`,
            `Consistency Tags: ${characterProfile.consistency_tags}`,
            `Physical Traits: ${characterProfile.physical_traits.join(', ')}`,
            `Clothing Style: ${characterProfile.clothing_style}`,
            `Color Palette: ${characterProfile.color_palette.join(', ')}`,
            `Distinctive Features: ${characterProfile.distinctive_features.join(', ')}`
        ].join('\n');
        addWrappedText(doc, profileText, margin, currentY, contentW);
    }

    // --- 3. Prologue ---
    if (story?.prologue) {
        addPageWithDefaults("The Story Begins...");
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(12);
        doc.setTextColor(209, 213, 219);
        addWrappedText(doc, story.prologue, margin, currentY, contentW);
    }

    // --- 3a. Full Text Story ---
    if (story?.fullStoryText) {
        addPageWithDefaults("The Full Story");
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(209, 213, 219); // text-gray-300

        const lines = doc.splitTextToSize(story.fullStoryText, contentW);
        const lineHeight = doc.getLineHeight() / doc.internal.scaleFactor;
        
        // Calculate lines for the first page of this section
        const spaceForTextOnFirstPage = pageH - currentY - margin;
        const linesOnFirstPage = Math.floor(spaceForTextOnFirstPage / lineHeight);
        
        let firstPageLines = lines.slice(0, linesOnFirstPage);
        doc.text(firstPageLines, margin, currentY);

        let remainingLines = lines.slice(linesOnFirstPage);
        
        // Calculate lines for subsequent full pages
        const linesPerPageAfter = Math.floor((pageH - (margin * 2.5) - margin) / lineHeight);

        while (remainingLines.length > 0) {
            addPageWithDefaults("The Full Story (cont.)");
            let pageLines = remainingLines.slice(0, linesPerPageAfter);
            doc.text(pageLines, margin, currentY);
            remainingLines = remainingLines.slice(linesPerPageAfter);
        }
    }

    // --- 4. Meet The Cast ---
    if (characterRoster.length > 0) {
        characterRoster.forEach(character => {
            addPageWithDefaults(`Meet The Cast: ${character.name}`);
            const imgUrl = character.imageUrls.full;
            if (imgUrl) {
                const imgH = contentW;
                if(currentY + imgH < pageH - margin) {
                    doc.addImage(imgUrl, 'JPEG', margin, currentY, contentW, imgH);
                    currentY += imgH + 0.3;
                }
            }
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(209, 213, 219);
            const arc = storyDevelopmentPackage?.character_arcs.find(a => a.character_name === character.name);
            const voice = storyDevelopmentPackage?.character_voices.find(v => v.character_name === character.name);
            
            let charText = `Role: ${character.role}\n\nDescription: ${character.description}`;
            if(arc) charText += `\n\nConflict: ${arc.internal_conflict}\n\nArc: ${arc.arc_summary}`;
            if(voice) charText += `\n\nVoice: ${voice.speech_patterns} (${voice.vocabulary})`;
            
            addWrappedText(doc, charText, margin, currentY, contentW);
        });
    }

    // --- 5. Key Locations ---
    if (sceneImages.size > 0) {
        const uniqueScenes = Array.from(sceneImages.values());
        uniqueScenes.forEach(sceneGroup => {
            const establishingShot = sceneGroup['wide'] || Object.values(sceneGroup)[0];
            if (!establishingShot) return;
            
            addPageWithDefaults(`Key Location: ${establishingShot.name}`);
            const imgDataUrl = `data:${establishingShot.mimeType};base64,${establishingShot.base64}`;
            const imgW = contentW;
            const imgH = imgW * 9 / 16; // 16:9 aspect ratio
            if(currentY + imgH < pageH - margin) {
                doc.addImage(imgDataUrl, 'JPEG', margin, currentY, imgW, imgH);
                currentY += imgH + 0.3;
            }
            
            const panelWithLocation = story?.panels.find(p => p.visuals.setting.location.toLowerCase() === establishingShot.name.toLowerCase());
            if (panelWithLocation) {
                 doc.setFont('helvetica', 'normal');
                 doc.setFontSize(11);
                 addWrappedText(doc, panelWithLocation.visuals.setting.description, margin, currentY, contentW);
            }
        });
    }
    
    // --- 6. Your Comic Unfolds... ---
    if (generatedPanels.length > 0) {
        addPageWithDefaults("Your Comic Unfolds...");
        const getPageSortValue = (pageNumber: string | number): number => {
            if (pageNumber === COVER_PAGE_NUMBER) return -1;
            if (pageNumber === CENTERFOLD_PAGE_NUMBER) return 10.5;
            const num = Number(pageNumber);
            return isNaN(num) ? Infinity : num;
        };
        const sortedPanels = [...generatedPanels].sort((a, b) => getPageSortValue(a.page_number) - getPageSortValue(b.page_number));

        for (const panel of sortedPanels) {
            addPageWithDefaults(`Page ${panel.page_number}, Panel ${panel.panel_number}`);
            const isLandscape = (panel.layout.description.toLowerCase().includes('splash') || panel.layout.description.toLowerCase().includes('wide') || panel.visuals.composition.shot_type.toLowerCase().includes('wide'));
            const aspectRatio = isLandscape ? 16 / 9 : 3 / 4;
            let imgW = contentW;
            let imgH = contentW / aspectRatio;

            if (imgH > (pageH - currentY - margin)) {
                imgH = pageH - currentY - margin;
                imgW = imgH * aspectRatio;
            }
            const imgX = (pageW - imgW) / 2;

            doc.addImage(panel.imageUrl, 'JPEG', imgX, currentY, imgW, imgH);
        }
    }
    
    return doc.output('blob');
}