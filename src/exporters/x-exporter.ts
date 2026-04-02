import { writeHtmlToClipboard } from './clipboard';
import {
  getPlainText,
  parseHtml,
  replaceTag,
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
import { ImageResolver } from '../images/image-resolver';

interface SanitizeOptions {
  preserveCodeBlocks: boolean;
  keepImages: boolean;
}

/**
 * X Articles Exporter
 * Keeps preview expressive, but exports a stripped semantic HTML payload for direct paste.
 */
export class XArticlesExporter implements PlatformExporter {
  readonly id = 'x';
  readonly name = 'X Articles';
  readonly icon = '𝕏';

  async prepare(renderedHtml: string, context: PlatformRenderContext): Promise<PreparedPlatformContent> {
    // Resolve images to base64 before sanitizing
    const resolver = new ImageResolver(context.app);
    const resolvedHtml = await resolver.resolveImagesToBase64(renderedHtml, context.sourceFile);

    const previewDoc = this.createSanitizedDocument(resolvedHtml, { preserveCodeBlocks: true, keepImages: true });
    const exportDoc = this.createSanitizedDocument(resolvedHtml, { preserveCodeBlocks: false, keepImages: false });

    this.applyPreviewStyles(previewDoc);

    const previewHtml = previewDoc.body.innerHTML;
    const exportHtml = exportDoc.body.innerHTML;

    return {
      previewHtml,
      exportHtml,
      plainText: getPlainText(exportHtml),
    };
  }

  async export(content: PreparedPlatformContent): Promise<ExportResult> {
    try {
      const html = content.exportHtml || content.previewHtml;
      await writeHtmlToClipboard(html, content.plainText || getPlainText(html));
      return { success: true, message: '已复制 X Articles 格式，可直接粘贴' };
    } catch (error) {
      console.error('X Articles export failed:', error);
      return { success: false, message: `复制失败: ${error}` };
    }
  }

  private createSanitizedDocument(renderedHtml: string, options: SanitizeOptions): Document {
    const doc = parseHtml(renderedHtml);

    stripObsidianArtifacts(doc);
    transformTaskLists(doc);
    unwrapListParagraphs(doc);
    this.normalizeHeadings(doc);
    this.convertTables(doc, options.preserveCodeBlocks);
    if (!options.keepImages) {
      this.convertImages(doc);
    }
    this.convertHorizontalRules(doc);

    if (!options.preserveCodeBlocks) {
      this.convertCodeBlocksToBlockquotes(doc);
    }

    this.cleanupNodes(doc, options.preserveCodeBlocks);
    this.removeEmptyBlocks(doc);

    return doc;
  }

  private normalizeHeadings(doc: Document): void {
    const h1s = Array.from(doc.querySelectorAll('h1'));
    h1s.slice(1).forEach((heading) => replaceTag(heading, 'h2'));
    doc.querySelectorAll('h4, h5, h6').forEach((heading) => replaceTag(heading, 'h3'));
  }

  private convertTables(doc: Document, preserveCodeBlocks: boolean): void {
    doc.querySelectorAll('table').forEach((table) => {
      const rows = Array.from(table.querySelectorAll('tr'));
      const text = rows
        .map((row) => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          return `| ${cells.map((cell) => (cell.textContent || '').trim()).join(' | ')} |`;
        })
        .join('\n');

      const replacement = preserveCodeBlocks ? doc.createElement('pre') : doc.createElement('blockquote');
      replacement.textContent = text;
      table.parentNode?.replaceChild(replacement, table);
    });
  }

  private convertImages(doc: Document): void {
    doc.querySelectorAll('img').forEach((img) => {
      const alt = img.getAttribute('alt') || '图片';
      const paragraph = doc.createElement('p');
      paragraph.textContent = `【图片】${alt}`;

      const parent = img.parentElement;
      if (parent?.tagName.toLowerCase() === 'p' && parent.childElementCount === 1) {
        parent.parentNode?.replaceChild(paragraph, parent);
      } else {
        img.parentNode?.replaceChild(paragraph, img);
      }
    });
  }

  private convertHorizontalRules(doc: Document): void {
    doc.querySelectorAll('hr').forEach((hr) => {
      const paragraph = doc.createElement('p');
      paragraph.textContent = '———';
      hr.parentNode?.replaceChild(paragraph, hr);
    });
  }

  private convertCodeBlocksToBlockquotes(doc: Document): void {
    doc.querySelectorAll('pre').forEach((block) => {
      const codeText = block.textContent || '';
      const replacement = doc.createElement('blockquote');
      const lines = codeText.split('\n');

      lines.forEach((line, index) => {
        if (index > 0) {
          replacement.appendChild(doc.createElement('br'));
        }
        replacement.appendChild(doc.createTextNode(line || '\u00A0'));
      });

      block.parentNode?.replaceChild(replacement, block);
    });
  }

  private cleanupNodes(doc: Document, preserveCodeBlocks: boolean): void {
    const allowedTags = new Set([
      'article',
      'h1',
      'h2',
      'h3',
      'p',
      'strong',
      'em',
      'del',
      'a',
      'ul',
      'ol',
      'li',
      'blockquote',
      'br',
      'b',
      'i',
      's',
      'img',
      ...(preserveCodeBlocks ? ['pre', 'code'] : []),
    ]);

    const walk = (node: Node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      Array.from(node.childNodes).forEach(walk);

      const element = node as HTMLElement;
      const tag = element.tagName.toLowerCase();

      const href = tag === 'a' ? element.getAttribute('href') : null;
      const imgSrc = tag === 'img' ? element.getAttribute('src') : null;
      const imgAlt = tag === 'img' ? element.getAttribute('alt') : null;
      const textContent = element.textContent || '';

      Array.from(element.attributes).forEach((attr) => {
        if (tag === 'a' && attr.name === 'href' && href) return;
        if (tag === 'img' && (attr.name === 'src' || attr.name === 'alt')) return;
        element.removeAttribute(attr.name);
      });

      if (tag === 'a' && href) {
        element.setAttribute('href', href);
      }

      if (tag === 'code' && !preserveCodeBlocks) {
        const textNode = doc.createTextNode(textContent);
        element.parentNode?.replaceChild(textNode, element);
        return;
      }

      if (!allowedTags.has(tag) && tag !== 'body') {
        const fragment = doc.createDocumentFragment();
        while (element.firstChild) {
          fragment.appendChild(element.firstChild);
        }
        element.parentNode?.replaceChild(fragment, element);
      }
    };

    walk(doc.body);
  }

  private removeEmptyBlocks(doc: Document): void {
    doc.querySelectorAll('blockquote, p, pre').forEach((element) => {
      if (!element.textContent?.trim() && !element.querySelector('br')) {
        element.remove();
      }
    });
  }

  private applyPreviewStyles(doc: Document): void {
    const article = doc.createElement('article');
    article.setAttribute(
      'style',
      [
        'max-width: 700px',
        'margin: 0 auto',
        'padding: 24px 8px 40px',
        'font-family: Georgia, "Times New Roman", "Noto Serif SC", serif',
        'font-size: 18px',
        'line-height: 1.8',
        'color: #0f172a',
      ].join('; ')
    );

    while (doc.body.firstChild) {
      article.appendChild(doc.body.firstChild);
    }

    doc.body.appendChild(article);

    article.querySelectorAll('h1').forEach((heading) => {
      heading.setAttribute(
        'style',
        'font-size: 2.2em; line-height: 1.2; margin: 0 0 20px; font-weight: 800; letter-spacing: -0.03em;'
      );
    });

    article.querySelectorAll('h2').forEach((heading) => {
      heading.setAttribute(
        'style',
        'font-size: 1.5em; line-height: 1.35; margin: 36px 0 14px; font-weight: 750;'
      );
    });

    article.querySelectorAll('h3').forEach((heading) => {
      heading.setAttribute(
        'style',
        'font-size: 1.2em; line-height: 1.4; margin: 28px 0 12px; font-weight: 700; color: #1d4ed8;'
      );
    });

    article.querySelectorAll('p').forEach((paragraph, index) => {
      const base = 'margin: 16px 0;';
      if (index === 0) {
        paragraph.setAttribute(
          'style',
          `${base} font-size: 1.08em; color: #334155;`
        );
      } else {
        paragraph.setAttribute('style', base);
      }
    });

    article.querySelectorAll('ul, ol').forEach((list) => {
      list.setAttribute('style', 'margin: 18px 0; padding-left: 1.4em;');
    });

    article.querySelectorAll('li').forEach((item) => {
      item.setAttribute('style', 'margin: 10px 0;');
    });

    article.querySelectorAll('blockquote').forEach((blockquote) => {
      blockquote.setAttribute(
        'style',
        [
          'margin: 22px 0',
          'padding: 12px 18px',
          'border-left: 4px solid #94a3b8',
          'color: #475569',
          'background: #f8fafc',
          'border-radius: 0 10px 10px 0',
        ].join('; ')
      );
    });

    article.querySelectorAll('pre').forEach((block) => {
      block.setAttribute(
        'style',
        [
          'margin: 22px 0',
          'padding: 16px 18px',
          'background: #0f172a',
          'color: #e2e8f0',
          'border-radius: 12px',
          'overflow-x: auto',
          'font-size: 14px',
          'line-height: 1.7',
        ].join('; ')
      );
    });

    article.querySelectorAll('code').forEach((code) => {
      if (code.parentElement?.tagName.toLowerCase() === 'pre') return;
      code.setAttribute(
        'style',
        'font-family: "SF Mono", Consolas, monospace; font-size: 0.9em; background: #f1f5f9; border-radius: 6px; padding: 2px 6px;'
      );
    });

    article.querySelectorAll('a').forEach((anchor) => {
      anchor.setAttribute('style', 'color: #2563eb; text-decoration: none; border-bottom: 1px solid #93c5fd;');
    });

    article.querySelectorAll('img').forEach((img) => {
      img.setAttribute(
        'style',
        'max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; display: block;'
      );
    });
  }
}
