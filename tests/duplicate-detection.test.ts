/**
 * Unit tests for duplicate citation detection
 */

import { describe, it, expect } from 'vitest';
import {
	isAlreadyCited,
	isPubMedIdCited,
	isPMCIdCited,
	isDOICited,
	isArxivIdCited,
	isWosIdCited,
	failureMarker,
	providerIcon,
} from '../src/utils';

describe('Duplicate Citation Detection', () => {
	describe('PubMed ID detection', () => {
		it('should detect already cited PubMed article', () => {
			const content = '📚 Article: [An introduction to neuropalliative care](https://pubmed.ncbi.nlm.nih.gov/38570095/) - 2024, Clin Med (Lond)';
			expect(isAlreadyCited(content, { pubmedId: '38570095' })).to.be.true;
		});

		it('should not detect uncited PubMed article', () => {
			const content = 'Check this article: https://pubmed.ncbi.nlm.nih.gov/38570095/';
			expect(isAlreadyCited(content, { pubmedId: '38570095' })).to.be.false;
		});

		it('should detect PubMed article with ID as link text', () => {
			const content = 'Article: [38570095](https://pubmed.ncbi.nlm.nih.gov/38570095/) - Year, Journal';
			expect(isAlreadyCited(content, { pubmedId: '38570095' })).to.be.true;
		});

		it('should not detect different PubMed ID', () => {
			const content = '📚 Article: [Title](https://pubmed.ncbi.nlm.nih.gov/12345678/) - 2024, Journal';
			expect(isAlreadyCited(content, { pubmedId: '38570095' })).to.be.false;
		});
	});

	describe('DOI detection', () => {
		it('should detect already cited DOI', () => {
			const content = '🔗 Article: [Test Title](https://doi.org/10.1016/j.clinme.2024.100038) - 2024, Test Journal';
			expect(isAlreadyCited(content, { doi: '10.1016/j.clinme.2024.100038' })).to.be.true;
		});

		it('should not detect uncited DOI', () => {
			const content = 'Read more: https://doi.org/10.1016/j.clinme.2024.100038';
			expect(isAlreadyCited(content, { doi: '10.1016/j.clinme.2024.100038' })).to.be.false;
		});

		it('should detect DOI with different citation format', () => {
			const content = 'Article: [Title](https://doi.org/10.1016/j.clinme.2024.100038) - 2024, Journal';
			expect(isAlreadyCited(content, { doi: '10.1016/j.clinme.2024.100038' })).to.be.true;
		});

		it('should handle DOI with "doi:" prefix', () => {
			const content = '🔗 Article: [Title](https://doi.org/10.1016/j.clinme.2024.100038) - 2024, Journal';
			expect(isAlreadyCited(content, { doi: 'doi: 10.1016/j.clinme.2024.100038' })).to.be.true;
		});
	});

	describe('PMC ID detection', () => {
		it('should detect already cited PMC article', () => {
			const content = '📚 Article: [Title](https://pubmed.ncbi.nlm.nih.gov/6792392/) - 2024, Journal [📄](https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/)';
			expect(isAlreadyCited(content, { pmcId: 'PMC6792392' })).to.be.true;
		});

		it('should not detect uncited PMC article', () => {
			const content = 'Full text available: https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/';
			expect(isAlreadyCited(content, { pmcId: 'PMC6792392' })).to.be.false;
		});

		it('should not detect different PMC ID', () => {
			const content = '📚 Article: [Title](https://pubmed.ncbi.nlm.nih.gov/123/) - 2024, Journal [📄](https://pmc.ncbi.nlm.nih.gov/articles/PMC12345678/)';
			expect(isAlreadyCited(content, { pmcId: 'PMC6792392' })).to.be.false;
		});
	});

	describe('arXiv ID detection', () => {
		it('should detect already cited arXiv article', () => {
			const content = '📄 Preprint: [Test Title](https://arxiv.org/abs/2609.12218) - 2026, arXiv preprint';
			expect(isAlreadyCited(content, { arxivId: '2609.12218' })).to.be.true;
		});

		it('should detect manually formatted arXiv markdown link', () => {
			const content = '[arXiv:2609.12218](https://arxiv.org/abs/2609.12218)';
			expect(isAlreadyCited(content, { arxivId: '2609.12218' })).to.be.true;
		});

		it('should not detect a bare arXiv URL', () => {
			const content = 'Read the preprint: https://arxiv.org/abs/2609.12218';
			expect(isAlreadyCited(content, { arxivId: '2609.12218' })).to.be.false;
		});

		it('should not detect a different arXiv ID', () => {
			const content = '📄 Preprint: [Title](https://arxiv.org/abs/1234.56789) - 2020, arXiv preprint';
			expect(isAlreadyCited(content, { arxivId: '2609.12218' })).to.be.false;
		});
	});

	describe('WoS ID detection', () => {
		const wosUrl = 'https://www.webofscience.com/wos/woscc/full-record/WOS:001607817500001';

		it('should detect already cited WoS article', () => {
			const content = `🔍 Article: [Test Title](${wosUrl}) - 2024, Test Journal`;
			expect(isAlreadyCited(content, { wosId: 'WOS:001607817500001' })).to.be.true;
		});

		it('should not detect a bare WoS URL', () => {
			const content = `Record: ${wosUrl}`;
			expect(isAlreadyCited(content, { wosId: 'WOS:001607817500001' })).to.be.false;
		});

		it('should not detect a different WoS ID', () => {
			const content = '🔍 Article: [Title](https://www.webofscience.com/wos/woscc/full-record/WOS:000252077700005) - 2024, Journal';
			expect(isAlreadyCited(content, { wosId: 'WOS:001607817500001' })).to.be.false;
		});
	});

	describe('mixed content scenarios', () => {
		it('should handle content with multiple citations', () => {
			const content = `
				Already cited: 📚 Article: [Existing Article](https://pubmed.ncbi.nlm.nih.gov/12345678/) - 2023, Test Journal
				New PubMed: https://pubmed.ncbi.nlm.nih.gov/38570095/
				Already cited DOI: 🔗 Article: [Existing DOI](https://doi.org/10.1000/existing.doi) - 2023, Test Journal
				New DOI: https://doi.org/10.1016/j.clinme.2024.100038
			`;

			expect(isAlreadyCited(content, { pubmedId: '12345678' })).to.be.true;
			expect(isAlreadyCited(content, { pubmedId: '38570095' })).to.be.false;
			expect(isAlreadyCited(content, { doi: '10.1000/existing.doi' })).to.be.true;
			expect(isAlreadyCited(content, { doi: '10.1016/j.clinme.2024.100038' })).to.be.false;
		});

		it('should handle empty content', () => {
			expect(isAlreadyCited('', { pubmedId: '38570095' })).to.be.false;
			expect(isAlreadyCited('', { doi: '10.1016/j.test.2024.001' })).to.be.false;
			expect(isAlreadyCited('', { pmcId: 'PMC6792392' })).to.be.false;
			expect(isAlreadyCited('', { arxivId: '2609.12218' })).to.be.false;
			expect(isAlreadyCited('', { wosId: 'WOS:001607817500001' })).to.be.false;
		});

		it('should handle content with no citations', () => {
			const content = 'Just some regular text without any citations.';
			expect(isAlreadyCited(content, { pubmedId: '38570095' })).to.be.false;
			expect(isAlreadyCited(content, { doi: '10.1016/j.test.2024.001' })).to.be.false;
		});

		it('should handle partial matches correctly', () => {
			const content = 'Some text with 38570095 but no proper citation format';
			expect(isAlreadyCited(content, { pubmedId: '38570095' })).to.be.false;
		});
	});

	describe('edge cases', () => {
		it('should handle special characters in IDs', () => {
			const content = '🔗 Article: [Title](https://doi.org/10.1016/j.test(2024)001) - 2024, Journal';
			expect(isAlreadyCited(content, { doi: '10.1016/j.test(2024)001' })).to.be.true;
		});

		it('should be case-insensitive for citation markers', () => {
			const content = '📚 article: [Title](https://pubmed.ncbi.nlm.nih.gov/38570095/) - 2024, Journal';
			expect(isAlreadyCited(content, { pubmedId: '38570095' })).to.be.true;
		});

		it('should handle multiple occurrences of same ID', () => {
			const content = `
				First mention: https://pubmed.ncbi.nlm.nih.gov/38570095/
				Second mention: 📚 Article: [Title](https://pubmed.ncbi.nlm.nih.gov/38570095/) - 2024, Journal
			`;
			expect(isAlreadyCited(content, { pubmedId: '38570095' })).to.be.true;
		});

		it('should detect a marked citation link without trailing slash', () => {
			const content = '📚 Article: [Title](https://pubmed.ncbi.nlm.nih.gov/38570095) - 2024, Journal';
			expect(isAlreadyCited(content, { pubmedId: '38570095' })).to.be.true;
		});

		it('should find the earliest link when both slash variants exist', () => {
			const content = '📚 Article: [A](https://pubmed.ncbi.nlm.nih.gov/38570095/) and [B](https://pubmed.ncbi.nlm.nih.gov/38570095)';
			expect(isAlreadyCited(content, { pubmedId: '38570095' })).to.be.true;
		});

		it('should keep scanning markers when the link is on a later line', () => {
			const content = `
				📚 Article: [Other](https://pubmed.ncbi.nlm.nih.gov/11111111/) - 2020, Journal
				📚 Article: [Title](https://pubmed.ncbi.nlm.nih.gov/38570095/) - 2024, Journal
			`;
			expect(isAlreadyCited(content, { pubmedId: '38570095' })).to.be.true;
		});
	});

	describe('logo badge citations', () => {
		const LOGO = 'https://raw.githubusercontent.com/gundestrup/obsidian-research/main/assets';

		it('should detect a badge-format PubMed citation', () => {
			const content = `[![PubMed|16](${LOGO}/pubmed.svg)](https://pubmed.ncbi.nlm.nih.gov/38570095/) Article: [Title](https://pubmed.ncbi.nlm.nih.gov/38570095/) - 2024, Journal`;
			expect(isAlreadyCited(content, { pubmedId: '38570095' })).to.be.true;
			expect(isPubMedIdCited(content, '38570095')).to.be.true;
		});

		it('should detect a badge-format PMC secondary link', () => {
			const content = `[![PubMed|16](${LOGO}/pubmed.svg)](https://pubmed.ncbi.nlm.nih.gov/6792392/) Article: [Title](https://pubmed.ncbi.nlm.nih.gov/6792392/) - 2024, Journal [![PMC|16](${LOGO}/pmc.svg)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/)`;
			expect(isPMCIdCited(content, 'PMC6792392')).to.be.true;
			expect(isAlreadyCited(content, { pmcId: 'PMC6792392' })).to.be.true;
		});

		it('should detect badge-format arXiv and WoS citations', () => {
			const arxiv = `[![arXiv|16](${LOGO}/arxiv.svg)](https://arxiv.org/abs/2609.12218) Preprint: [Title](https://arxiv.org/abs/2609.12218) - 2026, arXiv preprint`;
			expect(isArxivIdCited(arxiv, '2609.12218')).to.be.true;
			const wos = `[![Web of Science|16](${LOGO}/clarivate.svg)](https://www.webofscience.com/wos/woscc/full-record/WOS:001607817500001) Article: [Title](https://www.webofscience.com/wos/woscc/full-record/WOS:001607817500001) - 2024, Journal`;
			expect(isWosIdCited(wos, 'WOS:001607817500001')).to.be.true;
		});

		it('should detect title and year in badge-format citations', () => {
			const content = `[![PubMed|16](${LOGO}/pubmed.svg)](https://pubmed.ncbi.nlm.nih.gov/38570095/) Article: [An introduction to neuropalliative care](https://pubmed.ncbi.nlm.nih.gov/38570095/) - 2024, Clin Med (Lond)`;
			expect(isAlreadyCited(content, { title: 'An introduction to neuropalliative care', year: '2024' })).to.be.true;
		});
	});

	describe('title and year detection', () => {
		const cited =
			'📚 Article: [An introduction to neuropalliative care](https://pubmed.ncbi.nlm.nih.gov/38570095/) - 2024, Clin Med (Lond)';

		it('should detect citation by title and year', () => {
			expect(
				isAlreadyCited(cited, { title: 'An introduction to neuropalliative care', year: '2024' })
			).to.be.true;
		});

		it('should match title and year case-insensitively', () => {
			expect(
				isAlreadyCited(cited, { title: 'AN INTRODUCTION TO NEUROPALLIATIVE CARE', year: '2024' })
			).to.be.true;
		});

		it('should not detect a different year', () => {
			expect(
				isAlreadyCited(cited, { title: 'An introduction to neuropalliative care', year: '2023' })
			).to.be.false;
		});

		it('should not detect a different title', () => {
			expect(
				isAlreadyCited(cited, { title: 'A different article', year: '2024' })
			).to.be.false;
		});

		it('should require the citation marker on the same line', () => {
			const content = `
				Plain link: [An introduction to neuropalliative care](https://example.com) - 2024
				📚 Article: [Another article](https://pubmed.ncbi.nlm.nih.gov/12345678/) - 2023, Journal
			`;
			expect(
				isAlreadyCited(content, { title: 'An introduction to neuropalliative care', year: '2024' })
			).to.be.false;
		});

		it('should use the earliest citation marker when marker types appear out of order', () => {
			const content = '🔗 source then 📚 Article: [An introduction to neuropalliative care](https://example.com) - 2024, Journal';
			expect(
				isAlreadyCited(content, { title: 'An introduction to neuropalliative care', year: '2024' })
			).to.be.true;
		});
	});
});

