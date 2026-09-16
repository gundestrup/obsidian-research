import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import { DEFAULT_SETTINGS } from './types';
import type { PluginSettingsHolder } from './types';

export class ResearchArticleFetcherSettingTab extends PluginSettingTab {
	plugin: PluginSettingsHolder;

	constructor(app: App, plugin: PluginSettingsHolder) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions() {
		return [
			{
				name: 'PubMed/PMC API key (optional)',
				desc: 'Enter your NCBI API key for higher PubMed and PMC rate limits. arXiv and CrossRef need no key. Get one at https://www.ncbi.nlm.nih.gov/account/',
				control: {
					type: 'text' as const,
					key: 'apiKey' as const,
					placeholder: 'Your NCBI API key',
				},
			},
			{
				name: 'Web of Science API key',
				desc: 'Required for Web of Science lookups. Each user needs their own free key — register at https://developer.clarivate.com/ as a public native application and subscribe to the WoS Starter API.',
				control: {
					type: 'text' as const,
					key: 'wosApiKey' as const,
					placeholder: 'Your Web of Science API key',
				},
			},
			{
				name: 'Failure index filename',
				desc: 'Filename for the optional note listing references that could not be matched. The default is research-article-unmatched.md.',
				control: {
					type: 'text' as const,
					key: 'failureIndexFilename' as const,
					placeholder: DEFAULT_SETTINGS.failureIndexFilename,
				},
			},
			{
				name: 'Enable failure index page',
				desc: 'Keep the configured failure-index note updated after note/vault runs. Use the "Open unmatched research article references" command to open it.',
				render: (setting: Setting) => {
					setting.addToggle((toggle) =>
						toggle
							.setValue(this.plugin.settings.enableFailureIndex || false)
							.onChange(async (value) => {
								this.plugin.settings.enableFailureIndex = value;
								await this.plugin.saveSettings();
							})
					);
				},
			},
			{
				name: 'Enable global update command',
				desc: '⚠️ DANGEROUS: Enable the "Link global" command that can update ALL notes in your vault. This command will modify multiple files. Only enable if you understand the risks and have backups.',
				render: (setting: Setting) => {
					setting.addToggle((toggle) =>
						toggle
							.setValue(this.plugin.settings.enableGlobalCommand || false)
							.onChange(async (value) => {
								this.plugin.settings.enableGlobalCommand = value;
								await this.plugin.saveSettings();
								new Notice(
									`Global command ${value ? 'enabled' : 'disabled'}. Please reload Obsidian for changes to take effect.`
								);
							})
					);
				},
			},
		];
	}
}
