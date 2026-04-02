import { getPlainText } from './dom-utils';

function fallbackCopy(text: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export async function writeHtmlToClipboard(html: string, plainText = getPlainText(html)): Promise<void> {
  if (document.hasFocus() && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([plainText], { type: 'text/plain' });

    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      }),
    ]);
    return;
  }

  fallbackCopy(html || plainText);
}

export async function writeImageToClipboard(blob: Blob): Promise<void> {
  if (!document.hasFocus() || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('当前环境不支持复制图片到剪贴板');
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type || 'image/png']: blob,
    }),
  ]);
}
