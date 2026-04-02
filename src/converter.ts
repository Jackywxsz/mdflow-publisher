import { App, Component, MarkdownRenderer, TFile } from 'obsidian';
import { stripObsidianArtifacts } from './exporters/dom-utils';

/**
 * Markdown Converter
 * Renders Markdown through Obsidian itself so wiki links, embeds and task lists stay intact.
 */
export class MarkdownConverter {
  private renderComponent: Component | null = null;

  constructor(private app: App) {}

  async convertToHtml(markdown: string, sourceFile: TFile): Promise<string> {
    this.dispose();

    const container = document.createElement('div');
    const component = new Component();
    this.renderComponent = component;

    await MarkdownRenderer.render(this.app, markdown, container, sourceFile.path, component);
    return this.normalizeHtml(container.innerHTML);
  }

  dispose(): void {
    this.renderComponent?.unload();
    this.renderComponent = null;
  }

  private normalizeHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    stripObsidianArtifacts(doc);
    return doc.body.innerHTML;
  }
}
