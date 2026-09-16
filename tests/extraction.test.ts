/**
 * Unit tests for ID extraction functions
 */

import { describe, it, expect } from 'vitest';
import {
	extractPubMedId,
	extractPMCId,
	extractDOI,
	extractArxivId,
	extractWosId,
	cleanDOI,
	extractURLs,
	extractUniqueIds,
} from '../src/utils';

describe('extractPubMedId', () => {
	it.each<[string, string | null]>([
		// from URLs
		['https://pubmed.ncbi.nlm.nih.gov/38570095/', '38570095'],
		['https://pubmed.ncbi.nlm.nih.gov/38570095', '38570095'],
		['http://pubmed.ncbi.nlm.nih.gov/12345678/', '12345678'],
		['https://pubmed.ncbi.nlm.nih.gov/1/', '1'],
		['https://pubmed.ncbi.nlm.nih.gov/999999999', '999999999'],
		// from direct input
		['38570095', '38570095'],
		['1', '1'],
		// invalid inputs
		['https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/', null],
		['https://www.ncbi.nlm.nih.gov/pubmed/38570095/', null],
		['abc123def', null],
		['', null],
		['https://pubmed.ncbi.nlm.nih.gov/', null],
		['123.456', null],
		// trailing punctuation
		['https://pubmed.ncbi.nlm.nih.gov/38570095/.', '38570095'],
		['https://pubmed.ncbi.nlm.nih.gov/38570095/,', '38570095'],
		// casing and malformed URLs
		['HTTPS://PUBMED.NCBI.NLM.NIH.GOV/38570095/', '38570095'],
		['pubmed.ncbi.nlm.nih.gov/38570095/', '38570095'],
		['https://pubmed.ncbi.nlm.nih.gov/38570095/extra/path/', '38570095'],
		// false-positive hostnames
		['https://arxiv.org/abs/38570095', null],
		['https://scholar.google.com/38570095', null],
		['https://pubmed.ncbi.nlm.nih.gov.evil.com/38570095/', null],
	])('extractPubMedId(%j) = %j', (input, expected) => {
		expect(extractPubMedId(input)).to.equal(expected);
	});
});

describe('extractPMCId', () => {
	it.each<[string, string | null]>([
		// from URLs
		['https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/', 'PMC6792392'],
		['https://pmc.ncbi.nlm.nih.gov/articles/PMC12345678', 'PMC12345678'],
		['https://pmc.ncbi.nlm.nih.gov/PMC6792392/', 'PMC6792392'],
		['http://pmc.ncbi.nlm.nih.gov/articles/PMC98765432/', 'PMC98765432'],
		// from direct input
		['PMC6792392', 'PMC6792392'],
		['PMC123456789', 'PMC123456789'],
		// invalid inputs
		['https://pubmed.ncbi.nlm.nih.gov/38570095/', null],
		['6792392', null],
		['', null],
		['PMC-6792392', null],
		// trailing punctuation, casing and malformed URLs
		['https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/.', 'PMC6792392'],
		['https://PMC.ncbi.nlm.nih.gov/articles/PMC6792392/', 'PMC6792392'],
		['pmc.ncbi.nlm.nih.gov/articles/PMC6792392/', null],
	])('extractPMCId(%j) = %j', (input, expected) => {
		expect(extractPMCId(input)).to.equal(expected);
	});
});

describe('extractDOI', () => {
	it.each<[string, string | null]>([
		// from URLs
		['https://doi.org/10.1016/j.clinme.2024.100038', '10.1016/j.clinme.2024.100038'],
		['https://dx.doi.org/10.1007/s10654-023-01010-8', '10.1007/s10654-023-01010-8'],
		['http://doi.org/10.1186/s12916-023-02845-8', '10.1186/s12916-023-02845-8'],
		['[Article](https://doi.org/10.1016/j.test.2024.001)', '10.1016/j.test.2024.001'],
		// from direct input
		['10.1016/j.clinme.2024.100038', '10.1016/j.clinme.2024.100038'],
		['10.1007/978-3-319-12345-6_7', '10.1007/978-3-319-12345-6_7'],
		// invalid inputs
		['not-a-doi', null],
		['', null],
		['https://doi.org/invalid-doi', null],
		['https://pubmed.ncbi.nlm.nih.gov/38570095/', null],
		['https://example.com/10.1016/j.clinme.2024.100038', null],
		// trailing punctuation, casing and malformed URLs
		['https://doi.org/10.1016/j.clinme.2024.100038.', '10.1016/j.clinme.2024.100038'],
		['https://DOI.org/10.1016/j.clinme.2024.100038', '10.1016/j.clinme.2024.100038'],
		['doi.org/10.1016/j.clinme.2024.100038', '10.1016/j.clinme.2024.100038'],
		// fragments and query strings
		['https://doi.org/10.1016/j.clinme.2024.100038#section1', '10.1016/j.clinme.2024.100038'],
		['https://doi.org/10.1016/j.clinme.2024.100038?ref=foo', '10.1016/j.clinme.2024.100038'],
		['https://doi.org/10.1016/j.clinme.2024.100038?ref=foo#section1', '10.1016/j.clinme.2024.100038'],
	])('extractDOI(%j) = %j', (input, expected) => {
		expect(extractDOI(input)).to.equal(expected);
	});
});

