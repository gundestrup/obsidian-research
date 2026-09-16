import type { ArticleInfo, FailureKind, PubMedResult } from '../types';
import type { RequestFunction } from '../api';
import {
	cleanDOI,
	extractPubMedId,
	isPubMedIdCited,
	resolveArticleType,
	replacePubMedUrl,
	pubmedUrl,
	PUBMED_URL_PATTERN,
} from '../utils';
import { fetchPubMedResult, fetchPubMedResults, searchPubMedIds } from '../api';
import { NCBI_DELAY, type ArticleProvider, type FetchContext, type FetchOutcome } from './types';

export function parsePubMedResult(
	result: PubMedResult,
	pubmedId: string,
	defaultArticleType: string
): ArticleInfo {
	let doi = '';
	let pmcId = '';

	if (result.doi) {
		doi = cleanDOI(result.doi);
	} else if (result.elocationid) {
		doi = cleanDOI(result.elocationid);
	}

	if (result.articleids) {
		const doiObj = result.articleids.find((id) => id.idtype === 'doi');
		if (doiObj && !doi) {
			doi = cleanDOI(doiObj.value);
		}

		const pmcObj = result.articleids.find((id) => id.idtype === 'pmc');
		if (pmcObj) {
			pmcId = pmcObj.value;
			if (!pmcId.startsWith('PMC')) {
				pmcId = 'PMC' + pmcId;
			}
		}
	}

	return {
		title: result.title || 'No title available',
		journal: result.source || result.fulljournalname || 'No journal available',
		year: result.pubdate ? result.pubdate.split(' ')[0] : 'No year available',
		pubmedId: pubmedId,
		doi: doi,
		pmcId: pmcId,
		articleType: resolveArticleType(result.pubtype?.[0], defaultArticleType),
	};
}

export async function fetchViaPubMed(
	id: string,
	findPubMedId: (id: string, apiKey: string, requestFn: RequestFunction) => Promise<string | null>,
	ctx: FetchContext
): Promise<ArticleInfo | null> {
	const apiKey = ctx.settings.apiKey || '';
	const pubmedId = await findPubMedId(id, apiKey, ctx.requestFn);
	if (!pubmedId) return null;
	await ctx.delay(NCBI_DELAY);
	return parsePubMedResult(await fetchPubMedResult(pubmedId, apiKey, ctx.requestFn), pubmedId, '');
}

export interface PubMedBatchOptions {
	/** Builds the esearch term for one requested ID; omit for direct PMID lookup */
	searchTerm?: (id: string) => string;
	/** Matches a fetched PubMed record back to a requested ID */
	matchRecord: (id: string, record: PubMedResult) => boolean;
	/** Stamps the requested ID onto the translated ArticleInfo */
	applyId?: (info: ArticleInfo, id: string) => void;
	/** Failure kind recorded for IDs with no matching record; omitted IDs stay unmarked (caller may retry) */
	missFailure?: FailureKind;
}

export function recordHasArticleId(
	record: PubMedResult,
	idtype: 'pmc' | 'doi',
	value: string
): boolean {
	return !!record.articleids?.some((articleId) => {
		if (articleId.idtype !== idtype) return false;
		return idtype === 'pmc'
			? articleId.value.replace(/\D/g, '') === value.replace(/\D/g, '')
			: articleId.value.toUpperCase() === value.toUpperCase();
	});
}

export async function fetchViaPubMedMany(
	ids: string[],
	options: PubMedBatchOptions,
	ctx: FetchContext
): Promise<Map<string, FetchOutcome>> {
	const results = new Map<string, FetchOutcome>();
	if (ids.length === 0) return results;

	const apiKey = ctx.settings.apiKey || '';
	let pubmedIds = ids;
	if (options.searchTerm) {
		const term = ids.map(options.searchTerm).join(' OR ');
		pubmedIds = await searchPubMedIds(term, apiKey, ctx.requestFn, String(Math.max(100, ids.length)));
		if (pubmedIds.length === 0) {
			for (const id of ids) {
				if (options.missFailure) results.set(id, { failure: options.missFailure });
			}
			return results;
		}
		await ctx.delay(NCBI_DELAY);
	}

	const records = await fetchPubMedResults(pubmedIds, apiKey, ctx.requestFn);
	for (const id of ids) {
		const record = records.find((candidate) => options.matchRecord(id, candidate));
		if (record) {
			const info = parsePubMedResult(record, record.uid ?? id, '');
			options.applyId?.(info, id);
			results.set(id, info);
		} else if (options.missFailure) {
			results.set(id, { failure: options.missFailure });
		}
	}
	return results;
}

export const pubmedProvider: ArticleProvider = {
	id: 'pubmed',
	displayName: 'PubMed',
	rateLimitDelay: NCBI_DELAY,
	scanPattern: PUBMED_URL_PATTERN,
	badge: { alt: 'PubMed', logo: 'pubmed.svg' },
	supportedArticleTypes: ['article', 'review', 'preprint', 'proceedings', 'book', 'book-chapter', 'clinical-trial', 'case-report', 'editorial', 'letter', 'news', 'dataset', 'report', 'thesis', 'guideline', 'comment', 'other'],
	citationUrl: (info) => (info.pubmedId ? pubmedUrl(info.pubmedId) : null),
	referenceForId: pubmedUrl,
	markerKey: (id) => `pubmed=${id}`,
	extractId: extractPubMedId,
	isIdCited: isPubMedIdCited,
	replaceUrl: replacePubMedUrl,
	fetch: async (id, ctx) =>
		parsePubMedResult(await fetchPubMedResult(id, ctx.settings.apiKey || '', ctx.requestFn), id, ''),
	fetchMany: (ids, ctx) =>
		fetchViaPubMedMany(
			ids,
			{ matchRecord: (id, record) => record.uid === id, missFailure: 'permanent' },
			ctx
		),
};
