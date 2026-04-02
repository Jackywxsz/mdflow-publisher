export function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

export function getPlainText(html: string): string {
  return parseHtml(html).body.textContent?.trim() || '';
}

export function replaceTag(element: Element, tagName: string): HTMLElement {
  const doc = element.ownerDocument;
  const replacement = doc.createElement(tagName);

  Array.from(element.attributes).forEach((attr) => {
    replacement.setAttribute(attr.name, attr.value);
  });

  while (element.firstChild) {
    replacement.appendChild(element.firstChild);
  }

  element.parentNode?.replaceChild(replacement, element);
  return replacement;
}

export function unwrapElement(element: Element): void {
  const parent = element.parentNode;
  if (!parent) return;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
}

export function stripObsidianArtifacts(root: ParentNode): void {
  root.querySelectorAll('script, style, button, .markdown-embed-link, .external-link-icon, .internal-query').forEach((node) => {
    node.remove();
  });

  root.querySelectorAll('.internal-embed, .markdown-embed-content').forEach((node) => {
    if (node.childElementCount === 1) {
      unwrapElement(node);
    }
  });
}

export function transformTaskLists(root: ParentNode): void {
  root.querySelectorAll('li.task-list-item').forEach((item) => {
    const checkbox = item.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    if (!checkbox) return;

    const marker = item.ownerDocument.createTextNode(checkbox.checked ? '☑ ' : '☐ ');
    item.insertBefore(marker, checkbox);
    checkbox.remove();
  });
}

export function unwrapListParagraphs(root: ParentNode): void {
  root.querySelectorAll('li').forEach((item) => {
    const paragraphs = Array.from(item.querySelectorAll(':scope > p'));
    if (paragraphs.length === 0) return;

    paragraphs.forEach((paragraph, index) => {
      if (index > 0) {
        item.insertBefore(item.ownerDocument.createElement('br'), paragraph);
      }

      while (paragraph.firstChild) {
        item.insertBefore(paragraph.firstChild, paragraph);
      }

      paragraph.remove();
    });
  });
}

export function stripAttributes(
  root: ParentNode,
  allowed: Record<string, Set<string>> = {}
): void {
  root.querySelectorAll('*').forEach((element) => {
    const tag = element.tagName.toLowerCase();
    const allowedAttrs = allowed[tag] || new Set<string>();

    Array.from(element.attributes).forEach((attr) => {
      const isDataAttr = attr.name.startsWith('data-');
      const isAriaAttr = attr.name.startsWith('aria-');
      const isAllowed = allowedAttrs.has(attr.name);

      if (!isAllowed || isDataAttr || isAriaAttr) {
        element.removeAttribute(attr.name);
      }
    });
  });
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'mdflow-export';
}
