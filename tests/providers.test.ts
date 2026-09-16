/**
 * Unit tests for the provider registry, translation layers, and fetch chains
 */

import { describe, it, expect, vi } from 'vitest';
import {
	PROVIDERS,
	CITATION_ORDER,
	collectProviderIds,
	pubmedProvider,
	pmcProvider,
	doiProvider,
	arxivProvider,
	wosProvider,
	parsePubMedResult,
	parseCrossRefMessage,
	parseArxivEntry,
	parseArxivFeed,
	parseWosDocument,
	isArticleInfo,
	type FetchContext,
	type FetchOutcome,
} from '../src/providers';
import type { ArticleInfo, RequestUrlResponse } from '../src/types';
import type { RequestFunction } from '../src/api';
import { fetchViaPubMedMany, recordHasArticleId } from '../src/providers/pubmed';
import { failureMarker, providerIcon } from '../src/utils';

function makeCtx(responses: RequestUrlResponse[]): FetchContext {
	const requestFn = vi.fn<RequestFunction>();
	for (const response of responses) {
		requestFn.mockResolvedValueOnce(response);
	}
	return {
		settings: { apiKey: '', wosApiKey: 'wos-key', articleType: 'Article' },
		requestFn,
		delay: () => Promise.resolve(),
	};
}

function infoOf(outcomes: Map<string, FetchOutcome> | undefined, id: string): ArticleInfo | undefined {
	const outcome = outcomes?.get(id);
	return isArticleInfo(outcome) ? outcome : undefined;
}

function failureOf(outcomes: Map<string, FetchOutcome> | undefined, id: string): string | undefined {
	const outcome = outcomes?.get(id);
	return outcome && !isArticleInfo(outcome) ? outcome.failure : undefined;
}

const pubmedResponse: RequestUrlResponse = {
	status: 200,
	json: {
		result: {
			'38570095': {
				title: 'Test Article',
				source: 'Test Journal',
				pubdate: '2024 Jan',
				pubtype: ['Article'],
			},
		},
	},
};

describe('PROVIDERS registry', () => {
	it('should contain all five providers in dispatch order', () => {
		expect(PROVIDERS.map((p) => p.id)).toEqual(['pubmed', 'pmc', 'doi', 'arxiv', 'wos']);
	});

	it('should expose unique ids and required members', () => {
		for (const provider of PROVIDERS) {
			expect(provider.displayName).toBeTruthy();
			expect(provider.scanPattern).toBeInstanceOf(RegExp);
			expect(typeof provider.extractId).toBe('function');
			expect(typeof provider.fetch).toBe('function');
		}
	});

	it('should give every provider a badge and citationUrl', () => {
		for (const provider of PROVIDERS) {
			expect(provider.badge.alt).toBeTruthy();
			expect(provider.badge.logo).toMatch(/\.(svg|png)$/);
			expect(typeof provider.citationUrl).toBe('function');
			expect(provider.supportedArticleTypes.length).toBeGreaterThan(0);
		}
		expect(arxivProvider.supportedArticleTypes).toEqual(['preprint']);
	});

	it('should return each provider\'s canonical URL when its id is present', () => {
		const info = { title: 'T', journal: 'J', year: '2024' };
		expect(pubmedProvider.citationUrl({ ...info, pubmedId: '123' })).toBe(
			'https://pubmed.ncbi.nlm.nih.gov/123/'
		);
		expect(pmcProvider.citationUrl({ ...info, pmcId: 'PMC123' })).toBe(
			'https://pmc.ncbi.nlm.nih.gov/articles/PMC123/'
		);
		expect(doiProvider.citationUrl({ ...info, doi: '10.1234/test' })).toBe(
			'https://doi.org/10.1234/test'
		);
		expect(arxivProvider.citationUrl({ ...info, arxivId: '2609.12218' })).toBe(
			'https://arxiv.org/abs/2609.12218'
		);
		expect(wosProvider.citationUrl({ ...info, wosId: 'WOS:001607817500001' })).toBe(
			'https://www.webofscience.com/wos/woscc/full-record/WOS:001607817500001'
		);
	});

	it('should return null when the provider id is absent', () => {
		const info = { title: 'T', journal: 'J', year: '2024' };
		for (const provider of PROVIDERS) {
			expect(provider.citationUrl(info)).toBeNull();
		}
	});

	it('doi citationUrl should clean the doi', () => {
		const info = { title: 'T', journal: 'J', year: '2024', doi: 'doi: 10.1234/test ' };
		expect(doiProvider.citationUrl(info)).toBe('https://doi.org/10.1234/test');
	});

	it('should expose a re-scannable failure-marker reference per provider', () => {
		const knownIds: Record<string, string> = {
			pubmed: '38570095',
			pmc: 'PMC6792392',
			doi: '10.1016/j.clinme.2024.100038',
			arxiv: '2609.12218',
			wos: 'WOS:001607817500001',
		};
		for (const provider of PROVIDERS) {
			const id = knownIds[provider.id];
			const marked = [
				failureMarker(provider.markerKey(id), 'permanent'),
				providerIcon(provider.badge.alt, provider.badge.logo),
				provider.referenceForId(id),
			].join(' ');
			const match = marked.match(provider.scanPattern)?.[0];
			expect(provider.extractId(match ?? '')).toBe(id);
			expect(provider.markerKey(id).match(provider.scanPattern)).toBeNull();
		}
	});

	it('CITATION_ORDER should cover every provider exactly once', () => {
		expect(CITATION_ORDER.map((p) => p.id).sort()).toEqual(
			PROVIDERS.map((p) => p.id).sort()
		);
	});

	it('arXiv should enforce a slower rate limit than the other providers', () => {
		expect(arxivProvider.rateLimitDelay).toBeGreaterThanOrEqual(3000);
		for (const provider of PROVIDERS) {
			if (provider !== arxivProvider) {
				expect(provider.rateLimitDelay).toBeLessThan(arxivProvider.rateLimitDelay);
			}
		}
	});
});

