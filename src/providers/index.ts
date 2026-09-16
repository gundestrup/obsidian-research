import { pubmedProvider } from './pubmed';
import { pmcProvider } from './pmc';
import { doiProvider } from './doi';
import { arxivProvider } from './arxiv';
import { wosProvider } from './wos';
import type { ArticleProvider } from './types';

export type { ArticleProvider, FetchContext, FetchOutcome } from './types';
export { isArticleInfo } from './types';
export { pubmedProvider, parsePubMedResult, fetchViaPubMed, fetchViaPubMedMany } from './pubmed';
export { pmcProvider } from './pmc';
export { doiProvider, parseCrossRefMessage } from './doi';
export { arxivProvider, parseArxivEntry, parseArxivFeed } from './arxiv';
export { wosProvider, parseWosDocument } from './wos';

export const PROVIDERS: ArticleProvider[] = [
	pubmedProvider,
	pmcProvider,
	doiProvider,
	arxivProvider,
	wosProvider,
];

// Citation badge display order — primary link wins; differs from registry dispatch order on purpose
export const CITATION_ORDER: ArticleProvider[] = [
	pubmedProvider,
	arxivProvider,
	wosProvider,
	pmcProvider,
	doiProvider,
];

export function collectProviderIds(content: string): Map<ArticleProvider, string[]> {
	const found = new Map<ArticleProvider, string[]>();
	for (const provider of PROVIDERS) {
		const matches = content.match(provider.scanPattern) ?? [];
		const ids = [
			...new Set(
				matches
					.map((match) => provider.extractId(match))
					.filter((id): id is string => id !== null)
			),
		];
		if (ids.length > 0) found.set(provider, ids);
	}
	return found;
}
