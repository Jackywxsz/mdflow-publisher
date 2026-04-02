import { Modal } from 'obsidian';
import { WECHAT_PAY_QR, VIDEO_ACCOUNT_QR, WECHAT_PUBLIC_QR, DOUYIN_QR, XIAOHONGSHU_QR } from './author-assets';

export class RedNoteAboutModal extends Modal {
  constructor(app: Modal['app']) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('mdflow-about-modal');

    const card = contentEl.createDiv({ cls: 'mdflow-about-card' });
    const body = card.createDiv({ cls: 'mdflow-about-body' });

    // Title
    body.createEl('h2', { cls: 'mdflow-about-title', text: '关于 MDFlow' });

    // Plugin intro
    const pluginIntro = [
      'MDFlow 是一款 Obsidian 排版分发插件 —— 在 Obsidian 里用 Markdown 写作，一键生成适配微信公众号、X Articles、小红书图文的精美排版，直接复制粘贴即可发布，告别重复排版的繁琐。',
      '由 Jacky 独立开发与维护。白天做商业内容策划，下班研究 AI 与效率工具，希望用技术让创作者专注于内容本身。',
    ];
    pluginIntro.forEach((line) => body.createEl('p', { text: line }));

    // Support section
    const supportSection = body.createDiv({ cls: 'mdflow-about-section' });
    supportSection.createEl('h3', { cls: 'mdflow-about-section-title', text: '请我喝杯咖啡' });
    supportSection.createEl('p', {
      cls: 'mdflow-about-section-text',
      text: '如果 MDFlow 帮你省下了排版的时间，愿意的话请我喝杯咖啡吧。你的每一份支持，都是我持续打磨这款工具最大的动力。',
    });
    this.renderQrCard(supportSection, WECHAT_PAY_QR, '微信扫一扫打赏');

    // Social accounts
    const socialSection = body.createDiv({ cls: 'mdflow-about-section' });
    socialSection.createEl('h3', { cls: 'mdflow-about-section-title', text: '关注我的更新' });
    socialSection.createEl('p', {
      cls: 'mdflow-about-section-text',
      text: '我会在这些平台分享 AI 写作、效率工具和内容创作的实战经验，欢迎关注交流。',
    });

    const grid = socialSection.createDiv({ cls: 'mdflow-about-social-grid' });
    this.renderSocialCard(grid, XIAOHONGSHU_QR, '小红书');
    this.renderSocialCard(grid, WECHAT_PUBLIC_QR, '微信公众号');
    this.renderSocialCard(grid, VIDEO_ACCOUNT_QR, '视频号');
    this.renderSocialCard(grid, DOUYIN_QR, '抖音');

    // Footer
    const footer = card.createDiv({ cls: 'mdflow-about-footer' });
    footer.createEl('div', { text: '无限生长，持续创作' });
    footer.createEl('div', { cls: 'mdflow-about-footer-separator', text: '•' });
    footer.createEl('div', { text: '@Jacky 无限生长' });
  }

  private renderQrCard(container: HTMLElement, imageSrc: string, caption: string): void {
    const mediaGrid = container.createDiv({ cls: 'mdflow-about-media-grid' });
    const card = mediaGrid.createDiv({ cls: 'mdflow-about-media-card' });
    card.createEl('img', {
      cls: 'mdflow-about-media-image',
      attr: { src: imageSrc, alt: caption },
    });
    card.createEl('div', { cls: 'mdflow-about-media-caption', text: caption });
  }

  private renderSocialCard(container: HTMLElement, imageSrc: string, label: string): void {
    const card = container.createDiv({ cls: 'mdflow-about-social-card' });
    card.createEl('img', {
      cls: 'mdflow-about-social-image',
      attr: { src: imageSrc, alt: label },
    });
    card.createEl('div', { cls: 'mdflow-about-social-label', text: label });
  }
}
