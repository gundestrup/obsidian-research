import type { ArticleInfo, FailureKind } from './types';
import { failureMarkerSymbol, renderIcon } from './icons';

const PERMANENT_MARKER = failureMarkerSymbol('permanent');
const TRANSIENT_MARKER = failureMarkerSymbol('transient');
const MARKER_SOURCE = '(?:🔴|🟡)\\([^)]*\\)';
const ICON_SOURCE = '!\\[[^\\]]*\\]\\([^)]*\\)';
const TRAILING_MARKER_PATTERN = new RegExp(`^\\s*${MARKER_SOURCE}(?:\\s*${ICON_SOURCE})?`);
const LEADING_MARKER_PATTERN = new RegExp(`${MARKER_SOURCE}\\s*(?:${ICON_SOURCE}\\s*)?$`);

export function failureMarker(markerKey: string, kind: FailureKind): string {
	return `${kind === 'permanent' ? PERMANENT_MARKER : TRANSIENT_MARKER}(${markerKey})`;
}

export function failureMarkerKind(content: string, markerKey: string): FailureKind | null {
	if (content.includes(`${PERMANENT_MARKER}(${markerKey})`)) return 'permanent';
	if (content.includes(`${TRANSIENT_MARKER}(${markerKey})`)) return 'transient';
	return null;
}

export function failureKind(error: unknown): FailureKind {
	const message = error instanceof Error ? error.message : '';
	return message === 'Article not found' || /status:\s*404/.test(message) ? 'permanent' : 'transient';
}

function replaceAnyIgnoreCase(content: string, searches: string[], replacement: string): string {
	const lowerContent = content.toLowerCase();
	const lowerSearches = searches.map((search) => search.toLowerCase());
	let result = '';
	let start = 0;

	while (start < content.length) {
		let matchIndex = -1;
		let matchLength = 0;

		for (let i = 0; i < lowerSearches.length; i++) {
			const index = lowerContent.indexOf(lowerSearches[i], start);
			if (index !== -1 && (matchIndex === -1 || index < matchIndex || (index === matchIndex && lowerSearches[i].length > matchLength))) {
				matchIndex = index;
				matchLength = lowerSearches[i].length;
			}
		}

		if (matchIndex === -1) break;
		let gap = content.slice(start, matchIndex);
		const leadingMarker = gap.match(LEADING_MARKER_PATTERN);
		if (leadingMarker) gap = gap.slice(0, gap.length - leadingMarker[0].length);
		result += gap + replacement;
		start = matchIndex + matchLength;
		const trailingMarker = content.slice(start).match(TRAILING_MARKER_PATTERN);
		if (trailingMarker) start += trailingMarker[0].length;
	}

	return result + content.slice(start);
}

function hasMarkdownLinkTo(content: string, url: string): boolean {
	const lowerContent = content.toLowerCase();
	const normalizedUrl = url.toLowerCase().replace(/\/$/, '');
	return lowerContent.includes(`](${normalizedUrl})`) || lowerContent.includes(`](${normalizedUrl}/)`);
}

const CITATION_MARKERS = ['📚', '🔗', '📄', '🔍', '[!['];

function hasCitationWithTitleAndYear(content: string, title: string, year: string): boolean {
	const lowerTitle = title.toLowerCase();
	const yearMarker = `- ${year.toLowerCase()}`;

	return content.toLowerCase().split(String.fromCharCode(10)).some((line) => {
		const markerIndex = CITATION_MARKERS.reduce((first, marker) => {
			const index = line.indexOf(marker);
			return index !== -1 && (first === -1 || index < first) ? index : first;
		}, -1);
		if (markerIndex === -1) return false;
		const titleIndex = line.indexOf(lowerTitle, markerIndex);
		return titleIndex !== -1 && line.indexOf(yearMarker, titleIndex) !== -1;
	});
}

export function isValidDOI(doi: string): boolean {
	return /^10\.\d+\/.+$/.test(doi);
}

export function cleanDOI(doi: string): string {
	return doi.replace(/^doi:\s*/i, '').trim();
}

export function extractPubMedId(input: string): string | null {
	const urlMatch = input.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
	if (urlMatch) return urlMatch[1];

	if (/^\d+$/.test(input)) return input;

	return null;
}