describe('collectProviderIds', () => {
	it('should map found IDs to their providers', () => {
		const content = `
			https://pubmed.ncbi.nlm.nih.gov/38570095/
			https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/
			https://doi.org/10.1016/j.clinme.2024.100038
			https://arxiv.org/abs/2609.12218
			WOS:001607817500001
		`;
		const found = collectProviderIds(content);
		expect(found.get(pubmedProvider)).toEqual(['38570095']);
		expect(found.get(pmcProvider)).toEqual(['PMC6792392']);
		expect(found.get(doiProvider)).toEqual(['10.1016/j.clinme.2024.100038']);
		expect(found.get(arxivProvider)).toEqual(['2609.12218']);
		expect(found.get(wosProvider)).toEqual(['WOS:001607817500001']);
	});

	it('should return an empty map for content without references', () => {
		expect(collectProviderIds('no links here').size).toBe(0);
	});

	it('should not confuse arXiv-style DOIs with arXiv references', () => {
		const found = collectProviderIds('https://doi.org/10.48550/arXiv.2609.12218');
		expect(found.get(doiProvider)).toEqual(['10.48550/arXiv.2609.12218']);
		expect(found.has(arxivProvider)).toBe(false);
	});
});

describe('parsePubMedResult', () => {
	it('should parse a complete PubMed result', () => {
		const result = {
			title: 'Test Article',
			source: 'Test Journal',
			pubdate: '2024 Jan',
			doi: '10.1234/test',
			articleids: [
				{ idtype: 'pmc', value: 'PMC1234567' },
			],
			pubtype: ['Review'],
		};

		const info = parsePubMedResult(result, '38570095', 'Article');
		expect(info.title).toBe('Test Article');
		expect(info.journal).toBe('Test Journal');
		expect(info.year).toBe('2024');
		expect(info.pubmedId).toBe('38570095');
		expect(info.doi).toBe('10.1234/test');
		expect(info.pmcId).toBe('PMC1234567');
		expect(info.articleType).toBe('Review');
	});

	it('should leave pmcId empty when articleids has no pmc entry', () => {
		const result = {
			title: 'Test Article',
			source: 'Test Journal',
			pubdate: '2024 Jan',
			articleids: [{ idtype: 'doi', value: '10.1234/test' }],
		};

		const info = parsePubMedResult(result, '38570095', 'Article');
		expect(info.pmcId).toBe('');
		expect(info.doi).toBe('10.1234/test');
	});

	it('should extract DOI from articleids when not in top-level field', () => {
		const result = {
			title: 'Test',
			source: 'Journal',
			pubdate: '2023',
			articleids: [
				{ idtype: 'doi', value: 'doi: 10.5678/article' },
				{ idtype: 'pmc', value: '9876543' },
			],
			pubtype: ['Journal Article'],
		};

		const info = parsePubMedResult(result, '12345', 'Article');
		expect(info.doi).toBe('10.5678/article');
		expect(info.pmcId).toBe('PMC9876543');
	});

	it('should use default article type when pubtype is empty', () => {
		const result = {
			title: 'Test',
			source: 'Journal',
			pubdate: '2024',
		};

		const info = parsePubMedResult(result, '12345', 'Review');
		expect(info.articleType).toBe('Review');
	});

	it('should handle missing fields with defaults', () => {
		const result = {};

		const info = parsePubMedResult(result, '12345', 'Article');
		expect(info.title).toBe('No title available');
		expect(info.journal).toBe('No journal available');
		expect(info.year).toBe('No year available');
	});

	it('should clean doi: prefix from top-level doi field', () => {
		const result = {
			title: 'Test',
			source: 'Journal',
			pubdate: '2024',
			doi: 'doi: 10.1234/test',
		};

		const info = parsePubMedResult(result, '12345', 'Article');
		expect(info.doi).toBe('10.1234/test');
	});

	it('should clean doi: prefix from elocationid field', () => {
		const result = {
			title: 'Test',
			source: 'Journal',
			pubdate: '2024',
			elocationid: 'doi: 10.5678/article',
		};

		const info = parsePubMedResult(result, '12345', 'Article');
		expect(info.doi).toBe('10.5678/article');
	});

	it('should trim whitespace from top-level doi', () => {
		const result = {
			title: 'Test',
			source: 'Journal',
			pubdate: '2024',
			doi: '  10.1234/test  ',
		};

		const info = parsePubMedResult(result, '12345', 'Article');
		expect(info.doi).toBe('10.1234/test');
	});
});

