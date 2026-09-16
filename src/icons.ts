export type IconDefinition =
	| { kind: 'emoji'; value: string }
	| { kind: 'obsidian'; name: string }
	| { kind: 'asset'; alt: string; file: string };

export type ArticleTypeKey =
	| 'article'
	| 'review'
	| 'preprint'
	| 'proceedings'
	| 'book'
	| 'book-chapter'
	| 'clinical-trial'
	| 'case-report'
	| 'editorial'
	| 'letter'
	| 'news'
	| 'dataset'
	| 'report'
	| 'thesis'
	| 'guideline'
	| 'comment'
	| 'other';

export const ICON_ASSET_BASE = 'https://raw.githubusercontent.com/gundestrup/obsidian-research/main/assets';

export const CANONICAL_ARTICLE_TYPES: readonly ArticleTypeKey[] = [
	'article',
	'review',
	'preprint',
	'proceedings',
	'book',
	'book-chapter',
	'clinical-trial',
	'case-report',
	'editorial',
	'letter',
	'news',
	'dataset',
	'report',
	'thesis',
	'guideline',
	'comment',
	'other',
];

export const APP_ICONS = {
	status: {
		permanentFailure: { kind: 'emoji', value: '🔴' },
		transientFailure: { kind: 'emoji', value: '🟡' },
	},
	ui: {
		fetch: { kind: 'obsidian', name: 'download' },
		folder: { kind: 'emoji', value: '📁' },
	},
	articleTypes: {
		article: { kind: 'emoji', value: '📄' },
		review: { kind: 'emoji', value: '🔎' },
		preprint: { kind: 'emoji', value: '🧪' },
		proceedings: { kind: 'emoji', value: '📚' },
		book: { kind: 'emoji', value: '📖' },
		'book-chapter': { kind: 'emoji', value: '📑' },
		'clinical-trial': { kind: 'emoji', value: '🧪' },
		'case-report': { kind: 'emoji', value: '🩺' },
		editorial: { kind: 'emoji', value: '✍️' },
		letter: { kind: 'emoji', value: '✉️' },
		news: { kind: 'emoji', value: '📰' },
		dataset: { kind: 'emoji', value: '📊' },
		report: { kind: 'emoji', value: '📋' },
		thesis: { kind: 'emoji', value: '🎓' },
		guideline: { kind: 'emoji', value: '📘' },
		comment: { kind: 'emoji', value: '💬' },
		other: { kind: 'emoji', value: '📄' },
	},
} as const satisfies {
	status: Record<'permanentFailure' | 'transientFailure', IconDefinition>;
	ui: Record<'fetch' | 'folder', IconDefinition>;
	articleTypes: Record<ArticleTypeKey, IconDefinition>;
};

const ARTICLE_TYPE_KEYS: Record<string, ArticleTypeKey> = {
	article: 'article',
	review: 'review',
	preprint: 'preprint',
	proceedings: 'proceedings',
	book: 'book',
	'book chapter': 'book-chapter',
	'clinical trial': 'clinical-trial',
	'case report': 'case-report',
	editorial: 'editorial',
	letter: 'letter',
	news: 'news',
	dataset: 'dataset',
	report: 'report',
	thesis: 'thesis',
	guideline: 'guideline',
	comment: 'comment',
	other: 'other',
};

export function renderIcon(icon: IconDefinition): string {
	switch (icon.kind) {
		case 'emoji':
			return icon.value;
		case 'obsidian':
			return icon.name;
		case 'asset':
			return `![${icon.alt}|16](${ICON_ASSET_BASE}/${icon.file})`;
	}
}

export function failureMarkerSymbol(kind: 'permanent' | 'transient'): string {
	const icon = kind === 'permanent' ? APP_ICONS.status.permanentFailure : APP_ICONS.status.transientFailure;
	return renderIcon(icon);
}

export function articleTypeIcon(articleType: string | undefined): string {
	const key = ARTICLE_TYPE_KEYS[articleType?.trim().toLowerCase() ?? ''] ?? 'article';
	return renderIcon(APP_ICONS.articleTypes[key]);
}