export function extractPMCId(input: string): string | null {
	const urlMatch = input.match(/https?:\/\/pmc\.ncbi\.nlm\.nih\.gov\/articles\/(PMC\d+)/i);
	if (urlMatch) return urlMatch[1];

	const simpleUrlMatch = input.match(/https?:\/\/pmc\.ncbi\.nlm\.nih\.gov\/(PMC\d+)/i);
	if (simpleUrlMatch) return simpleUrlMatch[1];

	const directMatch = input.match(/^PMC\d+$/);
	if (directMatch) return input;

	return null;
}

export function extractDOI(input: string): string | null {
	const lowerInput = input.toLowerCase();
	const marker = 'doi.org/';
	const markerIndex = lowerInput.indexOf(marker);

	if (markerIndex !== -1) {
		const doiStart = markerIndex + marker.length;
		const terminators = ['#', '?', ' ', String.fromCharCode(9), String.fromCharCode(10), ']', ')'];
		const endIndex = terminators.reduce((end, terminator) => {
			const index = input.indexOf(terminator, doiStart);
			return index !== -1 && index < end ? index : end;
		}, input.length);
		let doi = input.slice(doiStart, endIndex);
		if (doi.endsWith(')') || doi.endsWith('.')) {
			doi = doi.slice(0, -1);
		}
		if (isValidDOI(doi)) return doi;
	}

	if (isValidDOI(input)) return input;

	return null;
}

export function extractArxivId(input: string): string | null {
	const urlMatch = input.match(/arxiv\.org\/(?:abs|pdf)\/([a-z-]+(?:\.[a-z]{2})?\/\d{7}|\d{4}\.\d{4,6})(v\d+)?/i);
	if (urlMatch) return urlMatch[1];

	const tagMatch = input.match(/arXiv:(\d{4}\.\d{4,6})(v\d+)?/i);
	if (tagMatch) return tagMatch[1];

	const bareMatch = input.match(/^(\d{4}\.\d{4,6})(v\d+)?$/);
	if (bareMatch) return bareMatch[1];

	const oldStyleMatch = input.match(/^([a-z-]+(?:\.[a-z]{2})?\/\d{7})(v\d+)?$/i);
	if (oldStyleMatch) return oldStyleMatch[1];

	return null;
}

export function extractWosId(input: string): string | null {
	const urlMatch = input.match(/webofscience\.com\/wos\/\w+\/full-record\/(WOS:[A-Z0-9]+)/i);
	if (urlMatch) return urlMatch[1].toUpperCase();

	const tagMatch = input.match(/\b(WOS:[A-Z0-9]{15})\b/i);
	if (tagMatch) return tagMatch[1].toUpperCase();

	return null;
}

export function pubmedUrl(pubmedId: string): string {
	return `https://pubmed.ncbi.nlm.nih.gov/${pubmedId}/`;
}

export function pmcUrl(pmcId: string): string {
	return `https://pmc.ncbi.nlm.nih.gov/articles/${pmcId}/`;
}

export function doiUrl(doi: string): string {
	return `https://doi.org/${cleanDOI(doi)}`;
}

export function arxivAbsUrl(arxivId: string): string {
	return `https://arxiv.org/abs/${arxivId}`;
}

export function wosRecordUrl(wosId: string): string {
	return `https://www.webofscience.com/wos/woscc/full-record/${wosId}`;
}

export function isAlreadyCited(content: string, info: Partial<ArticleInfo>): boolean {
	if (info.pubmedId) {
		if (hasMarkdownLinkTo(content, pubmedUrl(info.pubmedId))) return true;
	}

	if (info.doi) {
		if (hasMarkdownLinkTo(content, doiUrl(info.doi))) return true;
	}

	if (info.pmcId) {
		if (hasMarkdownLinkTo(content, pmcUrl(info.pmcId))) return true;
	}

	if (info.arxivId) {
		if (hasMarkdownLinkTo(content, arxivAbsUrl(info.arxivId))) return true;
	}

	if (info.wosId) {
		if (hasMarkdownLinkTo(content, wosRecordUrl(info.wosId))) return true;
	}

	if (info.title && info.year && hasCitationWithTitleAndYear(content, info.title, info.year)) return true;

	return false;
}

