import type { ArticleInfo } from '../types';
import type { FetchOutcome } from './types';
import {
	cleanDOI,
	extractArxivId,
	isArxivIdCited,
	replaceArxivUrl,
	arxivAbsUrl,
	ARXIV_REF_PATTERN,
} from '../utils';
import { fetchArxivAtom } from '../api';
import type { ArticleProvider } from './types';

const XML_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	'#39': "'",
};

function decodeXmlEntities(text: string): string {
	return text.replace(/&(#?\w+);/g, (match, entity: string) => XML_ENTITIES[entity] ?? match);
}

function extractXmlTag(xml: string, tag: string): string | undefined {
	const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`));
	if (!match) return undefined;
	const value = decodeXmlEntities(match[1].trim().replace(/\s+/g, ' '));
	return value || undefined;
}

function entryBaseId(entryXml: string): string | undefined {
	const entryId = extractXmlTag(entryXml, 'id');
	return entryId?.split('/abs/')[1]?.replace(/v\d+$/, '').toLowerCase();
}

function parseEntryXml(entryXml: string, arxivId: string): ArticleInfo {
	const title = extractXmlTag(entryXml, 'title');
	const published = extractXmlTag(entryXml, 'published');
	const journalRef = extractXmlTag(entryXml, 'arxiv:journal_ref');
	const doi = extractXmlTag(entryXml, 'arxiv:doi');

	return {
		title: title || 'No title available',
		journal: journalRef || 'arXiv preprint',
		year: published?.slice(0, 4) || 'No year available',
		arxivId: arxivId,
		doi: doi ? cleanDOI(doi) : undefined,
		articleType: 'Preprint',
	};
}

export function parseArxivFeed(xml: string, arxivIds: string[]): Map<string, ArticleInfo> {
	const wanted = new Map(arxivIds.map((id) => [id.toLowerCase(), id]));
	const results = new Map<string, ArticleInfo>();
	for (const entryXml of xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/g) ?? []) {
		const requestedId = wanted.get(entryBaseId(entryXml) ?? '');
		if (requestedId) results.set(requestedId, parseEntryXml(entryXml, requestedId));
	}
	return results;
}

export function parseArxivEntry(xml: string, arxivId: string): ArticleInfo {
	const info = parseArxivFeed(xml, [arxivId]).get(arxivId);
	if (!info) {
		throw new Error('Article not found');
	}
	return info;
}

export const arxivProvider: ArticleProvider = {
	id: 'arxiv',
	displayName: 'arXiv',
	rateLimitDelay: 3000,
	scanPattern: ARXIV_REF_PATTERN,
	badge: { alt: 'arXiv', logo: 'arxiv.svg' },
	supportedArticleTypes: ['preprint'],
	citationUrl: (info) => (info.arxivId ? arxivAbsUrl(info.arxivId) : null),
	referenceForId: arxivAbsUrl,
	markerKey: (id) => `arxiv=${id}`,
	extractId: extractArxivId,
	isIdCited: isArxivIdCited,
	replaceUrl: replaceArxivUrl,
	fetch: async (id, ctx) => parseArxivEntry(await fetchArxivAtom(id, ctx.requestFn), id),
	fetchMany: async (ids, ctx) => {
		const parsed = parseArxivFeed(await fetchArxivAtom(ids, ctx.requestFn), ids);
		const results = new Map<string, FetchOutcome>(parsed);
		for (const id of ids) {
			if (!results.has(id)) results.set(id, { failure: 'permanent' });
		}
		return results;
	},
};
