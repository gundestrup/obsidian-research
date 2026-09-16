import {
	extractPMCId,
	isPMCIdCited,
	replacePMCUrl,
	pmcUrl,
	PMC_URL_PATTERN,
} from '../utils';
import { findPubMedIdFromPMC } from '../api';
import { NCBI_DELAY, type ArticleProvider } from './types';
import { fetchViaPubMed, fetchViaPubMedMany, recordHasArticleId } from './pubmed';

export const pmcProvider: ArticleProvider = {
	id: 'pmc',
	displayName: 'PubMed Central',
	rateLimitDelay: NCBI_DELAY,
	scanPattern: PMC_URL_PATTERN,
	badge: { alt: 'PMC', logo: 'pmc.svg' },
	supportedArticleTypes: ['article', 'review', 'preprint', 'proceedings', 'book', 'book-chapter', 'clinical-trial', 'case-report', 'editorial', 'letter', 'news', 'dataset', 'report', 'thesis', 'guideline', 'comment', 'other'],
	citationUrl: (info) => (info.pmcId ? pmcUrl(info.pmcId) : null),
	referenceForId: pmcUrl,
	markerKey: (id) => `pmc=${id}`,
	extractId: extractPMCId,
	isIdCited: isPMCIdCited,
	replaceUrl: replacePMCUrl,
	fetch: async (id, ctx) => {
		const info = await fetchViaPubMed(id, findPubMedIdFromPMC, ctx);
		if (info) info.pmcId = id;
		return info;
	},
	fetchMany: (ids, ctx) =>
		fetchViaPubMedMany(
			ids,
			{
				searchTerm: (id) => `"${id}"[pmcid]`,
				matchRecord: (id, record) => recordHasArticleId(record, 'pmc', id),
				applyId: (info, id) => {
					info.pmcId = id;
				},
				missFailure: 'permanent',
			},
			ctx
		),
};
