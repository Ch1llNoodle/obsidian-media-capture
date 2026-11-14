import { t } from './i18n';
type Artwork = { ratio: number; pixels: Uint8ClampedArray };

// Conservative comparison for resized/recompressed covers of the same show.
export function sameArtwork(left: Artwork, right: Artwork): boolean {
    if (Math.abs(left.ratio / right.ratio - 1) > 0.01 || left.pixels.length !== right.pixels.length || !left.pixels.length) return false;
    let difference = 0, changed = 0;
    for (let index = 0; index < left.pixels.length; index += 4) {
        let pixelDifference = 0;
        for (let channel = 0; channel < 3; channel++) pixelDifference += Math.abs(left.pixels[index + channel]! - right.pixels[index + channel]!);
        difference += pixelDifference;
        if (pixelDifference / 3 > 24) changed++;
    }
    const count = left.pixels.length / 4;
    return difference / (count * 3) <= 6 && changed / count <= 0.05;
}

export async function readArtwork(bytes: ArrayBuffer): Promise<Artwork | null> {
    if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
    const url = URL.createObjectURL(new Blob([bytes]));
    const image = new Image();
    let timer: number | undefined;
    try {
        await new Promise<void>((resolve, reject) => {
            timer = window.setTimeout(() => reject(new Error(t("Image decode timed out"))), 5000);
            image.onload = () => resolve();
            image.onerror = () => reject(new Error(t("Image decode failed")));
            image.src = url;
        });
        if (!image.naturalWidth || !image.naturalHeight) return null;
        const canvas = createEl('canvas');
        canvas.width = canvas.height = 32;
        const context = canvas.getContext('2d');
        if (!context) return null;
        context.fillStyle = '#fff';
        context.fillRect(0, 0, 32, 32);
        context.drawImage(image, 0, 0, 32, 32);
        return { ratio: image.naturalWidth / image.naturalHeight, pixels: context.getImageData(0, 0, 32, 32).data };
    } catch { return null; }
    finally {
        window.clearTimeout(timer);
        image.onload = image.onerror = null;
        URL.revokeObjectURL(url);
    }
}
