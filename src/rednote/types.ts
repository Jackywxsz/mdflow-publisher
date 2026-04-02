export interface RedNoteFontOption {
  label: string;
  value: string;
  isPreset?: boolean;
}

export interface RedNoteTemplatePreset {
  id: string;
  name: string;
  description: string;
  showCover: boolean;
  variables: Record<string, string>;
}

export interface RedNoteSettings {
  templateId: string;
  fontFamily: string;
  fontSize: number;
  userAvatar: string;
  userName: string;
  userId: string;
  showTime: boolean;
  timeFormat: string;
  notesTitle: string;
  brandTagline: string;
  footerLeftText: string;
  footerRightText: string;
  coverImage: string;
  aboutTitle: string;
  aboutBio: string;
  aboutCallout: string;
  supportTitle: string;
  supportText: string;
  supportQrImage: string;
  supportBannerImage: string;
  officialTitle: string;
  officialText: string;
  officialQrImage: string;
  officialBannerImage: string;
  customFonts: RedNoteFontOption[];
}

export type RedNoteAssetField =
  | 'userAvatar'
  | 'coverImage'
  | 'supportQrImage'
  | 'supportBannerImage'
  | 'officialQrImage'
  | 'officialBannerImage';

export const REDNOTE_FONT_OPTIONS: RedNoteFontOption[] = [
  {
    label: '系统无衬线',
    value: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif',
    isPreset: true,
  },
  {
    label: '苹方',
    value: '"PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif',
    isPreset: true,
  },
  {
    label: '宋体',
    value: '"Songti SC", "STSong", "Noto Serif CJK SC", serif',
    isPreset: true,
  },
  {
    label: '楷体',
    value: '"Kaiti SC", "STKaiti", "KaiTi", serif',
    isPreset: true,
  },
  {
    label: '文楷',
    value: '"LXGW WenKai", "Kaiti SC", "KaiTi", serif',
    isPreset: true,
  },
  {
    label: '等宽',
    value: '"SF Mono", "JetBrains Mono", Consolas, Monaco, monospace',
    isPreset: true,
  },
];

export const DEFAULT_REDNOTE_SETTINGS: RedNoteSettings = {
  templateId: 'banpie-cover',
  fontFamily: REDNOTE_FONT_OPTIONS[0].value,
  fontSize: 16,
  userAvatar: '',
  userName: 'Jacky Jia',
  userId: '@Jackywxsz',
  showTime: true,
  timeFormat: 'zh-CN',
  notesTitle: 'Jacky 创作笔记',
  brandTagline: 'AI 写作 × 内容分发 × 个人成长',
  footerLeftText: '无限生长，持续创作',
  footerRightText: '关注 Jacky 的 AI 内容实验',
  coverImage: '',
  aboutTitle: '关于作者',
  aboutBio: 'Jacky，专注 AI 写作、内容分发、效率系统与长期主义创作。',
  aboutCallout: '欢迎关注我的更新，一起把内容生产做成稳定、可复用的系统。',
  supportTitle: '请我喝咖啡',
  supportText: '如果这套工作流对你有帮助，欢迎支持我继续打磨 Obsidian、AI 写作和内容分发工具。',
  supportQrImage: '',
  supportBannerImage: '',
  officialTitle: '微信公众号',
  officialText: '想继续看我的 AI 内容实验、创作方法和效率系统，可以关注我的公众号。',
  officialQrImage: '',
  officialBannerImage: '',
  customFonts: [...REDNOTE_FONT_OPTIONS],
};

export function clampRedNoteFontSize(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_REDNOTE_SETTINGS.fontSize;
  return Math.min(28, Math.max(12, Math.round(value)));
}