describe('parseCrossRefMessage', () => {
	it('should translate a CrossRef message to ArticleInfo', () => {
		const message = {
			title: ['DOI Article Title'],
			'short-container-title': ['Test Journal'],
			created: { 'date-parts': [[2024, 3, 15]] },
			type: 'journal-article',
		};

		const info = parseCrossRefMessage(message, '10.1234/test', 'Article');
		expect(info.title).toBe('DOI Article Title');
		expect(info.journal).toBe('Test Journal');
		expect(info.year).toBe('2024');
		expect(info.doi).toBe('10.1234/test');
		expect(info.articleType).toBe('Article');
	});

	it('should fall back to container-title when short-container-title is missing', () => {
		const message = {
			title: ['Test'],
			'container-title': ['Full Journal Name'],
			created: { 'date-parts': [[2023]] },
		};

		const info = parseCrossRefMessage(message, '10.1234/test', 'Article');
		expect(info.journal).toBe('Full Journal Name');
	});

	it('should fall back to defaults when message fields are missing', () => {
		const info = parseCrossRefMessage({}, '10.1234/test', 'Article');

		expect(info.title).toBe('No title available');
		expect(info.journal).toBe('No journal available');
		expect(info.year).toBe('No year available');
		expect(info.articleType).toBe('Article');
	});

	it('should use Article when type and defaultArticleType are both missing', () => {
		const info = parseCrossRefMessage({}, '10.1234/test', '');
		expect(info.articleType).toBe('Article');
	});
});

