import type { Plugin } from 'obsidian';

export interface RequestUrlResponse {
	status: number;
	json: unknown;
	text?: string;
}

export interface ArticleId {
	idtype: string;
	value: string;
}

export interface PubMedResult {
	uid?: string;
	title?: string;
	source?: string;
	fulljournalname?: string;
	pubdate?: string;
	doi?: string;
	elocationid?: string;
	articleids?: ArticleId[];
	pubtype?: string[];
}

export interface PubMedSearchResponse {
	esearchresult?: {
		idlist?: string[];
		count?: string;
	};
}

export interface PubMedApiResponse {
	result?: {
		uids?: string[];
		[key: string]: PubMedResult | string[] | undefined;
	};
}

export interface CrossRefMessage {
	title?: string[];
	'short-container-title'?: string[];
	'container-title'?: string[];
	created?: {
		'date-parts'?: number[][];
	};
	type?: string;
}

export interface CrossRefResponse {
	message?: CrossRefMessage;
}

export interface WosDocument {
	uid?: string;
	title?: string;
	types?: string[];
	source?: {
		sourceTitle?: string;
		publishYear?: number;
	};
	identifiers?: {
		doi?: string;
		pmid?: string;
	};
}

export type FailureKind = 'permanent' | 'transient';

export interface ResearchArticleFetcherSettings {
	apiKey?: string;
	wosApiKey?: string;
	articleType?: string;
	enableGlobalCommand?: boolean;
	enableFailureIndex?: boolean;
	failureIndexFilename?: string;
}

export interface ArticleInfo {
	title: string;
	journal: string;
	year: string;
	pubmedId?: string;
	doi?: string;
	pmcId?: string;
	arxivId?: string;
	wosId?: string;
	articleType?: string;
}

export interface PluginSettingsHolder extends Plugin {
	settings: ResearchArticleFetcherSettings;
	saveSettings(): Promise<void>;
}

export const DEFAULT_SETTINGS: ResearchArticleFetcherSettings = {
	apiKey: '',
	wosApiKey: '',
	articleType: 'Article',
	enableGlobalCommand: false,
	enableFailureIndex: false,
	failureIndexFilename: 'research-article-unmatched.md',
};
