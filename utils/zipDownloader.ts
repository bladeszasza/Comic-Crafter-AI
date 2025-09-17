import type { StoryOutline, GeneratedPanel, GeneratedCharacter, CharacterProfile, StoryDevelopmentPackage, CharacterConcept, CharacterImage } from '../types.js';
import { createCreativeBookPdf } from './creativeBookGenerator.js';
import { createComicPdf } from './pdfGenerator.js';

declare const JSZip: any;

function getBase64FromDataUrl(dataUrl: string): string | null {
    if (!dataUrl || !dataUrl.includes(',')) return null;
    return dataUrl.split(',')[1];
}

export async function zipAndDownloadProgress(
    fileName: string,
    data: {
        initialImageBase64: string | null,
        characterProfile: CharacterProfile | null,
        storyDevelopmentPackage: StoryDevelopmentPackage | null,
        story: StoryOutline | null,
        characterConcepts: CharacterConcept[],
        characterRoster: GeneratedCharacter[],
        sceneImages: Map<string, Record<string, CharacterImage>>,
        generatedPanels: GeneratedPanel[]
    },
    options: { isErrorState: boolean } = { isErrorState: false }
) {
    if (typeof JSZip === 'undefined') {
        alert('Could not create zip file. JSZip library is missing.');
        console.error('JSZip not found. Make sure it is included in your HTML file.');
        return;
    }
    
    const zip = new JSZip();

    // Process characterRoster to extract images and create metadata with relative paths
    const characterRosterWithPaths = data.characterRoster.map(character => {
        const imageUrls: Record<string, string> = {};
        for (const [shotKey, imageUrl] of Object.entries(character.imageUrls)) {
            const base64 = getBase64FromDataUrl(imageUrl);
            if (base64) {
                const path = `portraits/${character.name.replace(/\s+/g, '_')}/${shotKey}.jpg`;
                zip.file(path, base64, { base64: true });
                imageUrls[shotKey] = path;
            }
        }
        return { ...character, imageUrls };
    });

    // Process sceneImages to extract images and create metadata with relative paths
    const sceneImagesAsArray: [string, Record<string, Omit<CharacterImage, 'base64'> & { path: string }>][] = [];
    for (const [locationKey, sceneGroup] of data.sceneImages.entries()) {
        const newSceneGroup: Record<string, Omit<CharacterImage, 'base64'> & { path: string }> = {};
        for (const [perspectiveKey, image] of Object.entries(sceneGroup)) {
             const path = `scenes/${locationKey.replace(/\s+/g, '_')}/${perspectiveKey}.jpg`;
             zip.file(path, image.base64, { base64: true });
             const { base64, ...rest } = image;
             newSceneGroup[perspectiveKey] = { ...rest, path };
        }
        sceneImagesAsArray.push([locationKey, newSceneGroup]);
    }
    
    // Process generatedPanels to extract images and create metadata with relative paths
    const generatedPanelsWithPaths = data.generatedPanels.map(panel => {
        const base64 = getBase64FromDataUrl(panel.imageUrl);
        const pageId = String(panel.page_number).replace('-', '_');
        const path = `panels/page_${pageId}_panel_${panel.panel_number}.jpg`;
        if (base64) {
            zip.file(path, base64, { base64: true });
        }
        return { ...panel, imageUrl: path };
    });

    const fullState = {
        characterProfile: data.characterProfile,
        storyDevelopmentPackage: data.storyDevelopmentPackage,
        story: data.story,
        characterConcepts: data.characterConcepts,
        characterRoster: characterRosterWithPaths,
        sceneImages: sceneImagesAsArray,
        generatedPanels: generatedPanelsWithPaths
    };
    
    zip.file("save_state.json", JSON.stringify(fullState, null, 2));

    // Generate Creative's Book PDF
    if (data.characterProfile) {
        const creativeBookBlob = await createCreativeBookPdf(
            data.story?.title || 'Comic Concept',
            data.initialImageBase64,
            data.characterProfile,
            data.storyDevelopmentPackage,
            data.story,
            data.characterRoster,
            data.sceneImages,
            data.generatedPanels
        );
        zip.file("The_Creative's_Book.pdf", creativeBookBlob);
    }

    // Generate Comic PDF (if not in error state and there are panels)
    if (!options.isErrorState && data.generatedPanels.length > 0 && data.story) {
        const comicPdfBlob = await createComicPdf(data.generatedPanels, data.story.title, { output: 'blob' });
        if (comicPdfBlob) {
            zip.file(`${fileName.replace(/\s+/g, '_')}_comic.pdf`, comicPdfBlob);
        }
    }

    const content = await zip.generateAsync({ type: "blob" });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${fileName.replace(/\s+/g, '_')}_progress.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}
