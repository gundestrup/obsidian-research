import { App, Modal, Setting } from 'obsidian';
import { APP_ICONS } from './icons';

export class FolderSelectionModal extends Modal {
	onSubmit: (folder: string) => void;

	constructor(app: App, onSubmit: (folder: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		new Setting(contentEl)
			.setName('Select folder for global update')
			.setHeading();

		new Setting(contentEl).setDesc('⚠️ This will update ALL PubMed/DOI links in the selected folder and its subfolders.');

		const allFiles = this.app.vault.getAllLoadedFiles();
		const folders = allFiles
			.filter((f) => 'children' in f)
			.map((f) => f.path)
			.sort((a, b) => a.localeCompare(b));

		const allNotesBtn = contentEl.createEl('button', {
			text: `${APP_ICONS.ui.folder.value} All notes in vault`,
			cls: 'research-article-fetcher-button-full',
		});
		allNotesBtn.onclick = () => {
			this.onSubmit('/');
			this.close();
		};

		contentEl.createEl('p', { text: 'Or select a specific folder' });

		const folderList = contentEl.createDiv({ cls: 'research-article-fetcher-folder-list' });

		if (folders.length === 0) {
			folderList.createEl('p', { text: 'No folders found in the vault' });
		} else {
			folders.forEach((folder) => {
				const folderBtn = folderList.createEl('button', {
					text: `${APP_ICONS.ui.folder.value} ${folder || '(root)'}`,
					cls: 'research-article-fetcher-folder-button',
				});
				folderBtn.onclick = () => {
					this.onSubmit(folder);
					this.close();
				};
			});
		}

		const cancelBtn = contentEl.createEl('button', {
			text: 'Cancel',
			cls: 'research-article-fetcher-button-cancel',
		});
		cancelBtn.onclick = () => {
			this.close();
		};
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class ArticleInputModal extends Modal {
	onSubmit: (input: string) => void;

	constructor(app: App, onSubmit: (input: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		new Setting(contentEl)
			.setName('Enter article ID or URL')
			.setHeading();

		const input = contentEl.createEl('input', {
			type: 'text',
			placeholder: 'PubMed ID, DOI, PMC ID, arXiv ID, or WOS ID',
			cls: 'research-article-fetcher-input',
		});

		const submitBtn = contentEl.createEl('button', { text: 'Fetch article' });
		submitBtn.onclick = () => {
			this.onSubmit(input.value);
			this.close();
		};

		input.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				this.onSubmit(input.value);
				this.close();
			}
		});

		input.focus();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
