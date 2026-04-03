import { App, TFile, requestUrl } from 'obsidian';

/**
 * Resolves Obsidian internal image references to absolute paths or base64 data URLs.
 */
export class ImageResolver {
  constructor(private app: App) {}

  /**
   * Convert all Obsidian internal image links in HTML to base64 data URIs.
   * Also handles external images by fetching them.
   */
  async resolveImagesToBase64(
    html: string,
    sourceFile: TFile
  ): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img');

    for (const img of Array.from(images)) {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) continue;

      try {
        const base64 = await this.resolveImageSrc(src, sourceFile);
        if (base64) {
          img.setAttribute('src', base64);
        }
      } catch (e) {
        console.warn('MDFlow: Failed to resolve image', src, e);
      }
    }

    return doc.body.innerHTML;
  }

  /**
   * Resolve a single image src to a base64 data URI.
   */
  async resolveImageSrc(src: string, sourceFile: TFile): Promise<string | null> {
    // Handle Obsidian internal links (app://local/... or relative paths)
    if (src.startsWith('app://')) {
      return this.fetchImageAsBase64(src);
    }

    // Handle relative path - try to find file in vault
    if (!src.startsWith('http') && !src.startsWith('data:')) {
      const file = this.app.metadataCache.getFirstLinkpathDest(
        decodeURIComponent(src),
        sourceFile.path
      );
      if (file instanceof TFile) {
        return this.readVaultFileAsBase64(file);
      }
    }

    // Handle external http/https images
    if (src.startsWith('http')) {
      return this.fetchImageAsBase64(this.normalizeExternalImageUrl(src));
    }

    return null;
  }

  /**
   * Read a vault file and convert it to a base64 data URI.
   */
  async readVaultFileAsBase64(file: TFile): Promise<string> {
    const arrayBuffer = await this.app.vault.readBinary(file);
    const mimeType = this.getMimeType(file.extension);
    const base64 = this.arrayBufferToBase64(arrayBuffer);
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Fetch an image from a URL and convert to base64.
   * Compresses large images using Canvas (max 1920px, quality 0.85).
   */
  async fetchImageAsBase64(url: string): Promise<string> {
    const blob = this.isExternalUrl(url)
      ? await this.fetchExternalImageBlob(url)
      : await this.fetchInternalImageBlob(url);

    return this.blobToDataUrl(blob);
  }

  private async blobToDataUrl(blob: Blob): Promise<string> {
    // Check if it's a GIF (don't compress animated GIFs)
    if (blob.type === 'image/gif') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    return this.compressImage(blob);
  }

  private async fetchExternalImageBlob(url: string): Promise<Blob> {
    const candidates = this.getExternalImageCandidates(url);
    let lastError: unknown = null;

    for (const candidate of candidates) {
      try {
        const response = await requestUrl({
          url: candidate,
          headers: {
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
          throw: true,
        });
        const mimeType = this.pickResponseMimeType(response.headers);
        if (mimeType && !mimeType.startsWith('image/')) {
          throw new Error(`Unexpected content type: ${mimeType}`);
        }
        return new Blob([response.arrayBuffer], { type: mimeType || 'image/png' });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('External image request failed');
  }

  private async fetchInternalImageBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    return response.blob();
  }

  private pickResponseMimeType(headers: Record<string, string>): string {
    const contentTypeHeader =
      headers['content-type'] ||
      headers['Content-Type'] ||
      headers['CONTENT-TYPE'] ||
      '';

    const contentType = contentTypeHeader.split(';')[0]?.trim();
    return contentType || 'image/png';
  }

  private getExternalImageCandidates(src: string): string[] {
    const normalized = this.normalizeExternalImageUrl(src);
    const noHash = src.split('#')[0];

    return Array.from(
      new Set([normalized, noHash, src].filter((value) => Boolean(value?.trim())))
    );
  }

  /**
   * Compress an image blob using Canvas, max 1920px, quality 0.85.
   */
  private compressImage(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 1920;
        let { width, height } = img;

        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas context')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private getMimeType(extension: string): string {
    const map: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      avif: 'image/avif',
    };
    return map[extension.toLowerCase()] || 'image/png';
  }

  async isGif(src: string): Promise<boolean> {
    if (src.startsWith('data:image/gif')) return true;
    if (src.toLowerCase().includes('.gif')) return true;
    return false;
  }

  private isExternalUrl(src: string): boolean {
    return src.startsWith('http://') || src.startsWith('https://');
  }

  private normalizeExternalImageUrl(src: string): string {
    try {
      const url = new URL(src);
      url.hash = '';

      if (url.hostname.endsWith('qpic.cn')) {
        url.searchParams.delete('wx_lazy');
        url.searchParams.delete('tp');
      }

      return url.toString();
    } catch (error) {
      return src.split('#')[0];
    }
  }
}
