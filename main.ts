import { Plugin, Notice, Editor, TFile, requestUrl } from 'obsidian';
import type { ResearchArticleFetcherSettings, ArticleInfo, FailureKind, RequestUrlResponse } from './src/types';
import { DEFAULT_SETTINGS } from './src/types';
import { isAlreadyCited, failureMarker, failureMarkerKind, failureKind, providerIcon, providerBadge, pubmedUrl, pmcUrl, doiUrl, arxivAbsUrl, wosRecordUrl } from './src/utils';
import { formatCitation } from './src/citation';
import { APP_ICONS, articleTypeIcon, failureMarkerSymbol } from './src/icons';
import { type RequestFunction } from './src/api';
import {
	PROVIDERS,
	collectProviderIds,
	isArticleInfo,
	type ArticleProvider,
	type FetchContext,
} from './src/providers';
import { ArticleInputModal, FolderSelectionModal } from './src/modals';
import { ResearchArticleFetcherSettingTab } from './src/settings';

const DEFAULT_FAILURE_INDEX_FILENAME = 'research-article-unmatched.md';

interface LinkFailure {
	provider: ArticleProvider;
	id: string;
	kind: FailureKind;
	failedThisRun?: boolean;
	file?: string;
}

export default class ResearchArticleFetcherPlugin extends Plugin {
	settings!: ResearchArticleFetcherSettings;

	private get failureIndexPath(): string {
		const filename = this.settings.failureIndexFilename?.trim();
		return filename || DEFAULT_FAILURE_INDEX_FILENAME;
	}

	private get requestFn(): RequestFunction {
		return async (params: { url: string; headers?: Record<string, string> }): Promise<RequestUrlResponse> => {
			const response = await requestUrl({ url: params.url, headers: params.headers });
			let json: unknown;
			try {
				json = response.json;
			} catch {
				json = undefined;
			}
			return { status: response.status, json, text: response.text };
		};
	}

