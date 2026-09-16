import type { ArticleInfo, WosDocument } from '../types';
import {
	cleanDOI,
	extractWosId,
	isWosIdCited,
	resolveArticleType,
	replaceWosUrl,
	wosRecordUrl,
	WOS_REF_PATTERN,
} from '../utils';
import { fetchWosDocument } from '../api';
import { NCBI_DELAY, type ArticleProvider } from './types';

export function parseWosDocument(
	doc: WosDocument | null,
	wosId: string,
	defaultArticleType: string
): ArticleInfo {
	if (!doc || !doc.title) {
		throw new Error('Article not found');
	}

	return {
		title: doc.title,
		journal: doc.source?.sourceTitle || 'No journal available',
		year: doc.source?.publishYear?.toString() || 'No year available',
		wosId: wosId,
		doi: doc.identifiers?.doi ? cleanDOI(doc.identifiers.doi) : undefined,
		pubmedId: doc.identifiers?.pmid,
		articleType: resolveArticleType(doc.types?.[0], defaultArticleType),
	};
}

export const wosProvider: ArticleProvider = {
	id: 'wos',
	displayName: 'Web of Science',
	rateLimitDelay: NCBI_DELAY,
	scanPattern: WOS_REF_PATTERN,
	badge: { alt: 'Web of Science', logo: 'clarivate.svg' },
	supportedArticleTypes: ['article', 'review', 'preprint', 'proceedings', 'book', 'book-chapter', 'clinical-trial', 'case-report', 'editorial', 'letter', 'news', 'dataset', 'report', 'thesis', 'guideline', 'comment', 'other'],
	citationUrl: (info) => (info.wosId ? wosRecordUrl(info.wosId) : null),
	referenceForId: wosRecordUrl,
	markerKey: (id) => `wos=${id.replace(/^WOS:/i, '')}`,
	extractId: extractWosId,
	isIdCited: isWosIdCited,
	replaceUrl: replaceWosUrl,
	fetch: async (id, ctx) => {
		const apiKey = ctx.settings.wosApiKey || '';
		if (!apiKey) {
			throw new Error('Web of Science API key required. Add it in the plugin settings.');
		}
		const doc = await fetchWosDocument(id, apiKey, ctx.requestFn);
		return parseWosDocument(doc, id, ctx.settings.articleType || 'Article');
	},
};
