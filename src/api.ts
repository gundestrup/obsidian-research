import type {
	PubMedResult,
	PubMedApiResponse,
	PubMedSearchResponse,
	CrossRefMessage,
	CrossRefResponse,
	WosDocument,
	RequestUrlResponse,
} from './types';

export type RequestFunction = (params: {
	url: string;
	headers?: Record<string, string>;
}) => Promise<RequestUrlResponse>;

export async function fetchPubMedResults(
	pubmedIds: string[],
	apiKey: string,
	requestFn: RequestFunction
): Promise<PubMedResult[]> {
	if (pubmedIds.length === 0) return [];

	const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
	const params = new URLSearchParams({
		db: 'pubmed',
		id: pubmedIds.join(','),
		retmode: 'json',
		version: '2.0',
	});

	if (apiKey) {
		params.append('api_key', apiKey);
	}

	const response = await requestFn({ url: `${baseUrl}?${params}` });

	if (response.status !== 200) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const data = response.json as PubMedApiResponse;
	const result = data.result ?? {};
	const uids = result.uids ?? Object.keys(result).filter((key) => key !== 'uids');
	const records: PubMedResult[] = [];

	for (const uid of uids) {
		const record = result[uid];
		if (record && !Array.isArray(record)) {
			records.push(record);
		}
	}

	return records;
}

export async function fetchPubMedResult(
	pubmedId: string,
	apiKey: string,
	requestFn: RequestFunction
): Promise<PubMedResult> {
	const result = (await fetchPubMedResults([pubmedId], apiKey, requestFn))[0];

	if (!result) {
		throw new Error('Article not found');
	}

	return result;
}

export async function searchPubMedIds(
	term: string,
	apiKey: string,
	requestFn: RequestFunction,
	retmax?: string
): Promise<string[]> {
	const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
	const params = new URLSearchParams({
		db: 'pubmed',
		term: term,
		retmode: 'json',
	});

	if (retmax) {
		params.append('retmax', retmax);
	}

	if (apiKey) {
		params.append('api_key', apiKey);
	}

	const response = await requestFn({ url: `${baseUrl}?${params}` });

	if (response.status !== 200) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const data = response.json as PubMedSearchResponse;
	return data.esearchresult?.idlist ?? [];
}

async function trySearchPubMedIds(
	term: string,
	apiKey: string,
	requestFn: RequestFunction,
	retmax?: string
): Promise<string | null> {
	try {
		return (await searchPubMedIds(term, apiKey, requestFn, retmax))[0] ?? null;
	} catch (error) {
		console.error('Error searching PubMed:', error);
		return null;
	}
}

export async function findPubMedIdFromPMC(
	pmcId: string,
	apiKey: string,
	requestFn: RequestFunction
): Promise<string | null> {
	return trySearchPubMedIds(`"${pmcId}"[pmcid]`, apiKey, requestFn);
}

export async function findPubMedIdFromDOI(
	doi: string,
	apiKey: string,
	requestFn: RequestFunction
): Promise<string | null> {
	return trySearchPubMedIds(`"${doi}"[DOI]`, apiKey, requestFn, '1');
}

export async function fetchCrossRefMessage(
	doi: string,
	requestFn: RequestFunction
): Promise<CrossRefMessage> {
	const baseUrl = 'https://api.crossref.org/works/' + encodeURIComponent(doi);

	const response = await requestFn({ url: baseUrl });

	if (response.status !== 200) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const data = response.json as CrossRefResponse;
	const message = data.message;

	if (!message) {
		throw new Error('Article not found');
	}

	return message;
}

export async function fetchArxivAtom(
	arxivIds: string | string[],
	requestFn: RequestFunction
): Promise<string> {
	const idList = Array.isArray(arxivIds) ? arxivIds.join(',') : arxivIds;
	const params = new URLSearchParams({ id_list: idList });
	const response = await requestFn({ url: `https://export.arxiv.org/api/query?${params}` });

	if (response.status !== 200) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	if (!response.text) {
		throw new Error('Article not found');
	}

	return response.text;
}

export async function fetchWosDocument(
	wosId: string,
	apiKey: string,
	requestFn: RequestFunction
): Promise<WosDocument> {
	const url =
		`https://api.clarivate.com/apis/wos-starter/v1/documents/${encodeURIComponent(wosId)}` +
		'?db=WOS';
	const response = await requestFn({ url, headers: { 'X-ApiKey': apiKey } });

	if (response.status !== 200) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const doc = response.json as WosDocument | null;
	if (!doc) {
		throw new Error('Article not found');
	}

	return doc;
}
