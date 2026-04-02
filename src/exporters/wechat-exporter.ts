import { ImageResolver } from '../images/image-resolver';
import { ThemeManager } from '../themes/theme-manager';
import { writeHtmlToClipboard } from './clipboard';
import {
  getPlainText,
  parseHtml,
  stripObsidianArtifacts,
  transformTaskLists,
  unwrapListParagraphs,
} from './dom-utils';
import {
  ExportResult,
  PlatformExporter,
  PlatformRenderContext,
  PreparedPlatformContent,
} from './types';

/**
 * WeChat Public Account Exporter
 * Produces inline-styled HTML that survives direct paste into the WeChat editor.
 */
export class WeChatExporter implements PlatformExporter {
  readonly id = 'wechat';
  readonly name = '微信公众号';
  readonly icon = '📱';

  constructor(
    private themeManager: ThemeManager,
    private imageResolver: ImageResolver
  ) {}

  async prepare(renderedHtml: string, context: PlatformRenderContext): Promise<PreparedPlatformContent> {
    const htmlWithImages = await this.imageResolver.resolveImagesToBase64(renderedHtml, context.sourceFile);
    const doc = parseHtml(htmlWithImages);

    stripObsidianArtifacts(doc);
    transformTaskLists(doc);
    unwrapListParagraphs(doc);

    const styledHtml = this.themeManager.applyInlineStyles(doc.body.innerHTML);

    return {
      previewHtml: styledHtml,
      exportHtml: styledHtml,
      plainText: getPlainText(doc.body.innerHTML),
    };
  }

  async export(content: PreparedPlatformContent): Promise<ExportResult> {
    try {
      const sourceHtml = content.exportHtml || content.previewHtml;
      const doc = parseHtml(sourceHtml);

      this.convertGridToTable(doc);
      this.processImages(doc);
      this.applyBackgroundWrapper(doc);
      this.rebuildCodeBlocks(doc);
      this.fixBlockquotes(doc);
      this.cleanupAttributes(doc);

      const html = doc.body.innerHTML;
      await writeHtmlToClipboard(html, content.plainText || getPlainText(html));

      return { success: true, message: '已复制到剪贴板，可直接粘贴到微信公众号编辑器' };
    } catch (error) {
      console.error('WeChat export failed:', error);
      return { success: false, message: `复制失败: ${error}` };
    }
  }

  private convertGridToTable(doc: Document): void {
    const grids = doc.querySelectorAll('.image-grid');
    grids.forEach((grid) => {
      const images = grid.querySelectorAll('img');
      if (images.length === 0) return;

      const table = doc.createElement('table');
      table.setAttribute('style', 'width: 100%; border-collapse: collapse; margin: 20px 0;');

      const row = doc.createElement('tr');
      images.forEach((img) => {
        const td = doc.createElement('td');
        td.setAttribute('style', 'padding: 4px; border: none;');
        td.appendChild(img.cloneNode(true));
        row.appendChild(td);
      });
      table.appendChild(row);

      grid.parentNode?.replaceChild(table, grid);
    });
  }

  private processImages(doc: Document): void {
    doc.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';

      if (src.startsWith('data:image/gif') || src.toLowerCase().includes('.gif')) {
        const placeholder = doc.createElement('p');
        placeholder.setAttribute(
          'style',
          [
            'background-color: #fff7ed',
            'border: 1px solid #fdba74',
            'border-radius: 8px',
            'padding: 12px 16px',
            'color: #9a3412',
            'font-size: 14px',
            'text-align: center',
            'margin: 16px 0',
            'line-height: 1.6',
          ].join('; ')
        );
        placeholder.textContent = '此处为 GIF 动图，公众号请手动重新上传。';
        img.parentNode?.replaceChild(placeholder, img);
      }
    });
  }

  private applyBackgroundWrapper(doc: Document): void {
    const theme = this.themeManager.getCurrentTheme();
    const containerBg = this.themeManager.extractBackgroundColor(theme.styles.container);

    if (!containerBg || containerBg === '#fff' || containerBg === '#ffffff') {
      return;
    }

    const section = doc.createElement('section');
    const containerStyle = theme.styles.container;
    const paddingMatch = containerStyle.match(/padding:\s*([^;]+)/);
    const maxWidthMatch = containerStyle.match(/max-width:\s*([^;]+)/);
    const padding = paddingMatch ? paddingMatch[1].trim() : '32px 24px';
    const maxWidth = maxWidthMatch ? maxWidthMatch[1].trim() : '100%';

    section.setAttribute(
      'style',
      [
        `background-color: ${containerBg}`,
        `padding: ${padding}`,
        `max-width: ${maxWidth}`,
        'margin: 0 auto',
        'box-sizing: border-box',
      ].join('; ')
    );

    while (doc.body.firstChild) {
      section.appendChild(doc.body.firstChild);
    }

    doc.body.appendChild(section);
  }

  private rebuildCodeBlocks(doc: Document): void {
    doc.querySelectorAll('pre').forEach((block) => {
      const codeElement = block.querySelector('code');
      const codeText = codeElement?.textContent || block.textContent || '';
      if (!codeText.trim()) return;

      const pre = doc.createElement('pre');
      const code = doc.createElement('code');

      pre.setAttribute(
        'style',
        [
          'background: linear-gradient(to bottom, #2a2c33 0%, #383a42 8px, #383a42 100%)',
          'padding: 0',
          'border-radius: 8px',
          'overflow: hidden',
          'margin: 24px 0',
          'box-shadow: 0 2px 8px rgba(0,0,0,0.15)',
        ].join('; ')
      );

      code.setAttribute(
        'style',
        [
          'color: #abb2bf',
          'font-family: "SF Mono", Consolas, Monaco, "Courier New", monospace',
          'font-size: 14px',
          'line-height: 1.7',
          'display: block',
          'white-space: pre-wrap',
          'padding: 18px 20px',
          '-webkit-font-smoothing: antialiased',
        ].join('; ')
      );

      code.textContent = codeText;
      pre.appendChild(code);
      block.parentNode?.replaceChild(pre, block);
    });
  }

  private fixBlockquotes(doc: Document): void {
    doc.querySelectorAll('blockquote').forEach((blockquote) => {
      const currentStyle = blockquote.getAttribute('style') || '';
      const newStyle = currentStyle
        .replace(/background(?:-color)?:\s*[^;]+;?/gi, '')
        .replace(/color:\s*[^;]+;?/gi, '')
        .trim();

      blockquote.setAttribute(
        'style',
        [newStyle, 'background: rgba(15, 23, 42, 0.05)', 'color: rgba(15, 23, 42, 0.78)']
          .filter(Boolean)
          .join('; ')
      );
    });
  }

  private cleanupAttributes(doc: Document): void {
    doc.querySelectorAll('*').forEach((element) => {
      Array.from(element.attributes).forEach((attr) => {
        const keep =
          attr.name === 'style' ||
          attr.name === 'href' ||
          attr.name === 'src' ||
          attr.name === 'alt' ||
          attr.name === 'colspan' ||
          attr.name === 'rowspan';

        if (!keep || attr.name.startsWith('data-') || attr.name.startsWith('aria-')) {
          element.removeAttribute(attr.name);
        }
      });
    });
  }
}