describe('extractArxivId', () => {
	it.each<[string, string | null]>([
		// from URLs
		['https://arxiv.org/abs/2609.12218', '2609.12218'],
		['https://arxiv.org/abs/2609.12218v2', '2609.12218'],
		['https://arxiv.org/pdf/2609.12218', '2609.12218'],
		['http://arxiv.org/abs/1234.5678', '1234.5678'],
		['https://arxiv.org/abs/hep-th/9901001', 'hep-th/9901001'],
		['https://arxiv.org/abs/math.GT/0309136', 'math.GT/0309136'],
		// tag and bare forms
		['arXiv:2609.12218', '2609.12218'],
		['arXiv:2609.12218v3', '2609.12218'],
		['2609.12218', '2609.12218'],
		['hep-th/9901001', 'hep-th/9901001'],
		// invalid inputs
		['', null],
		['https://pubmed.ncbi.nlm.nih.gov/38570095/', null],
		['https://arxiv.org/abs/38570095', null],
		['123.456', null],
		['10.48550/arXiv.2609.12218', null],
		['https://arxiv.org/', null],
	])('extractArxivId(%j) = %j', (input, expected) => {
		expect(extractArxivId(input)).to.equal(expected);
	});
});

describe('extractWosId', () => {
	it.each<[string, string | null]>([
		// from URLs
		['https://www.webofscience.com/wos/woscc/full-record/WOS:001607817500001', 'WOS:001607817500001'],
		['https://webofscience.com/wos/woscc/full-record/WOS:001607817500001', 'WOS:001607817500001'],
		['http://www.webofscience.com/wos/woscc/full-record/WOS:A1997BE54K00001', 'WOS:A1997BE54K00001'],
		// tag and bare forms
		['WOS:001607817500001', 'WOS:001607817500001'],
		['wos:001607817500001', 'WOS:001607817500001'],
		// invalid inputs
		['', null],
		['WOS:123', null],
		['https://pubmed.ncbi.nlm.nih.gov/38570095/', null],
		['https://www.webofscience.com/wos/woscc/basic-search', null],
	])('extractWosId(%j) = %j', (input, expected) => {
		expect(extractWosId(input)).to.equal(expected);
	});
});

describe('cleanDOI', () => {
	it.each<[string, string]>([
		['doi: 10.1016/j.clinme.2024.100038', '10.1016/j.clinme.2024.100038'],
		['DOI: 10.1007/s10654-023-01010-8', '10.1007/s10654-023-01010-8'],
		['  10.1186/s12916-023-02845-8  ', '10.1186/s12916-023-02845-8'],
		['10.1016/j.test.2024.001', '10.1016/j.test.2024.001'],
	])('cleanDOI(%j) = %j', (input, expected) => {
		expect(cleanDOI(input)).to.equal(expected);
	});
});