const ARTICLE_TYPE_MAP: Record<string, string> = {
	// Canonical labels
	'article': 'Article',
	'journal article': 'Article',
	'journal-article': 'Article',
	'early access': 'Article',
	'multicenter study': 'Article',
	'observational study': 'Article',
	'comparative study': 'Article',
	'evaluation study': 'Article',
	'validation study': 'Article',
	'twin study': 'Article',
	'review': 'Review',
	'systematic review': 'Review',
	'scoping review': 'Review',
	'meta-analysis': 'Review',
	'preprint': 'Preprint',
	'posted-content': 'Preprint',
	'clinical trial': 'Clinical Trial',
	'randomized controlled trial': 'Clinical Trial',
	'controlled clinical trial': 'Clinical Trial',
	'pragmatic clinical trial': 'Clinical Trial',
	'adaptive clinical trial': 'Clinical Trial',
	'equivalence trial': 'Clinical Trial',
	'case reports': 'Case Report',
	'proceedings': 'Proceedings',
	'proceedings-article': 'Proceedings',
	'proceedings-series': 'Proceedings',
	'proceeding paper': 'Proceedings',
	'book': 'Book',
	'monograph': 'Book',
	'reference-book': 'Book',
	'edited-book': 'Book',
	'book-set': 'Book',
	'book-series': 'Book',
	'book chapter': 'Book Chapter',
	'book-chapter': 'Book Chapter',
	'book-part': 'Book Chapter',
	'book-section': 'Book Chapter',
	'book-track': 'Book Chapter',
	'editorial': 'Editorial',
	'editorial material': 'Editorial',
	'letter': 'Letter',
	'comment': 'Comment',
	'news': 'News',
	'news item': 'News',
	'newspaper article': 'News',
	'dataset': 'Dataset',
	'component': 'Dataset',
	'data paper': 'Dataset',
	'report': 'Report',
	'report-series': 'Report',
	'technical report': 'Report',
	'dissertation': 'Thesis',
	'guideline': 'Guideline',
	'practice guideline': 'Guideline',
	'book review': 'Other',
	'correction': 'Other',
	'retracted publication': 'Other',
	'biographical-item': 'Other',
	'meeting abstract': 'Other',
	'reference-entry': 'Other',
	'standard': 'Other',
	'standard-series': 'Other',
	'peer-review': 'Other',
	'grant': 'Other',
	'other': 'Other',
	'journal': 'Other',
	'journal-issue': 'Other',
	'journal-volume': 'Other',
};

export function normalizeArticleType(rawType: string | undefined): string | undefined {
	const trimmed = rawType?.trim();
	if (!trimmed) return undefined;
	return ARTICLE_TYPE_MAP[trimmed.toLowerCase()] ?? trimmed;
}

export function resolveArticleType(rawType: string | undefined, fallback: string): string {
	return normalizeArticleType(rawType) || fallback || 'Article';
}

export function providerIcon(alt: string, file: string): string {
	return renderIcon({ kind: 'asset', alt, file });
}

export function providerBadge(alt: string, file: string, href: string): string {
	return `[${providerIcon(alt, file)}](${href})`;
}

export const PUBMED_URL_PATTERN = /https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/\d+\/?/gi;
export const PMC_URL_PATTERN = /https?:\/\/pmc\.ncbi\.nlm\.nih\.gov\/(?:articles\/)?PMC\d+\/?/gi;
export const DOI_URL_PATTERN = /https?:\/\/(?:dx\.)?doi\.org\/10\.\d{4,9}\/[-._;()/:A-Z0-9]+(?=[\s\])]|$)/gi;
export const ARXIV_REF_PATTERN =
	/https?:\/\/arxiv\.org\/(?:abs|pdf)\/[^\s)\]]+|arXiv:\d{4}\.\d{4,6}(?:v\d+)?/gi;
export const WOS_REF_PATTERN =
	/https?:\/\/(?:www\.)?webofscience\.com\/wos\/\w+\/full-record\/WOS:[A-Z0-9]+|\bWOS:[A-Z0-9]{15}\b/gi;

export interface ExtractedURLs {
	pubmedUrls: string[];
	pmcUrls: string[];
	doiUrls: string[];
	arxivRefs: string[];
	wosRefs: string[];
}

export function extractURLs(content: string): ExtractedURLs {
	const pubmedMatches = content.match(PUBMED_URL_PATTERN) || [];
	const pmcMatches = content.match(PMC_URL_PATTERN) || [];
	const doiMatches = content.match(DOI_URL_PATTERN) || [];
	const arxivMatches = content.match(ARXIV_REF_PATTERN) || [];
	const wosMatches = content.match(WOS_REF_PATTERN) || [];

	return {
		pubmedUrls: pubmedMatches,
		pmcUrls: pmcMatches,
		doiUrls: doiMatches,
		arxivRefs: arxivMatches,
		wosRefs: wosMatches,
	};
}

