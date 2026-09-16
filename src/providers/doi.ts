import type { ArticleInfo, CrossRefMessage } from '../types';
import { extractDOI, failureKind, isDOICited, replaceDOIUrl, resolveArticleType, doiUrl, DOI_URL_PATTERN } from '../utils';
import { fetchCrossRefMessage, findPubMedIdFromDOI } from '../api';
import { NCBI_DELAY, type ArticleProvider, type FetchOutcome } from './types';
import { fetchViaPubMed, fetchViaPubMedMany, recordHasArticleId } from './pubmed';

export function parseCrossRefMessage(
	message: CrossRefMessage,
	doi: string,
	defaultArticleType: string
): ArticleInfo {
	return {
		title: message.title?.[0] || 'No title available',
		journal:
			message['short-container-title']?.[0] ||
			message['container-title']?.[0] ||
			'No journal available',
		year: message.created?.['date-parts']?.[0]?.[0]?.toString() || 'No year available',
		doi: doi,
		pubmedId: undefined,
		pmcId: undefined,
		articleType: resolveArticleType(message.type, defaultArticleType),
	};
}

export const doiProvider: ArticleProvider = {
	id: 'doi',
	displayName: 'DOI',
	rateLimitDelay: NCBI_DELAY,
	scanPattern: DOI_URL_PATTERN,
	badge: { alt: 'DOI', logo: 'doi.svg' },
	supportedArticleTypes: ['article', 'review', 'preprint', 'proceedings', 'book', 'book-chapter', 'clinical-trial', 'case-report', 'editorial', 'letter', 'news', 'dataset', 'report', 'thesis', 'guideline', 'comment', 'other'],
	citationUrl: (info) => (info.doi ? doiUrl(info.doi) : null),
	referenceForId: doiUrl,
	markerKey: (id) => `doi=${id}`,
	extractId: extractDOI,
	isIdCited: isDOICited,
	replaceUrl: replaceDOIUrl,
	fetch: async (id, ctx) => {
		const info = await fetchViaPubMed(id, findPubMedIdFromDOI, ctx);
		if (info) {
			info.doi = id;
			return info;
		}
		const message = await fetchCrossRefMessage(id, ctx.requestFn);
		return parseCrossRefMessage(message, id, ctx.settings.articleType || 'Article');
	},
	fetchMany: async (ids, ctx) => {
		const results = await fetchViaPubMedMany(
			ids,
			{
				searchTerm: (id) => `"${id}"[DOI]`,
				matchRecord: (id, record) => recordHasArticleId(record, 'doi', id),
				applyId: (info, id) => {
					info.doi = id;
				},
			},
			ctx
		);
		for (const id of ids) {
			if (results.has(id)) continue;
			const outcome: FetchOutcome = await fetchCrossRefMessage(id, ctx.requestFn)
				.then((message) =>
					parseCrossRefMessage(message, id, ctx.settings.articleType || 'Article')
				)
				.catch((error: unknown) => ({ failure: failureKind(error) }));
			results.set(id, outcome);
		}
		return results;
	},
};