describe('parseArxivEntry', () => {
	const atomXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
	<title>ArXiv Query: id_list=2609.12218</title>
	<entry>
		<id>http://arxiv.org/abs/2609.12218v1</id>
		<published>2026-09-10T17:00:00Z</published>
		<title>Test
			Preprint   Title</title>
		<author><name>Jane Doe</name></author>
		<arxiv:journal_ref>Phys. Rev. Lett. 130, 12345 (2026)</arxiv:journal_ref>
		<arxiv:doi>10.1103/test.123</arxiv:doi>
	</entry>
</feed>`;

	it('should parse a complete arXiv Atom entry', () => {
		const info = parseArxivEntry(atomXml, '2609.12218');
		expect(info.title).toBe('Test Preprint Title');
		expect(info.journal).toBe('Phys. Rev. Lett. 130, 12345 (2026)');
		expect(info.year).toBe('2026');
		expect(info.arxivId).toBe('2609.12218');
		expect(info.doi).toBe('10.1103/test.123');
		expect(info.articleType).toBe('Preprint');
	});

	it('should fall back to arXiv preprint when journal_ref is missing', () => {
		const xml = `<feed xmlns:arxiv="http://arxiv.org/schemas/atom"><entry>
			<id>http://arxiv.org/abs/2609.12218v1</id>
			<published>2026-01-01T00:00:00Z</published>
			<title>Solo Preprint</title>
		</entry></feed>`;
		const info = parseArxivEntry(xml, '2609.12218');
		expect(info.journal).toBe('arXiv preprint');
		expect(info.doi).toBeUndefined();
	});

	it('should decode XML entities in the title', () => {
		const xml = `<feed><entry>
			<id>http://arxiv.org/abs/2609.12218v1</id>
			<published>2026-01-01T00:00:00Z</published>
			<title>A &amp; B &lt;study&gt; &#39;quoted&#39;</title>
		</entry></feed>`;
		const info = parseArxivEntry(xml, '2609.12218');
		expect(info.title).toBe(`A & B <study> 'quoted'`);
	});

	it('should use defaults for empty fields and preserve unknown XML entities', () => {
		const xml = `<feed><entry>
			<id>http://arxiv.org/abs/2609.12218v1</id>
			<title>   </title>
			<published>   </published>
		</entry></feed>`;
		const info = parseArxivEntry(xml, '2609.12218');
		expect(info.title).toBe('No title available');
		expect(info.year).toBe('No year available');

		const entityXml = `<feed><entry>
			<id>http://arxiv.org/abs/2609.12218v1</id>
			<title>A &unknown; title</title>
		</entry></feed>`;
		expect(parseArxivEntry(entityXml, '2609.12218').title).toBe('A &unknown; title');
	});

	it('should throw when the feed has no entry', () => {
		const xml = `<feed><title>ArXiv Query</title></feed>`;
		expect(() => parseArxivEntry(xml, '2609.12218')).toThrow('Article not found');
	});

	it('should throw when the entry is an error response without an abs id', () => {
		const xml = `<feed><entry>
			<title>Error</title>
			<summary>incorrect id format</summary>
		</entry></feed>`;
		expect(() => parseArxivEntry(xml, 'bad-id')).toThrow('Article not found');
	});

	it('should throw when the returned entry is for a different arXiv id', () => {
		const xml = `<feed><entry>
			<id>http://arxiv.org/abs/1111.22222v1</id>
			<published>2024-01-01T00:00:00Z</published>
			<title>Other Paper</title>
		</entry></feed>`;
		expect(() => parseArxivEntry(xml, '2609.12218')).toThrow('Article not found');
	});

	it('should match old-style identifiers in the entry id', () => {
		const xml = `<feed><entry>
			<id>http://arxiv.org/abs/hep-th/9901001v2</id>
			<published>1999-01-05T00:00:00Z</published>
			<title>Legacy Paper</title>
		</entry></feed>`;
		const info = parseArxivEntry(xml, 'hep-th/9901001');
		expect(info.arxivId).toBe('hep-th/9901001');
		expect(info.title).toBe('Legacy Paper');
	});
});

describe('parseArxivFeed', () => {
	it('should map multiple entries to their requested ids and skip errors', () => {
		const xml = `<feed>
			<entry>
				<id>http://arxiv.org/abs/2609.12218v1</id>
				<published>2026-09-10T00:00:00Z</published>
				<title>First Preprint</title>
			</entry>
			<entry>
				<id>http://arxiv.org/abs/1234.56789v3</id>
				<published>2023-05-01T00:00:00Z</published>
				<title>Second Preprint</title>
			</entry>
			<entry>
				<title>Error</title>
				<summary>incorrect id format</summary>
			</entry>
		</feed>`;

		const results = parseArxivFeed(xml, ['2609.12218', '1234.56789', 'bad-id']);
		expect(results.size).toBe(2);
		expect(results.get('2609.12218')?.title).toBe('First Preprint');
		expect(results.get('1234.56789')?.title).toBe('Second Preprint');
		expect(results.get('1234.56789')?.year).toBe('2023');
		expect(results.has('bad-id')).toBe(false);
	});

	it('should return an empty map when no entries match', () => {
		const xml = '<feed><entry><id>http://arxiv.org/abs/9999.99999v1</id><published>2020-01-01T00:00:00Z</published><title>X</title></entry></feed>';
		expect(parseArxivFeed(xml, ['2609.12218']).size).toBe(0);
	});
});

describe('parseWosDocument', () => {
	it('should translate a WoS document to ArticleInfo', () => {
		const doc = {
			uid: 'WOS:001607817500001',
			title: 'Test WoS Article',
			types: ['Article'],
			source: { sourceTitle: 'Nature', publishYear: 2024 },
			identifiers: { doi: '10.1038/test.456', pmid: '38570095' },
		};

		const info = parseWosDocument(doc, 'WOS:001607817500001', 'Article');
		expect(info.title).toBe('Test WoS Article');
		expect(info.journal).toBe('Nature');
		expect(info.year).toBe('2024');
		expect(info.wosId).toBe('WOS:001607817500001');
		expect(info.doi).toBe('10.1038/test.456');
		expect(info.pubmedId).toBe('38570095');
		expect(info.articleType).toBe('Article');
	});

	it('should throw when the document has no title', () => {
		expect(() => parseWosDocument({}, 'WOS:001607817500001', 'Article')).toThrow('Article not found');
		expect(() => parseWosDocument(null, 'WOS:001607817500001', 'Article')).toThrow('Article not found');
	});

	it('should fall back to defaults for missing fields', () => {
		const info = parseWosDocument({ title: 'Only Title' }, 'WOS:001607817500001', 'Review');
		expect(info.journal).toBe('No journal available');
		expect(info.year).toBe('No year available');
		expect(info.doi).toBeUndefined();
		expect(info.articleType).toBe('Review');
	});
});

describe('shared PubMed batch helper', () => {
	it('returns an empty map without making a request for empty input', async () => {
		const ctx = makeCtx([]);
		expect(await fetchViaPubMedMany([], { matchRecord: () => true }, ctx)).toEqual(new Map());
		expect(ctx.requestFn).not.toHaveBeenCalled();
	});

	it('uses the requested ID when a PubMed record has no uid', async () => {
		const ctx = makeCtx([
			{ status: 200, json: { result: { '12345': { title: 'No uid', source: 'J', pubdate: '2024' } } } },
		]);
		const results = await fetchViaPubMedMany(
			['12345'],
			{ matchRecord: () => true },
			ctx
		);
		expect(infoOf(results, '12345')?.pubmedId).toBe('12345');
	});

	it('returns no failures when a search has no hits and no miss failure is configured', async () => {
		const ctx = makeCtx([{ status: 200, json: { esearchresult: { idlist: [] } } }]);
		const results = await fetchViaPubMedMany(
			['PMC9999999'],
			{ searchTerm: (id) => `"${id}"[pmcid]`, matchRecord: () => true },
			ctx
		);
		expect(results).toEqual(new Map());
	});

	it('marks every requested id when a search has no hits and misses are permanent', async () => {
		const ctx = makeCtx([{ status: 200, json: { esearchresult: { idlist: [] } } }]);
		const results = await fetchViaPubMedMany(
			['PMC9999999'],
			{
				searchTerm: (id) => `"${id}"[pmcid]`,
				matchRecord: () => true,
				missFailure: 'permanent',
			},
			ctx
		);
		expect(failureOf(results, 'PMC9999999')).toBe('permanent');
	});

	it('matches article IDs and rejects a different article-id type', () => {
		expect(recordHasArticleId({ articleids: [{ idtype: 'pmc', value: 'PMC123' }] }, 'doi', 'PMC123')).toBe(false);
		expect(recordHasArticleId({}, 'pmc', 'PMC123')).toBe(false);
	});
});

describe('provider fetch chains', () => {
	it('pubmed provider fetches and translates a single result', async () => {
		const ctx = makeCtx([pubmedResponse]);
		const info = await pubmedProvider.fetch('38570095', ctx);
		expect(info?.pubmedId).toBe('38570095');
		expect(info?.title).toBe('Test Article');
	});

	it('pmc provider resolves via PubMed and merges the PMC id', async () => {
		const ctx = makeCtx([
			{ status: 200, json: { esearchresult: { idlist: ['38570095'] } } },
			pubmedResponse,
		]);
		const info = await pmcProvider.fetch('PMC6792392', ctx);
		expect(info?.pubmedId).toBe('38570095');
		expect(info?.pmcId).toBe('PMC6792392');
		expect(ctx.requestFn).toHaveBeenCalledTimes(2);
	});

	it('pmc provider returns null when no PubMed mapping exists', async () => {
		const ctx = makeCtx([{ status: 200, json: { esearchresult: { idlist: [] } } }]);
		const info = await pmcProvider.fetch('PMC9999999', ctx);
		expect(info).toBeNull();
	});

	it('doi provider resolves via PubMed when a mapping exists', async () => {
		const ctx = makeCtx([
			{ status: 200, json: { esearchresult: { idlist: ['38570095'] } } },
			pubmedResponse,
		]);
		const info = await doiProvider.fetch('10.1234/test', ctx);
		expect(info?.pubmedId).toBe('38570095');
		expect(info?.doi).toBe('10.1234/test');
	});

	it('doi provider falls back to CrossRef', async () => {
		const ctx = makeCtx([
			{ status: 200, json: { esearchresult: { idlist: [] } } },
			{
				status: 200,
				json: {
					message: {
						title: ['CrossRef Title'],
						'container-title': ['CrossRef Journal'],
						created: { 'date-parts': [[2024]] },
					},
				},
			},
		]);
		ctx.settings.articleType = '';
		const info = await doiProvider.fetch('10.1234/test', ctx);
		expect(info?.title).toBe('CrossRef Title');
		expect(info?.doi).toBe('10.1234/test');
	});

	it('arxiv provider fetches and translates the Atom entry', async () => {
		const ctx = makeCtx([
			{
				status: 200,
				json: undefined,
				text: '<feed><entry><id>http://arxiv.org/abs/2609.12218v1</id><published>2026-09-10T00:00:00Z</published><title>Pre</title></entry></feed>',
			},
		]);
		const info = await arxivProvider.fetch('2609.12218', ctx);
		expect(info?.arxivId).toBe('2609.12218');
		expect(info?.articleType).toBe('Preprint');
	});

	it('arxiv provider fetches multiple ids in one request', async () => {
		const ctx = makeCtx([
			{
				status: 200,
				json: undefined,
				text: `<feed>
					<entry><id>http://arxiv.org/abs/2609.12218v1</id><published>2026-09-10T00:00:00Z</published><title>First</title></entry>
					<entry><id>http://arxiv.org/abs/1234.56789v1</id><published>2023-01-01T00:00:00Z</published><title>Second</title></entry>
				</feed>`,
			},
		]);
		const results = await arxivProvider.fetchMany?.(['2609.12218', '1234.56789'], ctx);
		expect(ctx.requestFn).toHaveBeenCalledTimes(1);
		expect(results?.size).toBe(2);
		expect(infoOf(results, '2609.12218')?.title).toBe('First');
		expect(infoOf(results, '1234.56789')?.title).toBe('Second');
	});

	it('arxiv provider marks unmatched ids as permanent failures', async () => {
		const ctx = makeCtx([
			{
				status: 200,
				json: undefined,
				text: `<feed>
					<entry><id>http://arxiv.org/abs/2609.12218v1</id><published>2026-09-10T00:00:00Z</published><title>First</title></entry>
				</feed>`,
			},
		]);
		const results = await arxivProvider.fetchMany?.(['2609.12218', '9999.99999'], ctx);
		expect(infoOf(results, '2609.12218')?.title).toBe('First');
		expect(failureOf(results, '9999.99999')).toBe('permanent');
	});

	it('pubmed provider fetches multiple ids in one request', async () => {
		const ctx = makeCtx([
			{
				status: 200,
				json: {
					result: {
						uids: ['38570095', '36789012'],
						'38570095': { uid: '38570095', title: 'First', source: 'J', pubdate: '2024 Jan' },
						'36789012': { uid: '36789012', title: 'Second', source: 'J', pubdate: '2023 Feb' },
					},
				},
			},
		]);
		const results = await pubmedProvider.fetchMany?.(['38570095', '36789012'], ctx);
		expect(ctx.requestFn).toHaveBeenCalledTimes(1);
		expect(results?.size).toBe(2);
		expect(infoOf(results, '38570095')?.title).toBe('First');
		expect(infoOf(results, '36789012')?.pubmedId).toBe('36789012');
	});

	it('pmc provider resolves multiple ids with two requests', async () => {
		const ctx = makeCtx([
			{ status: 200, json: { esearchresult: { idlist: ['30321896', '38293938'] } } },
			{
				status: 200,
				json: {
					result: {
						uids: ['30321896', '38293938'],
						'30321896': {
							uid: '30321896',
							title: 'A',
							articleids: [{ idtype: 'pmc', value: 'PMC6792392' }],
						},
						'38293938': {
							uid: '38293938',
							title: 'B',
							articleids: [{ idtype: 'pmc', value: 'PMC11056128' }],
						},
					},
				},
			},
		]);
		const results = await pmcProvider.fetchMany?.(['PMC6792392', 'PMC11056128'], ctx);
		expect(ctx.requestFn).toHaveBeenCalledTimes(2);
		expect(infoOf(results, 'PMC6792392')?.title).toBe('A');
		expect(infoOf(results, 'PMC6792392')?.pmcId).toBe('PMC6792392');
		expect(infoOf(results, 'PMC11056128')?.pubmedId).toBe('38293938');
	});

	it('pmc provider batch marks unmatched ids as permanent failures', async () => {
		const ctx = makeCtx([
			{ status: 200, json: { esearchresult: { idlist: ['30321896'] } } },
			{
				status: 200,
				json: {
					result: {
						uids: ['30321896'],
						'30321896': {
							uid: '30321896',
							title: 'A',
							articleids: [{ idtype: 'pmc', value: 'PMC6792392' }],
						},
					},
				},
			},
		]);
		const results = await pmcProvider.fetchMany?.(['PMC6792392', 'PMC9999999'], ctx);
		expect(infoOf(results, 'PMC6792392')?.title).toBe('A');
		expect(failureOf(results, 'PMC9999999')).toBe('permanent');
	});

	it('doi provider batch resolves pubmed hits and falls back to crossref', async () => {
		const ctx = makeCtx([
			{ status: 200, json: { esearchresult: { idlist: ['38570095'] } } },
			{
				status: 200,
				json: {
					result: {
						uids: ['38570095'],
						'38570095': {
							uid: '38570095',
							title: 'PubMed hit',
							articleids: [{ idtype: 'doi', value: '10.1234/hit' }],
						},
					},
				},
			},
			{
				status: 200,
				json: {
					message: {
						title: ['CrossRef hit'],
						'container-title': ['J'],
						created: { 'date-parts': [[2020]] },
						type: 'journal-article',
					},
				},
			},
		]);
		ctx.settings.articleType = '';
		const results = await doiProvider.fetchMany?.(['10.1234/hit', '10.1234/miss'], ctx);
		expect(ctx.requestFn).toHaveBeenCalledTimes(3);
		expect(infoOf(results, '10.1234/hit')?.pubmedId).toBe('38570095');
		expect(infoOf(results, '10.1234/hit')?.doi).toBe('10.1234/hit');
		expect(infoOf(results, '10.1234/miss')?.title).toBe('CrossRef hit');
	});

	it('doi provider batch classifies crossref failures by kind', async () => {
		const ctx = makeCtx([
			{ status: 200, json: { esearchresult: { idlist: [] } } },
			{ status: 500, json: {} },
			{ status: 404, json: {} },
			{
				status: 200,
				json: {
					message: {
						title: ['OK'],
						'container-title': ['J'],
						created: { 'date-parts': [[2021]] },
					},
				},
			},
		]);
		const results = await doiProvider.fetchMany?.(['10.1/down', '10.1/gone', '10.1/good'], ctx);
		expect(failureOf(results, '10.1/down')).toBe('transient');
		expect(failureOf(results, '10.1/gone')).toBe('permanent');
		expect(infoOf(results, '10.1/good')?.title).toBe('OK');
	});

	it('wos provider throws when the API key is missing', async () => {
		const ctx = makeCtx([]);
		ctx.settings.wosApiKey = '';
		await expect(wosProvider.fetch('WOS:001607817500001', ctx)).rejects.toThrow('API key');
	});

	it('wos provider fetches and translates the document', async () => {
		const ctx = makeCtx([
			{
				status: 200,
				json: {
					uid: 'WOS:001607817500001',
					title: 'WoS Article',
					types: ['Article'],
					source: { sourceTitle: 'Nature', publishYear: 2024 },
				},
			},
		]);
		ctx.settings.articleType = '';
		const info = await wosProvider.fetch('WOS:001607817500001', ctx);
		expect(info?.wosId).toBe('WOS:001607817500001');
		expect(info?.articleType).toBe('Article');
	});
});