export function extractUniqueIds(content: string): {
	pubmedIds: string[];
	pmcIds: string[];
	dois: string[];
	arxivIds: string[];
	wosIds: string[];
} {
	const { pubmedUrls, pmcUrls, doiUrls, arxivRefs, wosRefs } = extractURLs(content);

	const pubmedIds = [
		...new Set(pubmedUrls.map((match) => extractPubMedId(match)).filter((id): id is string => id !== null)),
	];
	const pmcIds = [
		...new Set(pmcUrls.map((match) => extractPMCId(match)).filter((id): id is string => id !== null)),
	];
	const dois = [
		...new Set(doiUrls.map((match) => extractDOI(match)).filter((id): id is string => id !== null)),
	];
	const arxivIds = [
		...new Set(arxivRefs.map((match) => extractArxivId(match)).filter((id): id is string => id !== null)),
	];
	const wosIds = [
		...new Set(wosRefs.map((match) => extractWosId(match)).filter((id): id is string => id !== null)),
	];

	return { pubmedIds, pmcIds, dois, arxivIds, wosIds };
}

export function isPubMedIdCited(content: string, pubmedId: string): boolean {
	return hasMarkdownLinkTo(content, pubmedUrl(pubmedId));
}

export function isPMCIdCited(content: string, pmcId: string): boolean {
	return hasMarkdownLinkTo(content, pmcUrl(pmcId));
}

export function isDOICited(content: string, doi: string): boolean {
	return hasMarkdownLinkTo(content, doiUrl(doi));
}

export function isArxivIdCited(content: string, arxivId: string): boolean {
	return hasMarkdownLinkTo(content, arxivAbsUrl(arxivId));
}

export function isWosIdCited(content: string, wosId: string): boolean {
	return hasMarkdownLinkTo(content, wosRecordUrl(wosId));
}

export function replacePubMedUrl(content: string, pubmedId: string, citation: string): string {
	const baseUrl = `pubmed.ncbi.nlm.nih.gov/${pubmedId}`;
	return replaceAnyIgnoreCase(
		content,
		[`https://${baseUrl}/`, `https://${baseUrl}`, `http://${baseUrl}/`, `http://${baseUrl}`],
		citation
	);
}

export function replacePMCUrl(content: string, pmcId: string, citation: string): string {
	const baseUrl = 'pmc.ncbi.nlm.nih.gov';
	const paths = [`/articles/${pmcId}`, `/${pmcId}`];
	const urls: string[] = [];
	for (const path of paths) {
		urls.push(
			`https://${baseUrl}${path}/`,
			`https://${baseUrl}${path}`,
			`http://${baseUrl}${path}/`,
			`http://${baseUrl}${path}`
		);
	}
	return replaceAnyIgnoreCase(content, urls, citation);
}

export function replaceDOIUrl(content: string, doi: string, citation: string): string {
	const doiPath = `/${doi}`;
	return replaceAnyIgnoreCase(content, [`https://dx.doi.org${doiPath}`, `https://doi.org${doiPath}`], citation);
}

export function replaceArxivUrl(content: string, arxivId: string, citation: string): string {
	const baseUrl = `arxiv.org`;
	const urls: string[] = [];
	for (const path of [`/abs/${arxivId}`, `/pdf/${arxivId}`]) {
		urls.push(`https://${baseUrl}${path}/`, `https://${baseUrl}${path}`, `http://${baseUrl}${path}/`, `http://${baseUrl}${path}`);
	}
	urls.push(`arXiv:${arxivId}`);
	return replaceAnyIgnoreCase(content, urls, citation);
}

export function replaceWosUrl(content: string, wosId: string, citation: string): string {
	const urlRegex = new RegExp(
		`(${MARKER_SOURCE}\\s*(?:${ICON_SOURCE}\\s*)?)?https?:\\/\\/(?:www\\.)?webofscience\\.com\\/wos\\/\\w+\\/full-record\\/${wosId}\\/?(\\s*${MARKER_SOURCE})?`,
		'gi'
	);
	return replaceAnyIgnoreCase(content.replace(urlRegex, citation), [wosId], citation);
}
