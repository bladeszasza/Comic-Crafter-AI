import type { StoryOutline, GeneratedPanel, GeneratedCharacter, CharacterProfile, StoryDevelopmentPackage, CharacterConcept, CharacterImage } from '../types.js';

declare const JSZip: any;

function getBase64FromDataUrl(dataUrl: string): string | null {
    if (!dataUrl || !dataUrl.includes(',')) return null;
    return dataUrl.split(',')[1];
}

export async function zipAndDownloadProgress(
    fileName: string,
    data: {
        characterProfile: CharacterProfile | null,
        storyDevelopmentPackage: StoryDevelopmentPackage | null,
        story: StoryOutline | null,
        characterConcepts: CharacterConcept[],
        characterRoster: GeneratedCharacter[],
        sceneImages: Map<string, Record<string, CharacterImage>>,
        generatedPanels: GeneratedPanel[]
    }
) {
    if (typeof JSZip === 'undefined') {
        alert('Could not create zip file. JSZip library is missing.');
        console.error('JSZip not found. Make sure it is included in your HTML file.');
        return;
    }
    
    const zip = new JSZip();

    const metadata = {
        characterProfile: data.characterProfile,
        storyDevelopmentPackage: data.storyDevelopmentPackage,
        story: data.story,
        characterConcepts: data.characterConcepts,
    };
    zip.file("comic_metadata.json", JSON.stringify(metadata, null, 2));

    // Add character portraits
    for (const character of data.characterRoster) {
        for (const [shotKey, imageUrl] of Object.entries(character.imageUrls)) {
            const base64 = getBase64FromDataUrl(imageUrl);
            if (base64) {
                zip.file(`portraits/${character.name.replace(/\s+/g, '_')}/${shotKey}.jpg`, base64, { base64: true });
            }
        }
    }
    
    // Add scene images
    for (const [locationKey, sceneGroup] of data.sceneImages.entries()) {
        for (const [perspectiveKey, image] of Object.entries(sceneGroup)) {
             zip.file(`scenes/${locationKey.replace(/\s+/g, '_')}/${perspectiveKey}.jpg`, image.base64, { base64: true });
        }
    }

    // Add generated panels
    for (const panel of data.generatedPanels) {
        const base64 = getBase64FromDataUrl(panel.imageUrl);
        if (base64) {
            const pageId = String(panel.page_number).replace('-', '_');
            zip.file(`panels/page_${pageId}_panel_${panel.panel_number}.jpg`, base64, { base64: true });
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