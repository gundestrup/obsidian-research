/**
 * Unit tests for API functions with mocked requestUrl
 */

import { describe, it, expect, vi, type MockedFunction } from 'vitest';
import {
	fetchPubMedResult,
	fetchPubMedResults,
	fetchCrossRefMessage,
	fetchArxivAtom,
	fetchWosDocument,
	findPubMedIdFromPMC,
	findPubMedIdFromDOI,
	searchPubMedIds,
	type RequestFunction,
} from '../src/api';
import type { RequestUrlResponse } from '../src/types';

function mockRequest(response: RequestUrlResponse): MockedFunction<RequestFunction> {
	return vi.fn().mockResolvedValue(response);
}

const pubmedResultPayload = {
	result: {
		'38570095': {
			title: 'Test Article',
			source: 'Test Journal',
			pubdate: '2024 Jan',
			doi: '10.1234/test',
			articleids: [{ idtype: 'pmc', value: 'PMC1234567' }],
			pubtype: ['Review'],
		},
	},
};

describe('fetchPubMedResult', () => {
	it('should return the raw PubMed result payload', async () => {
		const requestFn = mockRequest({ status: 200, json: pubmedResultPayload });
		const result = await fetchPubMedResult('38570095', '', requestFn);

		expect(result.title).toBe('Test Article');
		expect(result.source).toBe('Test Journal');
		expect(result.pubdate).toBe('2024 Jan');
		expect(result.doi).toBe('10.1234/test');
		expect(result.articleids).toEqual([{ idtype: 'pmc', value: 'PMC1234567' }]);
		expect(requestFn).toHaveBeenCalledTimes(1);
		expect(requestFn.mock.calls[0][0].url).toContain('esummary.fcgi');
	});

	it('should include API key in URL when provided', async () => {
		const requestFn = mockRequest({
			status: 200,
			json: {
				result: {
					'12345': { title: 'Test', source: 'Journal', pubdate: '2024' },
				},
			},
		});
		await fetchPubMedResult('12345', 'my-api-key', requestFn);

		expect(requestFn).toHaveBeenCalledTimes(1);
		expect(requestFn.mock.calls[0][0].url).toContain('api_key=my-api-key');
	});

	it('should throw on non-200 status', async () => {
		const requestFn = mockRequest({ status: 404, json: {} });
		await expect(fetchPubMedResult('12345', '', requestFn)).rejects.toThrow('HTTP error! status: 404');
	});

	it('should throw when article not found', async () => {
		const requestFn = mockRequest({ status: 200, json: { result: {} } });
		await expect(fetchPubMedResult('99999', '', requestFn)).rejects.toThrow('Article not found');
	});
});

describe('fetchPubMedResults', () => {
	it('should fetch multiple ids in one esummary request', async () => {
		const requestFn = mockRequest({
			status: 200,
			json: {
				result: {
					uids: ['38570095', '36789012'],
					'38570095': { uid: '38570095', title: 'First' },
					'36789012': { uid: '36789012', title: 'Second' },
				},
			},
		});
		const records = await fetchPubMedResults(['38570095', '36789012'], '', requestFn);

		expect(requestFn).toHaveBeenCalledTimes(1);
		expect(requestFn.mock.calls[0][0].url).toContain('id=38570095%2C36789012');
		expect(records.map((record) => record.title)).toEqual(['First', 'Second']);
	});

	it('should fall back to result keys when uids is missing', async () => {
		const requestFn = mockRequest({ status: 200, json: pubmedResultPayload });
		const records = await fetchPubMedResults(['38570095'], '', requestFn);
		expect(records[0]?.title).toBe('Test Article');
	});

	it('should skip uids without a record', async () => {
		const requestFn = mockRequest({
			status: 200,
			json: {
				result: {
					uids: ['1', '2'],
					'1': { uid: '1', title: 'Only' },
				},
			},
		});
		const records = await fetchPubMedResults(['1', '2'], '', requestFn);
		expect(records).toHaveLength(1);
	});

	it('should handle a response without a result object', async () => {
		const requestFn = mockRequest({ status: 200, json: {} });
		expect(await fetchPubMedResults(['1'], '', requestFn)).toEqual([]);
	});

	it('should return an empty array for empty input without a request', async () => {
		const requestFn = mockRequest({ status: 200, json: {} });
		expect(await fetchPubMedResults([], '', requestFn)).toEqual([]);
		expect(requestFn).not.toHaveBeenCalled();
	});

	it('should throw on non-200 status', async () => {
		const requestFn = mockRequest({ status: 503, json: {} });
		await expect(fetchPubMedResults(['1'], '', requestFn)).rejects.toThrow('HTTP error! status: 503');
	});
});