describe('Identifier citation helpers', () => {
	describe('isPubMedIdCited', () => {
		it('should detect a PubMed markdown link', () => {
			const content = '📚 Article: [Title](https://pubmed.ncbi.nlm.nih.gov/38570095/) - 2024, Journal';
			expect(isPubMedIdCited(content, '38570095')).to.be.true;
		});

		it('should not detect a bare PubMed URL', () => {
			const content = 'Check https://pubmed.ncbi.nlm.nih.gov/38570095/ for details';
			expect(isPubMedIdCited(content, '38570095')).to.be.false;
		});

		it('should not detect a different PubMed ID', () => {
			const content = '📚 Article: [Title](https://pubmed.ncbi.nlm.nih.gov/12345678/) - 2024, Journal';
			expect(isPubMedIdCited(content, '38570095')).to.be.false;
		});
	});

	describe('isPMCIdCited', () => {
		it('should detect a PMC markdown link', () => {
			const content = '📚 Article: [Title](https://pubmed.ncbi.nlm.nih.gov/6792392/) - 2024, Journal [📄](https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/)';
			expect(isPMCIdCited(content, 'PMC6792392')).to.be.true;
		});

		it('should not detect a bare PMC URL', () => {
			const content = 'Full text: https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/';
			expect(isPMCIdCited(content, 'PMC6792392')).to.be.false;
		});
	});

	describe('isDOICited', () => {
		it('should detect a DOI markdown link', () => {
			const content = '🔗 Article: [Title](https://doi.org/10.1016/j.clinme.2024.100038) - 2024, Journal';
			expect(isDOICited(content, '10.1016/j.clinme.2024.100038')).to.be.true;
		});

		it('should not detect a bare DOI URL', () => {
			const content = 'Read more: https://doi.org/10.1016/j.clinme.2024.100038';
			expect(isDOICited(content, '10.1016/j.clinme.2024.100038')).to.be.false;
		});
	});

	describe('isArxivIdCited', () => {
		it('should detect an arXiv markdown link', () => {
			const content = '📄 Preprint: [Title](https://arxiv.org/abs/2609.12218) - 2026, arXiv preprint';
			expect(isArxivIdCited(content, '2609.12218')).to.be.true;
		});

		it('should not detect a bare arXiv URL', () => {
			const content = 'See https://arxiv.org/abs/2609.12218 for the preprint';
			expect(isArxivIdCited(content, '2609.12218')).to.be.false;
		});
	});

	describe('isWosIdCited', () => {
		it('should detect a WoS markdown link', () => {
			const content = '🔍 Article: [Title](https://www.webofscience.com/wos/woscc/full-record/WOS:001607817500001) - 2024, Journal';
			expect(isWosIdCited(content, 'WOS:001607817500001')).to.be.true;
		});

		it('should not detect a bare WoS URL', () => {
			const content = 'Record: https://www.webofscience.com/wos/woscc/full-record/WOS:001607817500001';
			expect(isWosIdCited(content, 'WOS:001607817500001')).to.be.false;
		});
	});

	describe('fetch-failure markers', () => {
		const icon = providerIcon('X', 'x.svg');

		it('should not treat a PubMed failure marker as cited', () => {
			const content = `${failureMarker('pubmed=38570095', 'permanent')} ${icon} https://pubmed.ncbi.nlm.nih.gov/38570095/`;
			expect(isPubMedIdCited(content, '38570095')).toBe(false);
			expect(isAlreadyCited(content, { pubmedId: '38570095' })).toBe(false);
		});

		it('should not treat a PMC failure marker as cited', () => {
			const content = `${failureMarker('pmc=PMC6792392', 'permanent')} ${icon} https://pmc.ncbi.nlm.nih.gov/articles/PMC6792392/`;
			expect(isPMCIdCited(content, 'PMC6792392')).toBe(false);
		});

		it('should not treat a DOI failure marker as cited', () => {
			const content = `${failureMarker('doi=10.1234/test', 'transient')} ${icon} https://doi.org/10.1234/test`;
			expect(isDOICited(content, '10.1234/test')).toBe(false);
		});

		it('should not treat an arXiv failure marker as cited', () => {
			const content = `${failureMarker('arxiv=2609.12218', 'permanent')} ${icon} https://arxiv.org/abs/2609.12218`;
			expect(isArxivIdCited(content, '2609.12218')).toBe(false);
		});

		it('should not treat a WoS failure marker as cited', () => {
			const content = `${failureMarker('wos=001607817500001', 'transient')} ${icon} WOS:001607817500001`;
			expect(isWosIdCited(content, 'WOS:001607817500001')).toBe(false);
		});
	});
});
