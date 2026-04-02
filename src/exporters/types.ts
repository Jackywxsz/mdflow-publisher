import { App, TFile } from 'obsidian';

export type PlatformId = 'wechat' | 'x' | 'rednote';

export interface ExportResult {
  success: boolean;
  message: string;
}

export interface PlatformRenderContext {
  app: App;
  sourceFile: TFile;
  title: string;
}

export interface PreparedPlatformContent<TData = unknown> {
  previewHtml: string;
  exportHtml?: string;
  plainText?: string;
  data?: TData;
}

export interface PlatformExporter<TData = unknown> {
  readonly id: PlatformId;
  readonly name: string;
  readonly icon: string;
  prepare(renderedHtml: string, context: PlatformRenderContext): Promise<PreparedPlatformContent<TData>>;
  mountPreview?(
    container: HTMLElement,
    content: PreparedPlatformContent<TData>,
    context: PlatformRenderContext
  ): Promise<void> | void;
  export(content: PreparedPlatformContent<TData>, context: PlatformRenderContext): Promise<ExportResult>;
}