describe('searchPubMedIds', () => {
	it('should return the full idlist for a combined OR term', async () => {
		const requestFn = mockRequest({
			status: 200,
			json: { esearchresult: { idlist: ['30321896', '38293938'] } },
		});
		const ids = await searchPubMedIds('"PMC6792392"[pmcid] OR "PMC11056128"[pmcid]', '', requestFn);
		expect(ids).toEqual(['30321896', '38293938']);
		expect(requestFn.mock.calls[0][0].url).toContain('esearch.fcgi');
		expect(requestFn.mock.calls[0][0].url).toContain('PMC6792392');
	});

	it('should include retmax when provided', async () => {
		const requestFn = mockRequest({ status: 200, json: { esearchresult: { idlist: [] } } });
		await searchPubMedIds('"x"[doi]', '', requestFn, '100');
		expect(requestFn.mock.calls[0][0].url).toContain('retmax=100');
	});

	it('should throw on non-200 status', async () => {
		const requestFn = mockRequest({ status: 500, json: {} });
		await expect(searchPubMedIds('term', '', requestFn)).rejects.toThrow('HTTP error');
	});

	it('should throw on error', async () => {
		const requestFn = vi.fn().mockRejectedValue(new Error('Network error'));
		await expect(searchPubMedIds('term', '', requestFn)).rejects.toThrow('Network error');
	});
});

describe('fetchCrossRefMessage', () => {
	const crossRefPayload = {
		message: {
			title: ['DOI Article Title'],
			'short-container-title': ['Test Journal'],
			created: { 'date-parts': [[2024, 3, 15]] },
			type: 'journal-article',
		},
	};

	it('should return the raw CrossRef message payload', async () => {
		const requestFn = mockRequest({ status: 200, json: crossRefPayload });
		const message = await fetchCrossRefMessage('10.1234/test', requestFn);

		expect(message.title).toEqual(['DOI Article Title']);
		expect(message['short-container-title']).toEqual(['Test Journal']);
		expect(message.type).toBe('journal-article');
	});

	it('should throw on non-200 status', async () => {
		const requestFn = mockRequest({ status: 404, json: {} });
		await expect(fetchCrossRefMessage('10.1234/test', requestFn)).rejects.toThrow('HTTP error! status: 404');
	});

	it('should throw when message is missing', async () => {
		const requestFn = mockRequest({ status: 200, json: {} });
		await expect(fetchCrossRefMessage('10.1234/test', requestFn)).rejects.toThrow('Article not found');
	});
});

describe('fetchArxivAtom', () => {
	it('should return the raw Atom XML body', async () => {
		const xml = '<feed><entry><id>http://arxiv.org/abs/2609.12218v1</id></entry></feed>';
		const requestFn = mockRequest({ status: 200, json: undefined, text: xml });

		const body = await fetchArxivAtom('2609.12218', requestFn);
		expect(body).toBe(xml);
		expect(requestFn.mock.calls[0][0].url).toContain('export.arxiv.org/api/query');
		expect(requestFn.mock.calls[0][0].url).toContain('id_list=2609.12218');
	});

	it('should join multiple ids into one id_list query', async () => {
		const requestFn = mockRequest({ status: 200, json: undefined, text: '<feed/>' });
		await fetchArxivAtom(['2609.12218', '1234.5678'], requestFn);
		expect(requestFn).toHaveBeenCalledTimes(1);
		expect(requestFn.mock.calls[0][0].url).toContain('id_list=2609.12218%2C1234.5678');
	});

	it('should throw on non-200 status', async () => {
		const requestFn = mockRequest({ status: 429, json: undefined });
		await expect(fetchArxivAtom('2609.12218', requestFn)).rejects.toThrow('HTTP error! status: 429');
	});

	it('should throw when response has no text body', async () => {
		const requestFn = mockRequest({ status: 200, json: undefined });
		await expect(fetchArxivAtom('2609.12218', requestFn)).rejects.toThrow('Article not found');
	});
});

