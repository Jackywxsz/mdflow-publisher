import { Theme, ThemeId } from './theme-types';
import { PRESET_THEMES } from './presets/index';

export class ThemeManager {
  private themes: Map<string, Theme>;
  private currentThemeId: ThemeId;

  constructor() {
    this.themes = new Map(Object.entries(PRESET_THEMES));
    this.currentThemeId = 'wechat-default';
  }

  getThemeIds(): ThemeId[] {
    return Array.from(this.themes.keys());
  }

  getTheme(id: ThemeId): Theme | undefined {
    return this.themes.get(id);
  }

  getCurrentTheme(): Theme {
    return this.themes.get(this.currentThemeId) || PRESET_THEMES['wechat-default'];
  }

  getCurrentThemeId(): ThemeId {
    return this.currentThemeId;
  }

  setCurrentTheme(id: ThemeId): void {
    if (this.themes.has(id)) {
      this.currentThemeId = id;
    }
  }

  /**
   * Apply the current theme's inline styles to an HTML document.
   * Mirrors MD_flow's applyInlineStyles() function.
   */
  applyInlineStyles(html: string): string {
    const theme = this.getCurrentTheme();
    const style = theme.styles;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const headingInlineOverrides: Record<string, string> = {
      strong: 'font-weight: 700; color: inherit !important; background-color: transparent !important;',
      em: 'font-style: italic; color: inherit !important; background-color: transparent !important;',
      a: 'color: inherit !important; text-decoration: none !important; border-bottom: 1px solid currentColor !important; background-color: transparent !important;',
      code: 'color: inherit !important; background-color: transparent !important; border: none !important; padding: 0 !important;',
      span: 'color: inherit !important; background-color: transparent !important;',
      b: 'font-weight: 700; color: inherit !important; background-color: transparent !important;',
      i: 'font-style: italic; color: inherit !important; background-color: transparent !important;',
      del: 'color: inherit !important; background-color: transparent !important;',
      mark: 'color: inherit !important; background-color: transparent !important;',
      s: 'color: inherit !important; background-color: transparent !important;',
      u: 'color: inherit !important; text-decoration: underline !important; background-color: transparent !important;',
    };

    const headingInlineSelectorList = Object.keys(headingInlineOverrides).join(', ');

    // Apply each theme style rule to matching elements
    Object.keys(style).forEach(selector => {
      if (selector === 'pre' || selector === 'code' || selector === 'pre code') {
        return;
      }

      const styleValue = style[selector];
      if (!styleValue) return;

      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => {
        const currentStyle = el.getAttribute('style') || '';
        el.setAttribute('style', currentStyle + '; ' + styleValue);
      });
    });

    // Override inline elements inside headings to inherit color
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      const inlineNodes = heading.querySelectorAll(headingInlineSelectorList);
      inlineNodes.forEach(node => {
        const tag = node.tagName.toLowerCase();
        const override = headingInlineOverrides[tag];
        if (!override) return;

        const currentStyle = node.getAttribute('style') || '';
        const sanitizedStyle = currentStyle
          .replace(/color:\s*[^;]+;?/gi, '')
          .replace(/background(?:-color)?:\s*[^;]+;?/gi, '')
          .replace(/border(?:-bottom)?:\s*[^;]+;?/gi, '')
          .replace(/text-decoration:\s*[^;]+;?/gi, '')
          .replace(/;\s*;/g, ';')
          .trim();
        node.setAttribute('style', sanitizedStyle + '; ' + override);
      });
    });

    // Wrap everything in a container with the theme's container style
    const container = doc.createElement('div');
    container.setAttribute('style', style.container);
    container.innerHTML = doc.body.innerHTML;

    return container.outerHTML;
  }

  /**
   * Extract the background color from a container style string.
   */
  extractBackgroundColor(containerStyle: string): string | null {
    const match = containerStyle.match(/background(?:-color)?:\s*(#[a-fA-F0-9]{3,8}|rgb[a]?\([^)]+\)|[a-z]+)/);
    return match ? match[1] : null;
  }
}
