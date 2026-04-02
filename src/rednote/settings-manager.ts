import { Events, Plugin } from 'obsidian';
import {
  DEFAULT_REDNOTE_SETTINGS,
  REDNOTE_FONT_OPTIONS,
  RedNoteAssetField,
  RedNoteFontOption,
  RedNoteSettings,
  clampRedNoteFontSize,
} from './types';
import { DEFAULT_REDNOTE_TEMPLATE_ID, REDNOTE_TEMPLATE_PRESETS, getRedNoteTemplatePreset } from './template-presets';

interface MDFlowPluginData {
  rednote?: Partial<RedNoteSettings>;
}

export class RedNoteSettingsManager extends Events {
  private settings: RedNoteSettings = DEFAULT_REDNOTE_SETTINGS;

  constructor(private plugin: Plugin) {
    super();
  }

  async load(): Promise<void> {
    const rawData = await this.plugin.loadData();
    const pluginData = this.normalizePluginData(rawData);
    this.settings = this.normalizeSettings(pluginData.rednote);
  }

  getSettings(): RedNoteSettings {
    return this.settings;
  }

  getTemplate(id?: string) {
    return getRedNoteTemplatePreset(id || this.settings.templateId);
  }

  getTemplates() {
    return Object.values(REDNOTE_TEMPLATE_PRESETS);
  }

  getFontOptions(): RedNoteFontOption[] {
    const byValue = new Map<string, RedNoteFontOption>();

    [...REDNOTE_FONT_OPTIONS, ...this.settings.customFonts].forEach((font) => {
      byValue.set(font.value, font);
    });

    return Array.from(byValue.values());
  }

  async update(patch: Partial<RedNoteSettings>): Promise<void> {
    this.settings = this.normalizeSettings({
      ...this.settings,
      ...patch,
    });

    await this.save();
    this.trigger('change', this.settings);
  }

  async resetAsset(field: RedNoteAssetField): Promise<void> {
    await this.update({ [field]: '' } as Pick<RedNoteSettings, typeof field>);
  }

  private async save(): Promise<void> {
    const rawData = await this.plugin.loadData();
    const pluginData = this.normalizePluginData(rawData);
    pluginData.rednote = this.settings;
    await this.plugin.saveData(pluginData);
  }

  private normalizePluginData(rawData: unknown): MDFlowPluginData {
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
      return {};
    }

    const maybeData = rawData as MDFlowPluginData & Partial<RedNoteSettings>;
    if (maybeData.rednote && typeof maybeData.rednote === 'object') {
      return maybeData;
    }

    if ('templateId' in maybeData || 'userName' in maybeData || 'footerLeftText' in maybeData) {
      return { rednote: maybeData };
    }

    return maybeData;
  }

  private normalizeSettings(input?: Partial<RedNoteSettings>): RedNoteSettings {
    const merged: RedNoteSettings = {
      ...DEFAULT_REDNOTE_SETTINGS,
      ...input,
      customFonts: input?.customFonts?.length ? input.customFonts : [...REDNOTE_FONT_OPTIONS],
    };

    const templateId = REDNOTE_TEMPLATE_PRESETS[merged.templateId]
      ? merged.templateId
      : DEFAULT_REDNOTE_TEMPLATE_ID;

    const fontOptions = new Map<string, RedNoteFontOption>();
    [...REDNOTE_FONT_OPTIONS, ...(merged.customFonts || [])].forEach((font) => {
      fontOptions.set(font.value, font);
    });

    const fontFamily = fontOptions.has(merged.fontFamily)
      ? merged.fontFamily
      : DEFAULT_REDNOTE_SETTINGS.fontFamily;

    return {
      ...merged,
      templateId,
      fontFamily,
      fontSize: clampRedNoteFontSize(merged.fontSize),
      customFonts: Array.from(fontOptions.values()),
    };
  }
}