describe('URL Extraction from Content', () => {
	it('should extract all PubMed URLs from mixed content', () => {
		const content = `
			Check this: https://pubmed.ncbi.nlm.nih.gov/38570095/
			And this: http://pubmed.ncbi.nlm.nih.gov/12345678
			Also: https://pubmed.ncbi.nlm.nih.gov/98765432/
		`;
		const urls = extractURLs(content);
		expect(urls.pubmedUrls).to.have.lengthOf(3);
		expect(urls.pubmedUrls).to.include('https://pubmed.ncbi.nlm.nih.gov/38570095/');
		expect(urls.pubmedUrls).to.include('http://pubmed.ncbi.nlm.nih.gov/12345678');
		expect(urls.pubmedUrls).to.include('https://pubmed.ncbi.nlm.nih.gov/98765432/');
	});

	it('should extract all PMC URLs from mixed content', () => {
		const content = `
			PMC article: https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/
			Another: https://pmc.ncbi.nlm.nih.gov/PMC12345678/
		`;
		const urls = extractURLs(content);
		expect(urls.pmcUrls).to.have.lengthOf(2);
		expect(urls.pmcUrls).to.include('https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/');
		expect(urls.pmcUrls).to.include('https://pmc.ncbi.nlm.nih.gov/PMC12345678/');
	});

	it('should extract all DOI URLs from mixed content', () => {
		const content = `
			DOI: https://doi.org/10.1016/j.clinme.2024.100038
			Another: https://dx.doi.org/10.1007/s10654-023-01010-8
		`;
		const urls = extractURLs(content);
		expect(urls.doiUrls).to.have.lengthOf(2);
	});

	it('should extract arXiv and WoS references from mixed content', () => {
		const content = `
			Preprint: https://arxiv.org/abs/2609.12218
			Tag: arXiv:2609.12218
			Record: https://www.webofscience.com/wos/woscc/full-record/WOS:001607817500001
			Tag: WOS:000252077700005
		`;
		const urls = extractURLs(content);
		expect(urls.arxivRefs).to.have.lengthOf(2);
		expect(urls.wosRefs).to.have.lengthOf(2);
	});

	it('should handle content with no URLs', () => {
		const content = 'Just some regular text without any links.';
		const urls = extractURLs(content);
		expect(urls.pubmedUrls).to.have.lengthOf(0);
		expect(urls.pmcUrls).to.have.lengthOf(0);
		expect(urls.doiUrls).to.have.lengthOf(0);
		expect(urls.arxivRefs).to.have.lengthOf(0);
		expect(urls.wosRefs).to.have.lengthOf(0);
	});

	it('should ignore invalid URLs', () => {
		const content = `
			Valid: https://pubmed.ncbi.nlm.nih.gov/38570095/
			Invalid: https://google.com
			Invalid: https://github.com/user/repo
		`;
		const urls = extractURLs(content);
		expect(urls.pubmedUrls).to.have.lengthOf(1);
		expect(urls.pmcUrls).to.have.lengthOf(0);
		expect(urls.doiUrls).to.have.lengthOf(0);
	});
});

describe('extractUniqueIds', () => {
	it('should extract and deduplicate all identifier types', () => {
		const content = `
			https://pubmed.ncbi.nlm.nih.gov/38570095/
			https://pubmed.ncbi.nlm.nih.gov/38570095/
			https://pubmed.ncbi.nlm.nih.gov/12345678/
			https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/
			https://pmc.ncbi.nlm.nih.gov/PMC6792392/
			https://doi.org/10.1016/j.clinme.2024.100038
			https://dx.doi.org/10.1016/j.clinme.2024.100038
		`;
		const ids = extractUniqueIds(content);
		expect(ids.pubmedIds).to.have.members(['38570095', '12345678']);
		expect(ids.pmcIds).to.have.members(['PMC6792392']);
		expect(ids.dois).to.have.members(['10.1016/j.clinme.2024.100038']);
	});

	it('should extract and deduplicate arXiv and WoS references', () => {
		const content = `
			https://arxiv.org/abs/2609.12218
			arXiv:2609.12218
			https://arxiv.org/pdf/1234.5678
			https://www.webofscience.com/wos/woscc/full-record/WOS:001607817500001
			WOS:001607817500001
		`;
		const ids = extractUniqueIds(content);
		expect(ids.arxivIds).to.have.members(['2609.12218', '1234.5678']);
		expect(ids.wosIds).to.have.members(['WOS:001607817500001']);
	});

	it('should return empty arrays when no URLs are present', () => {
		const ids = extractUniqueIds('Just some regular text without any links.');
		expect(ids.pubmedIds).to.have.lengthOf(0);
		expect(ids.pmcIds).to.have.lengthOf(0);
		expect(ids.dois).to.have.lengthOf(0);
		expect(ids.arxivIds).to.have.lengthOf(0);
		expect(ids.wosIds).to.have.lengthOf(0);
	});
});
