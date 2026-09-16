import type { ArticleInfo, FailureKind, ResearchArticleFetcherSettings } from '../types';
import type { ArticleTypeKey } from '../icons';
import type { RequestFunction } from '../api';

export type FetchOutcome = ArticleInfo | { failure: FailureKind };

export function isArticleInfo(outcome: FetchOutcome | undefined): outcome is ArticleInfo {
	return !!outcome && 'title' in outcome;
}

export interface FetchContext {
	settings: ResearchArticleFetcherSettings;
	requestFn: RequestFunction;
	delay: (ms: number) => Promise<void>;
}

export interface ArticleProvider {
	readonly id: string;
	readonly displayName: string;
	/** Minimum delay between requests during batch processing (ms) */
	readonly rateLimitDelay: number;
	/** Matches this provider's references (URLs or tags) in note content */
	readonly scanPattern: RegExp;
	/** Citation badge — logo file in assets/ and accessible alt text */
	readonly badge: { alt: string; logo: string };
	/** Canonical article types this provider can translate */
	readonly supportedArticleTypes: readonly ArticleTypeKey[];
	/** Canonical record URL for this provider from an ArticleInfo, or null when absent */
	citationUrl(info: ArticleInfo): string | null;
	/** Reference text kept next to a failure marker — must be re-scannable by scanPattern */
	referenceForId(id: string): string;
	/** Key embedded in a failure marker — must never match scanPattern itself */
	markerKey(id: string): string;
	extractId(input: string): string | null;
	isIdCited(content: string, id: string): boolean;
	replaceUrl(content: string, id: string, citation: string): string;
	/** Fetches the provider-native payload and translates it to a uniform ArticleInfo */
	fetch(id: string, ctx: FetchContext): Promise<ArticleInfo | null>;
	/** Optional batch fetch — collapses multiple IDs into one request where the API supports it */
	fetchMany?(ids: string[], ctx: FetchContext): Promise<Map<string, FetchOutcome>>;
}

export const NCBI_DELAY = 350;