describe('fetchWosDocument', () => {
	const wosPayload = {
		uid: 'WOS:001607817500001',
		title: 'Test WoS Article',
		types: ['Article'],
		source: { sourceTitle: 'Nature', publishYear: 2024 },
		identifiers: { doi: '10.1038/test.456', pmid: '38570095' },
	};

	it('should return the raw WoS document payload', async () => {
		const requestFn = mockRequest({ status: 200, json: wosPayload });
		const doc = await fetchWosDocument('WOS:001607817500001', 'key-123', requestFn);

		expect(doc.uid).toBe('WOS:001607817500001');
		expect(doc.title).toBe('Test WoS Article');
		expect(doc.source?.sourceTitle).toBe('Nature');
		expect(doc.identifiers?.doi).toBe('10.1038/test.456');
	});

	it('should send the API key via X-ApiKey header', async () => {
		const requestFn = mockRequest({ status: 200, json: { title: 'T' } });
		await fetchWosDocument('WOS:001607817500001', 'key-123', requestFn);
		expect(requestFn.mock.calls[0][0].headers?.['X-ApiKey']).toBe('key-123');
		expect(requestFn.mock.calls[0][0].url).toContain('wos-starter');
		expect(requestFn.mock.calls[0][0].url).toContain('WOS%3A001607817500001');
	});

	it('should throw on non-200 status', async () => {
		const requestFn = mockRequest({ status: 404, json: {} });
		await expect(fetchWosDocument('WOS:001607817500001', 'k', requestFn)).rejects.toThrow('HTTP error! status: 404');
	});

	it('should throw when the document payload is empty', async () => {
		const requestFn = mockRequest({ status: 200, json: null });
		await expect(fetchWosDocument('WOS:001607817500001', 'k', requestFn)).rejects.toThrow('Article not found');
	});
});

describe('findPubMedIdFromPMC', () => {
	it('should return PubMed ID when found', async () => {
		const mockResponse: RequestUrlResponse = {
			status: 200,
			json: {
				esearchresult: {
					idlist: ['38570095'],
				},
			},
		};

		const requestFn = mockRequest(mockResponse);
		const result = await findPubMedIdFromPMC('PMC6792392', '', requestFn);
		expect(result).toBe('38570095');
	});

	it('should return null when no results', async () => {
		const mockResponse: RequestUrlResponse = {
			status: 200,
			json: {
				esearchresult: {
					idlist: [],
				},
			},
		};

		const requestFn = mockRequest(mockResponse);
		const result = await findPubMedIdFromPMC('PMC9999999', '', requestFn);
		expect(result).toBeNull();
	});

	it('should return null on error', async () => {
		const requestFn = vi.fn().mockRejectedValue(new Error('Network error'));
		const result = await findPubMedIdFromPMC('PMC9999999', '', requestFn);
		expect(result).toBeNull();
	});

	it('should include the API key in the request URL when provided', async () => {
		const requestFn = mockRequest({ status: 200, json: { esearchresult: { idlist: [] } } });
		await findPubMedIdFromPMC('PMC6792392', 'TESTKEY', requestFn);
		expect(requestFn.mock.calls[0]?.[0].url).toContain('api_key=TESTKEY');
	});
});

