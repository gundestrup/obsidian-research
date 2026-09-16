/**
 * Unit tests for URL replacement helpers
 */

import { describe, it, expect } from 'vitest';
import {
	replacePubMedUrl,
	replacePMCUrl,
	replaceDOIUrl,
	replaceArxivUrl,
	replaceWosUrl,
	failureMarker,
	failureMarkerKind,
	failureKind,
	providerIcon,
} from '../src/utils';

type ReplaceFn = (content: string, id: string, citation: string) => string;

const replacers: { name: string; fn: ReplaceFn; id: string; otherId: string; url: (id: string) => string }[] = [
	{
		name: 'replacePubMedUrl',
		fn: replacePubMedUrl,
		id: '38570095',
		otherId: '12345',
		url: (id) => `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
	},
	{
		name: 'replacePMCUrl',
		fn: replacePMCUrl,
		id: 'PMC6792392',
		otherId: 'PMC12345',
		url: (id) => `https://pmc.ncbi.nlm.nih.gov/articles/${id}/`,
	},
	{
		name: 'replaceDOIUrl',
		fn: replaceDOIUrl,
		id: '10.1234/test',
		otherId: '10.5678/other',
		url: (id) => `https://doi.org/${id}`,
	},
	{
		name: 'replaceArxivUrl',
		fn: replaceArxivUrl,
		id: '2609.12218',
		otherId: '1234.5678',
		url: (id) => `https://arxiv.org/abs/${id}`,
	},
	{
		name: 'replaceWosUrl',
		fn: replaceWosUrl,
		id: 'WOS:001607817500001',
		otherId: 'WOS:000252077700005',
		url: (id) => `https://www.webofscience.com/wos/woscc/full-record/${id}`,
	},
];

describe.each(replacers)('$name', ({ fn, id, otherId, url }) => {
	it('should replace all occurrences of repeated IDs', () => {
		const content = `${url(id)} and ${url(id)}`;
		expect(fn(content, id, 'CITATION')).toBe('CITATION and CITATION');
	});

	it('should not replace different IDs', () => {
		const content = `${url(id)} and ${url(otherId)}`;
		expect(fn(content, id, 'CITATION')).toBe(`CITATION and ${url(otherId)}`);
	});

	it('should consume a permanent failure marker and icon before the reference', () => {
		const content = `Before 🔴(marker-key) ${providerIcon('P', 'p.svg')} ${url(id)} after`;
		expect(fn(content, id, 'CITATION')).toBe('Before CITATION after');
	});

	it('should consume a failure marker without an icon before the reference', () => {
		const content = `Before 🔴(marker-key) ${url(id)} after`;
		expect(fn(content, id, 'CITATION')).toBe('Before CITATION after');
	});

	it('should consume a stray marker after the reference', () => {
		const content = `Before ${url(id)} 🟡(stale=old-id) after`;
		expect(fn(content, id, 'CITATION')).toBe('Before CITATION after');
	});
});

describe('failureMarker', () => {
	it('should produce a red permanent marker', () => {
		expect(failureMarker('pmc=PMC6792392', 'permanent')).toBe('🔴(pmc=PMC6792392)');
	});

	it('should produce a yellow transient marker', () => {
		expect(failureMarker('arxiv=2609.12218', 'transient')).toBe('🟡(arxiv=2609.12218)');
	});
});

describe('failureMarkerKind', () => {
	it('should detect a permanent marker for the key', () => {
		const content = `${failureMarker('pmc=PMC6792392', 'permanent')} https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/`;
		expect(failureMarkerKind(content, 'pmc=PMC6792392')).toBe('permanent');
	});

	it('should detect a transient marker for the key', () => {
		const content = `${failureMarker('arxiv=2609.12218', 'transient')} https://arxiv.org/abs/2609.12218`;
		expect(failureMarkerKind(content, 'arxiv=2609.12218')).toBe('transient');
	});

	it('should return null when the key differs or no marker exists', () => {
		const content = `${failureMarker('pmc=PMC111', 'permanent')} https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/`;
		expect(failureMarkerKind(content, 'pmc=PMC6792392')).toBeNull();
		expect(failureMarkerKind('plain text', 'pmc=PMC6792392')).toBeNull();
	});
});

describe('failureKind', () => {
	it('should classify not-found errors as permanent', () => {
		expect(failureKind(new Error('Article not found'))).toBe('permanent');
		expect(failureKind(new Error('HTTP error! status: 404'))).toBe('permanent');
	});

	it('should classify transient errors as transient', () => {
		expect(failureKind(new Error('HTTP error! status: 500'))).toBe('transient');
		expect(failureKind(new Error('Network error'))).toBe('transient');
		expect(failureKind('not an error')).toBe('transient');
	});
});

