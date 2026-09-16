/**
 * Unit tests for citation formatting
 */

import { describe, it, expect } from 'vitest';
import {
	normalizeArticleType,
	providerBadge,
	pubmedUrl,
	pmcUrl,
	doiUrl,
	arxivAbsUrl,
	wosRecordUrl,
} from '../src/utils';
import { formatCitation } from '../src/citation';
import { APP_ICONS, articleTypeIcon, failureMarkerSymbol, renderIcon } from '../src/icons';
import { pmcProvider, doiProvider, wosProvider, pubmedProvider } from '../src/providers';
import type { ArticleInfo } from '../src/types';

const LOGO_BASE = 'https://raw.githubusercontent.com/gundestrup/obsidian-research/main/assets';

function badge(alt: string, file: string, href: string): string {
	return `[![${alt}|16](${LOGO_BASE}/${file})](${href})`;
}

const PUBMED_URL = 'https://pubmed.ncbi.nlm.nih.gov/38570095/';
const PUBMED_BADGE = badge('PubMed', 'pubmed.svg', PUBMED_URL);

describe('Citation Formatting', () => {
	describe('PubMed + PMC citations', () => {
		it('should format citation with PubMed ID and PMC ID', () => {
			const info = {
				title: 'Test Article Title',
				journal: 'Test Journal',
				year: '2024',
				pubmedId: '38570095',
				pmcId: 'PMC1234567',
				articleType: 'Article'
			};

			const citation = formatCitation(info);
			expect(citation).to.equal(`${PUBMED_BADGE} ${articleTypeIcon('Article')} Article: [Test Article Title](${PUBMED_URL}) - 2024, Test Journal ${badge('PMC', 'pmc.svg', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1234567/')}`);
		});

		it('should use custom article type', () => {
			const info = {
				title: 'Review Article',
				journal: 'Nature Reviews',
				year: '2023',
				pubmedId: '12345678',
				pmcId: 'PMC9876543',
				articleType: 'Review'
			};

			const citation = formatCitation(info);
			expect(citation).to.include('Review:');
			expect(citation).to.include('pubmed.svg');
		});
	});

	describe('PubMed + DOI citations', () => {
		it('should format citation with PubMed ID and DOI', () => {
			const info = {
				title: 'Test Article Title',
				journal: 'Test Journal',
				year: '2024',
				pubmedId: '38570095',
				doi: '10.1000/test.doi',
				articleType: 'Article'
			};

			const citation = formatCitation(info);
			expect(citation).to.equal(`${PUBMED_BADGE} ${articleTypeIcon('Article')} Article: [Test Article Title](${PUBMED_URL}) - 2024, Test Journal ${badge('DOI', 'doi.svg', 'https://doi.org/10.1000/test.doi')}`);
		});

		it('should clean DOI with prefix', () => {
			const info = {
				title: 'Test Article',
				journal: 'Test Journal',
				year: '2024',
				pubmedId: '38570095',
				doi: 'doi: 10.1000/test.doi',
				articleType: 'Article'
			};

			const citation = formatCitation(info);
			expect(citation).to.include('https://doi.org/10.1000/test.doi');
			expect(citation).to.not.include('doi:');
		});
	});

	describe('PubMed only citations', () => {
		it('should format citation with only PubMed ID', () => {
			const info = {
				title: 'Test Article Title',
				journal: 'Test Journal',
				year: '2024',
				pubmedId: '38570095',
				articleType: 'Article'
			};

			const citation = formatCitation(info);
			expect(citation).to.equal(`${PUBMED_BADGE} ${articleTypeIcon('Article')} Article: [Test Article Title](${PUBMED_URL}) - 2024, Test Journal`);
		});

		it('should default to "Article" type when not specified', () => {
			const info = {
				title: 'Test Article',
				journal: 'Test Journal',
				year: '2024',
				pubmedId: '38570095'
			};

			const citation = formatCitation(info);
			expect(citation).to.include(' Article:');
		});
	});

	describe('DOI only citations', () => {
		it('should format citation with only DOI', () => {
			const info = {
				title: 'Test Article Title',
				journal: 'Test Journal',
				year: '2024',
				doi: '10.1000/test.doi',
				articleType: 'Article'
			};

			const citation = formatCitation(info);
			expect(citation).to.equal(`${badge('DOI', 'doi.svg', 'https://doi.org/10.1000/test.doi')} ${articleTypeIcon('Article')} Article: [Test Article Title](https://doi.org/10.1000/test.doi) - 2024, Test Journal`);
		});

		it('should use DOI logo badge for DOI-only citations', () => {
			const info = {
				title: 'DOI Article',
				journal: 'Test Journal',
				year: '2024',
				doi: '10.1000/test.doi',
				articleType: 'Article'
			};

			const citation = formatCitation(info);
			expect(citation).to.match(/^\[!/);
			expect(citation).to.include('doi.svg');
		});
	});

	describe('arXiv citations', () => {
		it('should format citation with arXiv ID', () => {
			const info = {
				title: 'Test Preprint Title',
				journal: 'arXiv preprint',
				year: '2026',
				arxivId: '2609.12218',
				articleType: 'Preprint'
			};

			const citation = formatCitation(info);
			expect(citation).to.equal(`${badge('arXiv', 'arxiv.svg', 'https://arxiv.org/abs/2609.12218')} ${articleTypeIcon('Preprint')} Preprint: [Test Preprint Title](https://arxiv.org/abs/2609.12218) - 2026, arXiv preprint`);
		});

		it('should append DOI badge when arXiv article has a published DOI', () => {
			const info = {
				title: 'Test Preprint',
				journal: 'Phys. Rev. Lett.',
				year: '2026',
				arxivId: '2609.12218',
				doi: '10.1103/test.123',
				articleType: 'Preprint'
			};

			const citation = formatCitation(info);
			expect(citation).to.equal(`${badge('arXiv', 'arxiv.svg', 'https://arxiv.org/abs/2609.12218')} ${articleTypeIcon('Preprint')} Preprint: [Test Preprint](https://arxiv.org/abs/2609.12218) - 2026, Phys. Rev. Lett. ${badge('DOI', 'doi.svg', 'https://doi.org/10.1103/test.123')}`);
		});
	});

	describe('WoS citations', () => {
		const wosUrl = 'https://www.webofscience.com/wos/woscc/full-record/WOS:001607817500001';

		it('should format citation with WoS ID', () => {
			const info = {
				title: 'Test WoS Article',
				journal: 'Nature',
				year: '2024',
				wosId: 'WOS:001607817500001',
				articleType: 'Article'
			};

			const citation = formatCitation(info);
			expect(citation).to.equal(`${badge('Web of Science', 'clarivate.svg', wosUrl)} ${articleTypeIcon('Article')} Article: [Test WoS Article](${wosUrl}) - 2024, Nature`);
		});

		it('should append DOI badge when WoS article has a DOI', () => {
			const info = {
				title: 'Test WoS Article',
				journal: 'Nature',
				year: '2024',
				wosId: 'WOS:001607817500001',
				doi: '10.1038/test.456',
				articleType: 'Article'
			};

			const citation = formatCitation(info);
			expect(citation).to.include(badge('DOI', 'doi.svg', 'https://doi.org/10.1038/test.456'));
		});

		it('should prefer PubMed link when WoS record carries a pmid', () => {
			const info = {
				title: 'Test WoS Article',
				journal: 'Nature',
				year: '2024',
				wosId: 'WOS:001607817500001',
				pubmedId: '38570095',
				articleType: 'Article'
			};

			const citation = formatCitation(info);
			expect(citation).to.include(`[Test WoS Article](${PUBMED_URL})`);
			expect(citation).to.include(badge('Web of Science', 'clarivate.svg', wosUrl));
		});
	});

	describe('edge cases', () => {
		it('should handle empty title', () => {
			const info = {
				title: '',
				journal: 'Test Journal',
				year: '2024',
				pubmedId: '38570095',
				articleType: 'Article'
			};

			const citation = formatCitation(info);
			expect(citation).to.include('[]');
		});

		it('should handle special characters in title', () => {
			const info = {
				title: 'Test: A Study of "Special" Characters & More',
				journal: 'Test Journal',
				year: '2024',
				pubmedId: '38570095',
				articleType: 'Article'
			};

			const citation = formatCitation(info);
			expect(citation).to.include('Test: A Study of "Special" Characters & More');
		});

		it('should return empty string when no IDs provided', () => {
			const info = {
				title: 'Test Article',
				journal: 'Test Journal',
				year: '2024',
				articleType: 'Article'
			};

			const citation = formatCitation(info);
			expect(citation).to.equal('');
		});

		it('should show PMC and DOI badges when both present with PubMed', () => {
			const info = {
				title: 'Test Article',
				journal: 'Test Journal',
				year: '2024',
				pubmedId: '38570095',
				pmcId: 'PMC1234567',
				doi: '10.1000/test.doi',
				articleType: 'Article'
			};

			const citation = formatCitation(info);
			expect(citation).to.include('pmc.svg');
			expect(citation).to.include('doi.svg');
		});

		it('should handle long journal names', () => {
			const info = {
				title: 'Test Article',
				journal: 'The International Journal of Very Long Journal Names and Academic Publishing',
				year: '2024',
				pubmedId: '38570095',
				articleType: 'Article'
			};

			const citation = formatCitation(info);
			expect(citation).to.include('The International Journal of Very Long Journal Names and Academic Publishing');
		});
	});

	describe('source provider ordering', () => {
		it('should lead with the PMC badge when the PMC link was the source', () => {
			const info = {
				title: 'Test Article Title',
				journal: 'Test Journal',
				year: '2024',
				pubmedId: '38570095',
				pmcId: 'PMC1234567',
				articleType: 'Article'
			};

			const citation = formatCitation(info, pmcProvider);
			expect(citation).to.equal(
				`${badge('PMC', 'pmc.svg', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1234567/')} ${articleTypeIcon('Article')} Article: [Test Article Title](https://pmc.ncbi.nlm.nih.gov/articles/PMC1234567/) - 2024, Test Journal ${PUBMED_BADGE}`
			);
		});

		it('should lead with the WoS badge when the WoS record was the source', () => {
			const info = {
				title: 'Test WoS Article',
				journal: 'Nature',
				year: '2024',
				wosId: 'WOS:001607817500001',
				pubmedId: '38570095',
				articleType: 'Article'
			};

			const citation = formatCitation(info, wosProvider);
			const wosUrl = 'https://www.webofscience.com/wos/woscc/full-record/WOS:001607817500001';
			expect(citation).to.include(`[Test WoS Article](${wosUrl})`);
			expect(citation.startsWith(badge('Web of Science', 'clarivate.svg', wosUrl))).toBe(true);
			expect(citation).to.include(PUBMED_BADGE);
		});

		it('should lead with the DOI badge when the DOI link was the source', () => {
			const info = {
				title: 'Test Article',
				journal: 'Test Journal',
				year: '2024',
				pubmedId: '38570095',
				doi: '10.1000/test.doi',
				articleType: 'Article'
			};

			const citation = formatCitation(info, doiProvider);
			expect(citation.startsWith(badge('DOI', 'doi.svg', 'https://doi.org/10.1000/test.doi'))).toBe(true);
			expect(citation).to.include(`[Test Article](https://doi.org/10.1000/test.doi)`);
			expect(citation).to.include(PUBMED_BADGE);
		});

		it('should fall back to CITATION_ORDER when the source yields no URL', () => {
			const info = {
				title: 'Test Article',
				journal: 'Test Journal',
				year: '2024',
				arxivId: '2609.12218',
				articleType: 'Preprint'
			};

			const citation = formatCitation(info, pubmedProvider);
			expect(citation.startsWith(badge('arXiv', 'arxiv.svg', 'https://arxiv.org/abs/2609.12218'))).toBe(true);
		});
	});
});

describe('normalizeArticleType', () => {
	it('should normalize PubMed pubtypes to canonical labels', () => {
		expect(normalizeArticleType('Journal Article')).toBe('Article');
		expect(normalizeArticleType('Meta-Analysis')).toBe('Review');
		expect(normalizeArticleType('Systematic Review')).toBe('Review');
		expect(normalizeArticleType('Randomized Controlled Trial')).toBe('Clinical Trial');
		expect(normalizeArticleType('Case Reports')).toBe('Case Report');
		expect(normalizeArticleType('Preprint')).toBe('Preprint');
		expect(normalizeArticleType('Editorial')).toBe('Editorial');
		expect(normalizeArticleType('Letter')).toBe('Letter');
		expect(normalizeArticleType('Newspaper Article')).toBe('News');
	});

	it('should normalize CrossRef types to canonical labels', () => {
		expect(normalizeArticleType('journal-article')).toBe('Article');
		expect(normalizeArticleType('proceedings-article')).toBe('Proceedings');
		expect(normalizeArticleType('book-chapter')).toBe('Book Chapter');
		expect(normalizeArticleType('monograph')).toBe('Book');
		expect(normalizeArticleType('posted-content')).toBe('Preprint');
		expect(normalizeArticleType('dataset')).toBe('Dataset');
		expect(normalizeArticleType('dissertation')).toBe('Thesis');
		expect(normalizeArticleType('report')).toBe('Report');
	});

	it('should normalize WoS types to canonical labels', () => {
		expect(normalizeArticleType('Article')).toBe('Article');
		expect(normalizeArticleType('Review')).toBe('Review');
		expect(normalizeArticleType('Proceeding Paper')).toBe('Proceedings');
		expect(normalizeArticleType('Early Access')).toBe('Article');
		expect(normalizeArticleType('Editorial Material')).toBe('Editorial');
		expect(normalizeArticleType('Book Chapter')).toBe('Book Chapter');
		expect(normalizeArticleType('News Item')).toBe('News');
		expect(normalizeArticleType('Data Paper')).toBe('Dataset');
	});

	it('should pass through unknown types unchanged', () => {
		expect(normalizeArticleType('Biography')).toBe('Biography');
		expect(normalizeArticleType('Historical Article')).toBe('Historical Article');
	});

	it('should return undefined for empty or missing input', () => {
		expect(normalizeArticleType(undefined)).toBeUndefined();
		expect(normalizeArticleType('')).toBeUndefined();
		expect(normalizeArticleType('   ')).toBeUndefined();
	});

	it('should trim surrounding whitespace', () => {
		expect(normalizeArticleType('  Review  ')).toBe('Review');
	});
});

describe('canonical URL builders', () => {
	it('should build provider record URLs', () => {
		expect(pubmedUrl('38570095')).toBe('https://pubmed.ncbi.nlm.nih.gov/38570095/');
		expect(pmcUrl('PMC6792392')).toBe('https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/');
		expect(doiUrl('10.1016/j.clinme.2024.100038')).toBe('https://doi.org/10.1016/j.clinme.2024.100038');
		expect(arxivAbsUrl('2609.12218')).toBe('https://arxiv.org/abs/2609.12218');
		expect(wosRecordUrl('WOS:001607817500001')).toBe(
			'https://www.webofscience.com/wos/woscc/full-record/WOS:001607817500001'
		);
	});

	it('doiUrl should strip doi: prefixes and whitespace', () => {
		expect(doiUrl('doi: 10.1234/test ')).toBe('https://doi.org/10.1234/test');
	});
});

describe('providerBadge', () => {
	it('should render a 16px logo image linked to the source URL', () => {
		expect(providerBadge('PubMed', 'pubmed.svg', 'https://example.com/x')).toBe(
			`[![PubMed|16](${LOGO_BASE}/pubmed.svg)](https://example.com/x)`
		);
	});
});

describe('central icon catalog', () => {
	it('should render the supported icon source types', () => {
		expect(renderIcon(APP_ICONS.status.permanentFailure)).toBe('🔴');
		expect(renderIcon(APP_ICONS.ui.fetch)).toBe('download');
		expect(renderIcon({ kind: 'asset', alt: 'Book', file: 'book.svg' })).toBe(
			`![Book|16](${LOGO_BASE}/book.svg)`
		);
	});

	it('should map canonical article types to central icons', () => {
		expect(articleTypeIcon('Book')).toBe('📖');
		expect(articleTypeIcon('News')).toBe('📰');
		expect(articleTypeIcon('Unknown provider type')).toBe('📄');
		expect(articleTypeIcon(undefined)).toBe('📄');
		expect(failureMarkerSymbol('permanent')).toBe('🔴');
		expect(failureMarkerSymbol('transient')).toBe('🟡');
	});
});