describe('findPubMedIdFromDOI', () => {
	it('should return PubMed ID when found', async () => {
		const mockResponse: RequestUrlResponse = {
			status: 200,
			json: {
				esearchresult: {
					idlist: ['38570095'],
				},
			},
		};

		const requestFn = mockRequest(mockResponse);
		const result = await findPubMedIdFromDOI('10.1234/test', '', requestFn);
		expect(result).toBe('38570095');
	});

	it('should return null when no results', async () => {
		const mockResponse: RequestUrlResponse = {
			status: 200,
			json: {
				esearchresult: {
					idlist: [],
				},
			},
		};

		const requestFn = mockRequest(mockResponse);
		const result = await findPubMedIdFromDOI('10.9999/nonexistent', '', requestFn);
		expect(result).toBeNull();
	});

	it('should return null on non-200 status', async () => {
		const requestFn = mockRequest({ status: 500, json: {} });
		const result = await findPubMedIdFromDOI('10.1234/test', '', requestFn);
		expect(result).toBeNull();
	});

	it('should return null on error', async () => {
		const requestFn = vi.fn().mockRejectedValue(new Error('Network error'));
		const result = await findPubMedIdFromDOI('10.1234/test', '', requestFn);
		expect(result).toBeNull();
	});

	it('should include the API key in the request URL when provided', async () => {
		const requestFn = mockRequest({ status: 200, json: { esearchresult: { idlist: [] } } });
		await findPubMedIdFromDOI('10.1234/test', 'TESTKEY', requestFn);
		expect(requestFn.mock.calls[0]?.[0].url).toContain('api_key=TESTKEY');
	});
});

describe('Edge cases — API URL encoding', () => {
	it('should encode DOI with special characters in URL', async () => {
		const mockResponse: RequestUrlResponse = {
			status: 200,
			json: {
				esearchresult: {
					idlist: ['12345'],
				},
			},
		};

		const requestFn = mockRequest(mockResponse);
		await findPubMedIdFromDOI('10.1007/s10654-023-01010-8', '', requestFn);
		expect(requestFn.mock.calls[0][0].url).toContain('10.1007');
	});

	it('should encode API key parameter in URL', async () => {
		const mockResponse: RequestUrlResponse = {
			status: 200,
			json: {
				result: {
					'12345': {
						title: 'Test',
						source: 'Journal',
						pubdate: '2024',
					},
				},
			},
		};

		const requestFn = mockRequest(mockResponse);
		await fetchPubMedResult('12345', 'key with spaces', requestFn);
		expect(requestFn.mock.calls[0][0].url).toContain('api_key=key+with+spaces');
	});
});

describe('Edge cases — malformed response bodies', () => {
	it('should handle PubMed response with null json', async () => {
		const requestFn = mockRequest({ status: 200, json: null });
		await expect(fetchPubMedResult('12345', '', requestFn)).rejects.toThrow();
	});

	it('should handle CrossRef response with null json', async () => {
		const requestFn = mockRequest({ status: 200, json: null });
		await expect(fetchCrossRefMessage('10.1234/test', requestFn)).rejects.toThrow();
	});

	it('should handle PubMed search response with missing esearchresult', async () => {
		const requestFn = mockRequest({ status: 200, json: {} });
		const result = await findPubMedIdFromPMC('PMC9999999', '', requestFn);
		expect(result).toBeNull();
	});

	it('should handle PubMed search response with null idlist', async () => {
		const requestFn = mockRequest({
			status: 200,
			json: { esearchresult: { idlist: null as unknown as string[] } },
		});
		const result = await findPubMedIdFromPMC('PMC9999999', '', requestFn);
		expect(result).toBeNull();
	});
});

describe('Edge cases — PMC non-200 responses', () => {
	it('should return null on 404', async () => {
		const requestFn = mockRequest({ status: 404, json: {} });
		const result = await findPubMedIdFromPMC('PMC9999999', '', requestFn);
		expect(result).toBeNull();
	});

	it('should return null on 500', async () => {
		const requestFn = mockRequest({ status: 500, json: {} });
		const result = await findPubMedIdFromPMC('PMC9999999', '', requestFn);
		expect(result).toBeNull();
	});

	it('should return null on 429 (rate limited)', async () => {
		const requestFn = mockRequest({ status: 429, json: {} });
		const result = await findPubMedIdFromPMC('PMC9999999', '', requestFn);
		expect(result).toBeNull();
	});
});