	private get fetchCtx(): FetchContext {
		return {
			settings: this.settings,
			requestFn: this.requestFn,
			delay: (ms) => this.delay(ms),
		};
	}

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'fetch-article-note',
			name: 'Fetch research article',
			callback: () => {
				new ArticleInputModal(this.app, (input) => {
					void this.fetchArticle(input);
				}).open();
			}
		});

		this.addCommand({
			id: 'fetch-article-selected',
			name: 'Fetch research article for selected link',
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection().trim();
				if (selection) {
					void this.fetchArticleAndInsert(selection, editor);
				} else {
					new Notice('Please select an article ID or URL first');
				}
			}
		});

		this.addCommand({
			id: 'fetch-article-all',
			name: 'Fetch research articles in current note',
			editorCallback: (editor: Editor) => {
				void this.fetchAllArticlesInNote(editor);
			}
		});

		this.addCommand({
			id: 'fetch-article-all-force',
			name: 'Force fetch research articles in current note',
			editorCallback: (editor: Editor) => {
				void this.fetchAllArticlesInNote(editor, true);
			}
		});

		this.addCommand({
			id: 'open-unmatched-article-references',
			name: 'Open unmatched research article references',
			callback: async () => {
				const file = this.app.vault.getAbstractFileByPath(this.failureIndexPath);
				if (!(file instanceof TFile)) {
					new Notice('No unmatched article references note found. Enable the failure index and run an update first.');
					return;
				}
				await this.app.workspace.getLeaf(false).openFile(file);
			}
		});

		if (this.settings.enableGlobalCommand) {
			this.addCommand({
				id: 'fetch-article-global',
				name: 'Fetch research articles in all notes',
				callback: () => {
					new FolderSelectionModal(this.app, (selectedFolder) => {
						void this.fetchAllArticlesInVault(selectedFolder);
					}).open();
				}
			});

			this.addCommand({
				id: 'fetch-article-global-force',
				name: 'Force fetch research articles in all notes',
				callback: () => {
					new FolderSelectionModal(this.app, (selectedFolder) => {
						void this.fetchAllArticlesInVault(selectedFolder, true);
					}).open();
				}
			});
		}

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor) => {
				const selection = editor.getSelection().trim();
				if (selection && PROVIDERS.some((provider) => provider.extractId(selection))) {
					menu.addItem((item) => {
						item
							.setTitle('Fetch research article')
							.setIcon(APP_ICONS.ui.fetch.name)
							.onClick(() => {
								void this.fetchArticleAndInsert(selection, editor);
							});
					});
				}
			})
		);

		this.addSettingTab(new ResearchArticleFetcherSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as ResearchArticleFetcherSettings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private handleError(error: unknown, context: string): void {
		console.error('Error in', context, error);
		const message = error instanceof Error ? error.message : 'Unknown error occurred';
		new Notice(`Error fetching article: ${message}`);
	}

	private async delay(ms: number): Promise<void> {
		return new Promise(resolve => window.setTimeout(resolve, ms));
	}

	async fetchArticle(input: string) {
		const trimmedInput = input.trim();

		for (const provider of PROVIDERS) {
			const id = provider.extractId(trimmedInput);
			if (!id) continue;

			try {
				new Notice(`Fetching article from ${provider.displayName}`);
				const info = await provider.fetch(id, this.fetchCtx);
				if (info) {
					void this.displayArticleInfo(info, provider);
				} else {
					new Notice(`Could not find article for the given ${provider.displayName} ID.`);
				}
			} catch (error) {
				this.handleError(error, `fetchArticle:${provider.id}`);
			}
			return;
		}

		new Notice('Invalid input. Please enter a valid article ID or URL');
	}

	async fetchArticleAndInsert(input: string, editor: Editor) {
		const trimmedInput = input.trim();

		for (const provider of PROVIDERS) {
			const id = provider.extractId(trimmedInput);
			if (!id) continue;

			try {
				new Notice(`Fetching article from ${provider.displayName}`);
				const info = await provider.fetch(id, this.fetchCtx);
				if (info) {
					this.insertArticleInfo(info, editor, provider);
				} else {
					new Notice(`Could not find article for the given ${provider.displayName} ID.`);
					editor.replaceSelection(this.markedReference(provider, id, 'permanent'));
				}
			} catch (error) {
				this.handleError(error, `fetchArticleAndInsert:${provider.id}`);
				editor.replaceSelection(this.markedReference(provider, id, failureKind(error)));
			}
			return;
		}

		new Notice('Invalid input. Please enter a valid article ID or URL');
	}

	async displayArticleInfo(info: ArticleInfo, provider: ArticleProvider) {
		const link =
			provider.citationUrl(info) ??
			(info.pmcId
				? pmcUrl(info.pmcId)
				: info.pubmedId
					? pubmedUrl(info.pubmedId)
					: info.arxivId
						? arxivAbsUrl(info.arxivId)
						: info.wosId
							? wosRecordUrl(info.wosId)
							: doiUrl(info.doi || ''));

		const content = `# ${info.title}

**Journal:** ${info.journal}  
**Year:** ${info.year}  
**Type:** ${articleTypeIcon(info.articleType)} ${info.articleType || 'Article'}<br>
**Link:** ${link}  
**ID:** ${info.pubmedId || info.arxivId || info.wosId || info.doi}

---

*Fetched by Research Article Fetcher plugin*`;

		let sanitizedTitle = info.title.replace(/[^\w\s-]/g, '').trim().substring(0, 50);
		if (!sanitizedTitle) {
			sanitizedTitle = `article-${Date.now()}`;
		}
		let fileName = `${sanitizedTitle}.md`;

		let counter = 1;
		while (await this.app.vault.adapter.exists(fileName)) {
			const baseName = fileName.replace(/\.md$/, '');
			fileName = `${baseName}-${counter}.md`;
			counter++;
		}

		await this.app.vault.create(fileName, content);

		new Notice(`Article information saved to ${fileName}`);
	}

	insertArticleInfo(info: ArticleInfo, editor: Editor, provider?: ArticleProvider) {
		const citation = formatCitation(info, provider);
		editor.replaceSelection(citation);
		new Notice('Article information inserted');
	}

	private logArticleProcessingError(kind: string, id: string, error: unknown, location?: string): void {
		if (location) {
			console.error('Error processing article in file', kind, id, location, error);
			return;
		}
		console.error('Error processing article', kind, id, error);
	}

	private markedReference(provider: ArticleProvider, id: string, kind: FailureKind): string {
		return [
			failureMarker(provider.markerKey(id), kind),
			providerIcon(provider.badge.alt, provider.badge.logo),
			provider.referenceForId(id),
		].join(' ');
	}

	private markFailure(provider: ArticleProvider, content: string, id: string, kind: FailureKind): string {
		return provider.replaceUrl(content, id, this.markedReference(provider, id, kind));
	}

	private async processProviderLink(
		provider: ArticleProvider,
		content: string,
		id: string,
		location?: string,
		force?: boolean
	): Promise<{ content: string; processed: boolean; failure?: LinkFailure }> {
		if (provider.isIdCited(content, id)) return { content, processed: false };
		if (!force && failureMarkerKind(content, provider.markerKey(id)) === 'permanent') {
			return { content, processed: false, failure: { provider, id, kind: 'permanent' } };
		}
		let kind: FailureKind = 'permanent';
		try {
			const info = await provider.fetch(id, this.fetchCtx);
			await this.delay(provider.rateLimitDelay);
			if (info && !isAlreadyCited(content, info)) {
				return { content: provider.replaceUrl(content, id, formatCitation(info, provider)), processed: true };
			}
			if (info) return { content, processed: false };
		} catch (error) {
			this.logArticleProcessingError(provider.displayName, id, error, location);
			kind = failureKind(error);
		}
		return {
			content: this.markFailure(provider, content, id, kind),
			processed: false,
			failure: { provider, id, kind, failedThisRun: true },
		};
	}

	private async processProviderBatch(
		provider: ArticleProvider,
		content: string,
		ids: string[],
		location?: string,
		force?: boolean
	): Promise<{ content: string; processedCount: number; failures: LinkFailure[] }> {
		let updatedContent = content;
		let processedCount = 0;
		const failures: LinkFailure[] = [];
		if (!provider.fetchMany) return { content: updatedContent, processedCount, failures };

		const actionable = ids.filter((id) => {
			if (provider.isIdCited(updatedContent, id)) return false;
			if (!force && failureMarkerKind(updatedContent, provider.markerKey(id)) === 'permanent') {
				failures.push({ provider, id, kind: 'permanent' });
				return false;
			}
			return true;
		});
		if (actionable.length === 0) return { content: updatedContent, processedCount, failures };

		try {
			const outcomes = await provider.fetchMany(actionable, this.fetchCtx);
			await this.delay(provider.rateLimitDelay);
			for (const id of actionable) {
				const outcome = outcomes.get(id);
				if (isArticleInfo(outcome) && !isAlreadyCited(updatedContent, outcome)) {
					updatedContent = provider.replaceUrl(updatedContent, id, formatCitation(outcome, provider));
					processedCount++;
				} else if (!isArticleInfo(outcome)) {
					const kind = outcome ? outcome.failure : 'transient';
					updatedContent = this.markFailure(provider, updatedContent, id, kind);
					failures.push({ provider, id, kind, failedThisRun: true });
				}
			}
		} catch (error) {
			this.logArticleProcessingError(provider.displayName, actionable.join(','), error, location);
			const kind = failureKind(error);
			for (const id of actionable) {
				updatedContent = this.markFailure(provider, updatedContent, id, kind);
				failures.push({ provider, id, kind, failedThisRun: true });
			}
		}
		return { content: updatedContent, processedCount, failures };
	}

	private async processArticleLinks(
		content: string,
		found: Map<ArticleProvider, string[]>,
		location?: string,
		force?: boolean
	): Promise<{ content: string; processedCount: number; failedCount: number; failures: LinkFailure[] }> {
		let processedCount = 0;
		let failedCount = 0;
		const failures: LinkFailure[] = [];
		let updatedContent = content;
		for (const [provider, ids] of found) {
			if (provider.fetchMany) {
				const result = await this.processProviderBatch(provider, updatedContent, ids, location, force);
				updatedContent = result.content;
				processedCount += result.processedCount;
				failures.push(...result.failures);
				continue;
			}
			for (const id of ids) {
				const result = await this.processProviderLink(provider, updatedContent, id, location, force);
				updatedContent = result.content;
				if (result.processed) processedCount++;
				if (result.failure) failures.push(result.failure);
			}
		}
		failedCount = failures.filter((failure) => failure.failedThisRun).length;
		return { content: updatedContent, processedCount, failedCount, failures };
	}

	private async writeFailureIndex(failures: LinkFailure[]): Promise<void> {
		const existing = this.app.vault.getAbstractFileByPath(this.failureIndexPath);
		if (failures.length === 0) {
			if (existing instanceof TFile) await this.app.vault.delete(existing);
			return;
		}

		const lines = [
			'# Unmatched article references',
			'',
			'Generated by Research Article Fetcher. 🔴 not found — retried only via a force update · 🟡 temporary error — retried automatically.',
			'',
		];
		const byFile = new Map<string, LinkFailure[]>();
		for (const failure of failures) {
			const file = failure.file ?? '';
			byFile.set(file, [...(byFile.get(file) ?? []), failure]);
		}
		for (const [file, fileFailures] of byFile) {
			lines.push(file ? `## [[${file.replace(/\.md$/, '')}]]` : '## Current note', '');
			for (const failure of fileFailures) {
				const marker = failureMarkerSymbol(failure.kind);
				const link = failure.provider.referenceForId(failure.id);
				const icon = providerBadge(failure.provider.badge.alt, failure.provider.badge.logo, link);
				lines.push(`- ${marker} ${icon} [\`${failure.id}\`](${link}) — ${failure.provider.id}`);
			}
			lines.push('');
		}
		const markdown = lines.join('\n');
		if (existing instanceof TFile) await this.app.vault.modify(existing, markdown);
		else await this.app.vault.create(this.failureIndexPath, markdown);
	}

	async fetchAllArticlesInNote(editor: Editor, force = false) {
		const content = editor.getValue();
		const found = collectProviderIds(content);
		const totalLinks = [...found.values()].reduce((total, ids) => total + ids.length, 0);

		if (totalLinks === 0) {
			new Notice('No article links found in this note');
			return;
		}

		new Notice(`Found ${totalLinks} links to process in current note`);
		const result = await this.processArticleLinks(content, found, undefined, force);
		if (result.processedCount > 0 || result.failedCount > 0) editor.setValue(result.content);
		new Notice(`Successfully processed ${result.processedCount} of ${totalLinks} links in current note`);
		if (result.failedCount > 0) {
			new Notice(`⚠️ ${result.failedCount} link(s) could not be matched — marked with a warning in the note`);
		}
		if (this.settings.enableFailureIndex) {
			const file = this.app.workspace.getActiveFile()?.path;
			await this.writeFailureIndex(result.failures.map((failure) => ({ ...failure, file })));
		}
	}

	async fetchAllArticlesInVault(selectedFolder?: string, force = false) {
		let files = this.app.vault.getMarkdownFiles().filter(file => file.path !== this.failureIndexPath);
		if (selectedFolder && selectedFolder !== '/') files = files.filter(file => file.path.startsWith(selectedFolder));

		if (files.length === 0) {
			new Notice(`No markdown files found${selectedFolder ? ` in folder: ${selectedFolder}` : ' in vault'}`);
			return;
		}

		const folderInfo = selectedFolder && selectedFolder !== '/' ? ` in folder: ${selectedFolder}` : ' in vault';
		new Notice(`Scanning ${files.length} notes${folderInfo} for article links...`);

		let totalLinksFound = 0;
		let totalProcessed = 0;
		let totalFailed = 0;
		let filesProcessed = 0;
		const allFailures: LinkFailure[] = [];

		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);
				const found = collectProviderIds(content);
				const linksInFile = [...found.values()].reduce((total, ids) => total + ids.length, 0);
				if (linksInFile === 0) continue;

				totalLinksFound += linksInFile;
				filesProcessed++;
				const result = await this.processArticleLinks(content, found, file.path, force);
				totalProcessed += result.processedCount;
				totalFailed += result.failedCount;
				for (const failure of result.failures) {
					failure.file = file.path;
				}
				allFailures.push(...result.failures);
				if (result.content !== content) await this.app.vault.process(file, () => result.content);
			} catch (error) {
				console.error('Error processing file', file.path, error);
			}
		}

		if (this.settings.enableFailureIndex) {
			await this.writeFailureIndex(allFailures);
		}
		new Notice(`Global update complete: Processed ${totalProcessed} of ${totalLinksFound} links across ${filesProcessed} notes`);
		if (totalFailed > 0) {
			new Notice(`⚠️ ${totalFailed} link(s) could not be matched — marked with a warning in the notes`);
		}
	}
}