describe('replacePubMedUrl', () => {
	it.each<[string, string, string, string]>([
		[
			'bare URL',
			'See https://pubmed.ncbi.nlm.nih.gov/38570095/ for details',
			'📚 [Article](https://pubmed.ncbi.nlm.nih.gov/38570095/)',
			'See 📚 [Article](https://pubmed.ncbi.nlm.nih.gov/38570095/) for details',
		],
		[
			'URL inside Markdown link',
			'See [link](https://pubmed.ncbi.nlm.nih.gov/38570095/) for details',
			'📚 Citation',
			'See [link](📚 Citation) for details',
		],
		[
			'URL without trailing slash',
			'See https://pubmed.ncbi.nlm.nih.gov/38570095 for details',
			'CITATION',
			'See CITATION for details',
		],
		[
			'HTTP variant',
			'See http://pubmed.ncbi.nlm.nih.gov/38570095/ for details',
			'CITATION',
			'See CITATION for details',
		],
		[
			'URL with fragment',
			'See https://pubmed.ncbi.nlm.nih.gov/38570095/#abstract for details',
			'CITATION',
			'See CITATION#abstract for details',
		],
		[
			'URL with query string',
			'See https://pubmed.ncbi.nlm.nih.gov/38570095/?ref=foo for details',
			'CITATION',
			'See CITATION?ref=foo for details',
		],
	])('should replace %s', (_name, content, citation, expected) => {
		expect(replacePubMedUrl(content, '38570095', citation)).toBe(expected);
	});
});

describe('replacePMCUrl', () => {
	it.each<[string, string, string, string]>([
		[
			'articles/ URL',
			'See https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/ for details',
			'📄 Citation',
			'See 📄 Citation for details',
		],
		[
			'simple PMC URL',
			'See https://pmc.ncbi.nlm.nih.gov/PMC6792392/ for details',
			'CITATION',
			'See CITATION for details',
		],
	])('should replace %s', (_name, content, citation, expected) => {
		expect(replacePMCUrl(content, 'PMC6792392', citation)).toBe(expected);
	});
});

describe('replaceDOIUrl', () => {
	it.each<[string, string, string, string]>([
		[
			'doi.org URL',
			'See https://doi.org/10.1234/test for details',
			'🔗 Citation',
			'See 🔗 Citation for details',
		],
		[
			'dx.doi.org URL',
			'See https://dx.doi.org/10.1234/test for details',
			'CITATION',
			'See CITATION for details',
		],
		[
			'DOI URL with fragment',
			'See https://doi.org/10.1234/test#section for details',
			'CITATION',
			'See CITATION#section for details',
		],
		[
			'DOI URL with query string',
			'See https://doi.org/10.1234/test?ref=foo for details',
			'CITATION',
			'See CITATION?ref=foo for details',
		],
	])('should replace %s', (_name, content, citation, expected) => {
		expect(replaceDOIUrl(content, '10.1234/test', citation)).toBe(expected);
	});
});

describe('replaceArxivUrl', () => {
	it.each<[string, string, string, string]>([
		[
			'abs URL',
			'See https://arxiv.org/abs/2609.12218 for details',
			'📄 Citation',
			'See 📄 Citation for details',
		],
		[
			'pdf URL',
			'See https://arxiv.org/pdf/2609.12218 for details',
			'📄 Citation',
			'See 📄 Citation for details',
		],
		[
			'arXiv tag',
			'See arXiv:2609.12218 for details',
			'📄 Citation',
			'See 📄 Citation for details',
		],
		[
			'markdown tagged link',
			'See [arXiv:2609.12218](https://arxiv.org/abs/2609.12218) for details',
			'📄 Citation',
			'See [📄 Citation](📄 Citation) for details',
		],
	])('should replace %s', (_name, content, citation, expected) => {
		expect(replaceArxivUrl(content, '2609.12218', citation)).toBe(expected);
	});
});

describe('replaceWosUrl', () => {
	it.each<[string, string, string, string]>([
		[
			'full record URL',
			'See https://www.webofscience.com/wos/woscc/full-record/WOS:001607817500001 for details',
			'🔍 Citation',
			'See 🔍 Citation for details',
		],
		[
			'URL without www',
			'See https://webofscience.com/wos/woscc/full-record/WOS:001607817500001/ for details',
			'🔍 Citation',
			'See 🔍 Citation for details',
		],
		[
			'bare WOS tag',
			'See WOS:001607817500001 for details',
			'🔍 Citation',
			'See 🔍 Citation for details',
		],
		[
			'full record URL for another database',
			'See https://www.webofscience.com/wos/medline/full-record/WOS:001607817500001 for details',
			'🔍 Citation',
			'See 🔍 Citation for details',
		],
	])('should replace %s', (_name, content, citation, expected) => {
		expect(replaceWosUrl(content, 'WOS:001607817500001', citation)).toBe(expected);
	});
});

describe('Replacement in code blocks', () => {
	it('should replace PubMed URL inside inline code', () => {
		const content = 'Use `https://pubmed.ncbi.nlm.nih.gov/38570095/` as reference';
		const result = replacePubMedUrl(content, '38570095', 'CITATION');
		expect(result).toBe('Use `CITATION` as reference');
	});

	it('should replace PubMed URL inside fenced code block', () => {
		const content = '```\nhttps://pubmed.ncbi.nlm.nih.gov/38570095/\n```';
		const result = replacePubMedUrl(content, '38570095', 'CITATION');
		expect(result).toBe('```\nCITATION\n```');
	});
});
