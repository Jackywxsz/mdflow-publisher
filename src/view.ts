import { ItemView, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import { MarkdownConverter } from './converter';
import { ThemeManager } from './themes/theme-manager';
import { ImageResolver } from './images/image-resolver';
import { WeChatExporter } from './exporters/wechat-exporter';
import { XArticlesExporter } from './exporters/x-exporter';
import { RedNoteExporter } from './exporters/rednote-exporter';
import {
  PlatformExporter,
  PlatformId,
  PlatformRenderContext,
  PreparedPlatformContent,
} from './exporters/types';
import { RedNoteSettingsManager } from './rednote/settings-manager';
import { RedNoteAboutModal } from './rednote/about-modal';
import { getRedNoteTemplateOptions } from './rednote/template-presets';
import { clampRedNoteFontSize, RedNoteAssetField } from './rednote/types';

export const VIEW_TYPE_MDFLOW = 'mdflow-publisher-view';

export class MDFlowView extends ItemView {
  private converter: MarkdownConverter;
  private themeManager: ThemeManager;
  private imageResolver: ImageResolver;
  private exporters: Map<PlatformId, PlatformExporter>;
  private redNoteExporter: RedNoteExporter;

  private currentPlatform: PlatformId = 'wechat';
  private renderedHtml = '';
  private preparedContent: PreparedPlatformContent | null = null;
  private activeFile: TFile | null = null;

  private themeSelector!: HTMLElement;
  private previewEl!: HTMLElement;
  private exportBtnContainerEl!: HTMLElement;
  private exportBtnEl!: HTMLButtonElement;
  private redNoteControlsEl!: HTMLElement;
  private redNoteBottomBarEl!: HTMLElement;
  private globalBottomBarEl!: HTMLElement;
  private redNoteTemplateSelectEl!: HTMLSelectElement;
  private redNoteFontSelectEl!: HTMLSelectElement;
  private redNoteFontSizeInputEl!: HTMLInputElement;
  private redNoteGuidePopoverEl: HTMLElement | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private redNoteSettings: RedNoteSettingsManager,
    private openSettingsTab: () => void
  ) {
    super(leaf);
    this.converter = new MarkdownConverter(this.app);
    this.themeManager = new ThemeManager();
    this.imageResolver = new ImageResolver(this.app);
    this.redNoteExporter = new RedNoteExporter(this.imageResolver, this.redNoteSettings);

    this.exporters = new Map<PlatformId, PlatformExporter>([
      ['wechat', new WeChatExporter(this.themeManager, this.imageResolver)],
      ['x', new XArticlesExporter()],
      ['rednote', this.redNoteExporter],
    ]);
  }

  getViewType(): string {
    return VIEW_TYPE_MDFLOW;
  }

  getDisplayText(): string {
    return 'MDFlow Publisher';
  }

  getIcon(): string {
    return 'share-2';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('mdflow-view');

    this.renderUI(container);
    this.registerEvents();
    this.syncRedNoteControls();
    await this.updatePreview();
  }

  private renderUI(container: Element): void {
    const toolbar = container.createDiv({ cls: 'mdflow-toolbar' });

    const tabs = toolbar.createDiv({ cls: 'mdflow-tabs' });
    this.createTab(tabs, 'wechat', '📱 微信公众号');
    this.createTab(tabs, 'x', '𝕏 X Articles');
    this.createTab(tabs, 'rednote', '📕 小红书');

    this.themeSelector = toolbar.createDiv({ cls: 'mdflow-theme-selector' });
    this.themeSelector.createSpan({ text: '主题: ' });
    const themeSelect = this.themeSelector.createEl('select', { cls: 'mdflow-theme-select' });

    this.themeManager.getThemeIds().forEach((id) => {
      const theme = this.themeManager.getTheme(id);
      if (!theme) return;

      const option = themeSelect.createEl('option', { value: id, text: theme.name });
      if (id === this.themeManager.getCurrentThemeId()) {
        option.selected = true;
      }
    });

    themeSelect.addEventListener('change', async () => {
      this.themeManager.setCurrentTheme(themeSelect.value);
      await this.refreshPreview();
    });

    this.redNoteControlsEl = toolbar.createDiv({ cls: 'mdflow-rednote-controls' });
    this.renderRedNoteControls(this.redNoteControlsEl);

    const previewContainer = container.createDiv({ cls: 'mdflow-preview-container' });
    this.previewEl = previewContainer.createDiv({ cls: 'mdflow-preview' }) as HTMLElement;
    this.previewEl.setAttribute('data-platform', this.currentPlatform);

    this.exportBtnContainerEl = container.createDiv({ cls: 'mdflow-export-btn' }) as HTMLElement;
    this.exportBtnEl = this.exportBtnContainerEl.createEl('button', {
      text: '复制到剪贴板',
      cls: 'mod-cta',
    });
    this.exportBtnEl.addEventListener('click', () => this.handleExport());

    this.redNoteBottomBarEl = container.createDiv({ cls: 'mdflow-rednote-bottom-bar' }) as HTMLElement;
    this.renderRedNoteBottomBar(this.redNoteBottomBarEl);

    this.globalBottomBarEl = container.createDiv({ cls: 'mdflow-global-bottom-bar' }) as HTMLElement;
    this.renderGlobalBottomBar(this.globalBottomBarEl);

    this.updateToolbarForPlatform();
  }

  private renderRedNoteControls(container: HTMLElement): void {
    container.empty();

    const controlsRow = container.createDiv({ cls: 'mdflow-rednote-controls-row' });

    this.redNoteTemplateSelectEl = this.createControlSelect(
      controlsRow,
      '模板',
      getRedNoteTemplateOptions(),
      async (value) => {
        await this.redNoteSettings.update({ templateId: value });
      }
    );

    this.redNoteFontSelectEl = this.createControlSelect(
      controlsRow,
      '字体',
      this.redNoteSettings.getFontOptions().map((font) => ({
        label: font.label,
        value: font.value,
      })),
      async (value) => {
        await this.redNoteSettings.update({ fontFamily: value });
      }
    );

    this.redNoteFontSizeInputEl = this.createControlNumber(controlsRow, '字号', async (value) => {
      await this.redNoteSettings.update({
        fontSize: clampRedNoteFontSize(Number.parseInt(value, 10)),
      });
    });

    const actionsRow = container.createDiv({ cls: 'mdflow-rednote-actions-row' });
    this.createCompactAction(actionsRow, '上传头像', async () => {
      await this.handleRedNoteImageUpload('userAvatar');
    });
    this.createCompactAction(actionsRow, '上传封面', async () => {
      await this.handleRedNoteImageUpload('coverImage');
    });
    this.createCompactAction(actionsRow, '更多设置', () => {
      this.openSettingsTab();
    });
  }

  private renderRedNoteBottomBar(container: HTMLElement): void {
    container.empty();

    const rightGroup = container.createDiv({ cls: 'mdflow-rn-bar-right' });

    const downloadBtn = rightGroup.createEl('button', {
      cls: 'mdflow-rn-bar-primary-btn',
      type: 'button',
      text: '下载当前页',
    });
    downloadBtn.addEventListener('click', () => this.handleDownloadCurrentPage());

    const exportAllBtn = rightGroup.createEl('button', {
      cls: 'mdflow-rn-bar-primary-btn',
      type: 'button',
      text: '导出全部页',
    });
    exportAllBtn.addEventListener('click', () => this.handleExport());
  }

  private renderGlobalBottomBar(container: HTMLElement): void {
    container.empty();

    const leftGroup = container.createDiv({ cls: 'mdflow-rn-bar-left' });

    const guideBtn = leftGroup.createEl('button', {
      cls: 'mdflow-rn-bar-icon-btn',
      type: 'button',
    });
    guideBtn.setAttribute('aria-label', '使用指南');
    guideBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    guideBtn.addEventListener('click', (e) => this.toggleUsageGuide(e));

    const aboutBtn = leftGroup.createEl('button', {
      cls: 'mdflow-rn-bar-about-btn',
      type: 'button',
    });
    aboutBtn.innerHTML = '❤️ 关于作者';
    aboutBtn.addEventListener('click', () => {
      new RedNoteAboutModal(this.app).open();
    });
  }

  private toggleUsageGuide(e: MouseEvent): void {
    if (this.redNoteGuidePopoverEl) {
      this.redNoteGuidePopoverEl.remove();
      this.redNoteGuidePopoverEl = null;
      return;
    }

    const popover = document.createElement('div');
    popover.className = 'mdflow-rn-guide-popover';
    popover.innerHTML = `
      <div class="mdflow-rn-guide-title">使用指南</div>
      <div class="mdflow-rn-guide-content">
        <div class="mdflow-rn-guide-item">1. <b>核心用法</b>：用二级标题(##)来分割内容，每个标题生成一张小红书配图</div>
        <div class="mdflow-rn-guide-item">2. <b>内容分页</b>：在二级标题(##)下使用 --- 可将内容分割为多页，每页都会带上标题</div>
        <div class="mdflow-rn-guide-item">3. <b>首图制作</b>：单独调整首节字号至 20-24px，使用【下载当前页】导出</div>
        <div class="mdflow-rn-guide-item">4. <b>长文优化</b>：内容较多的章节可调小字号至 14-16px 后单独导出</div>
        <div class="mdflow-rn-guide-item">5. <b>批量操作</b>：保持统一字号时，用【导出全部页】批量生成</div>
        <div class="mdflow-rn-guide-item">6. <b>模板切换</b>：顶部选择器可切换不同视觉风格</div>
        <div class="mdflow-rn-guide-item">7. <b>支持创作</b>：点击 ❤️ 关于作者可进行打赏支持</div>
      </div>
    `;

    const bar = this.globalBottomBarEl;
    const barRect = bar.getBoundingClientRect();
    popover.style.position = 'fixed';
    popover.style.bottom = `${window.innerHeight - barRect.top + 8}px`;
    popover.style.left = `${barRect.left + 12}px`;
    popover.style.width = `${barRect.width - 24}px`;
    document.body.appendChild(popover);
    this.redNoteGuidePopoverEl = popover;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!popover.contains(event.target as Node) && event.target !== (e.target as Node)) {
        popover.remove();
        this.redNoteGuidePopoverEl = null;
        document.removeEventListener('click', closeOnOutsideClick);
      }
    };
    setTimeout(() => document.addEventListener('click', closeOnOutsideClick), 0);
  }

  private createControlSelect(
    container: HTMLElement,
    label: string,
    options: Array<{ label: string; value: string }>,
    onChange: (value: string) => Promise<void>
  ): HTMLSelectElement {
    const control = container.createDiv({ cls: 'mdflow-rednote-control' });
    control.createSpan({ cls: 'mdflow-rednote-control-label', text: label });
    const select = control.createEl('select', { cls: 'mdflow-rednote-control-select' });

    options.forEach((option) => {
      select.createEl('option', { value: option.value, text: option.label });
    });

    select.addEventListener('change', () => void onChange(select.value));
    return select;
  }

  private createControlNumber(
    container: HTMLElement,
    label: string,
    onChange: (value: string) => Promise<void>
  ): HTMLInputElement {
    const control = container.createDiv({ cls: 'mdflow-rednote-control' });
    control.createSpan({ cls: 'mdflow-rednote-control-label', text: label });
    const input = control.createEl('input', {
      cls: 'mdflow-rednote-control-input',
      type: 'number',
    });
    input.min = '12';
    input.max = '28';
    input.step = '1';

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedOnChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const parsed = Number.parseInt(input.value, 10);
        if (!Number.isNaN(parsed) && parsed >= 12 && parsed <= 28) {
          void onChange(input.value);
        }
      }, 400);
    };

    input.addEventListener('change', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      const parsed = Number.parseInt(input.value, 10);
      if (!Number.isNaN(parsed)) {
        void onChange(input.value);
      }
    });
    input.addEventListener('input', debouncedOnChange);
    return input;
  }

  private createCompactAction(
    container: HTMLElement,
    label: string,
    onClick: () => void | Promise<void>
  ): HTMLButtonElement {
    const button = container.createEl('button', {
      cls: 'mdflow-rednote-compact-action',
      text: label,
      type: 'button',
    });
    button.addEventListener('click', () => void onClick());
    return button;
  }

  private createTab(container: Element, platform: PlatformId, label: string): void {
    const tab = container.createDiv({ cls: 'mdflow-tab' });
    if (platform === this.currentPlatform) tab.addClass('active');

    tab.setText(label);

    tab.addEventListener('click', async () => {
      this.currentPlatform = platform;
      container.querySelectorAll('.mdflow-tab').forEach((currentTab) => currentTab.removeClass('active'));
      tab.addClass('active');
      this.updateToolbarForPlatform();
      await this.refreshPreview();
    });
  }

  private updateToolbarForPlatform(): void {
    this.previewEl?.setAttribute('data-platform', this.currentPlatform);

    if (this.currentPlatform === 'wechat') {
      this.themeSelector.style.display = '';
      this.redNoteControlsEl.style.display = 'none';
      this.exportBtnContainerEl.style.display = '';
      this.redNoteBottomBarEl.style.display = 'none';
      this.exportBtnEl.textContent = '复制到剪贴板';
      return;
    }

    if (this.currentPlatform === 'x') {
      this.themeSelector.style.display = 'none';
      this.redNoteControlsEl.style.display = 'none';
      this.exportBtnContainerEl.style.display = '';
      this.redNoteBottomBarEl.style.display = 'none';
      this.exportBtnEl.textContent = '复制 X Articles 格式';
      return;
    }

    this.themeSelector.style.display = 'none';
    this.redNoteControlsEl.style.display = '';
    this.exportBtnContainerEl.style.display = 'none';
    this.redNoteBottomBarEl.style.display = '';
    this.syncRedNoteControls();
  }

  private registerEvents(): void {
    this.registerEvent(
      this.app.workspace.on('file-open', async (file) => {
        if (file && file.extension === 'md') {
          this.activeFile = file;
          await this.updatePreview();
          return;
        }

        this.activeFile = null;
        this.renderedHtml = '';
        this.showPlaceholder();
      })
    );

    this.registerEvent(
      this.app.workspace.on('editor-change', async () => {
        await this.updatePreview();
      })
    );

    this.registerEvent(
      this.redNoteSettings.on('change', async () => {
        this.syncRedNoteControls();

        if (this.currentPlatform === 'rednote' && this.activeFile) {
          await this.refreshPreview();
        }
      })
    );
  }

  private syncRedNoteControls(): void {
    const settings = this.redNoteSettings.getSettings();

    this.redNoteTemplateSelectEl.value = settings.templateId;
    this.redNoteFontSizeInputEl.value = String(settings.fontSize);

    const fontValue = settings.fontFamily;
    const hasFontOption = Array.from(this.redNoteFontSelectEl.options).some(
      (option) => option.value === fontValue
    );

    if (!hasFontOption) {
      const option = document.createElement('option');
      option.value = fontValue;
      option.text = '当前自定义字体';
      this.redNoteFontSelectEl.appendChild(option);
    }

    this.redNoteFontSelectEl.value = fontValue;
  }

  private async handleRedNoteImageUpload(field: RedNoteAssetField): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) return;

        if (field === 'userAvatar') {
          await this.redNoteSettings.update({ userAvatar: result });
          new Notice('头像已更新');
          return;
        }

        if (field === 'coverImage') {
          await this.redNoteSettings.update({ coverImage: result });
          new Notice('封面已更新');
          return;
        }

        await this.redNoteSettings.update({ [field]: result });
        new Notice('图片已更新');
      };
      reader.readAsDataURL(file);
    });

    input.click();
  }

  private async updatePreview(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile || activeFile.extension !== 'md') {
      this.activeFile = null;
      this.renderedHtml = '';
      this.showPlaceholder();
      return;
    }

    this.activeFile = activeFile;

    try {
      const markdown = await this.app.vault.read(activeFile);
      this.renderedHtml = await this.converter.convertToHtml(markdown, activeFile);
      await this.refreshPreview();
    } catch (error) {
      console.error('MDFlow: Preview update failed', error);
      new Notice('预览更新失败');
    }
  }

  private async refreshPreview(): Promise<void> {
    if (!this.renderedHtml || !this.activeFile) {
      this.showPlaceholder();
      return;
    }

    const exporter = this.exporters.get(this.currentPlatform);
    if (!exporter) return;

    const context = this.createContext();
    this.preparedContent = await exporter.prepare(this.renderedHtml, context);
    this.previewEl.innerHTML = this.preparedContent.previewHtml;
    await exporter.mountPreview?.(this.previewEl, this.preparedContent, context);
  }

  private showPlaceholder(): void {
    this.preparedContent = null;
    this.previewEl.innerHTML = '<div class="mdflow-placeholder">打开一个 Markdown 文件开始预览</div>';
  }

  private async handleDownloadCurrentPage(): Promise<void> {
    if (!this.renderedHtml || !this.activeFile) {
      new Notice('没有内容可导出');
      return;
    }

    const imagePreview = this.previewEl.querySelector('.red-image-preview') as HTMLElement | null;
    if (!imagePreview) {
      new Notice('没有预览内容');
      return;
    }

    try {
      const title = this.activeFile.basename;
      const indicator = this.previewEl.querySelector('.red-page-indicator');
      const pageNum = indicator?.textContent?.split('/')[0] || '1';
      await this.redNoteExporter.downloadSinglePage(imagePreview, title, pageNum);
      new Notice('当前页已下载');
    } catch (error) {
      console.error('Download current page failed:', error);
      new Notice('下载失败');
    }
  }

  private async handleExport(): Promise<void> {
    if (!this.renderedHtml || !this.activeFile) {
      new Notice('没有内容可导出');
      return;
    }

    const exporter = this.exporters.get(this.currentPlatform);
    if (!exporter) {
      new Notice('该平台暂未实现');
      return;
    }

    if (!this.preparedContent) {
      await this.refreshPreview();
    }

    if (!this.preparedContent) {
      new Notice('没有内容可导出');
      return;
    }

    const result = await exporter.export(this.preparedContent, this.createContext());
    if (result.success) {
      new Notice(result.message);
    } else {
      new Notice(result.message, 5000);
    }
  }

  private createContext(): PlatformRenderContext {
    if (!this.activeFile) {
      throw new Error('No active file');
    }

    return {
      app: this.app,
      sourceFile: this.activeFile,
      title: this.activeFile.basename,
    };
  }

  async onClose(): Promise<void> {
    this.converter.dispose();
  }
}
