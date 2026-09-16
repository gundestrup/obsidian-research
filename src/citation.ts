import type { ArticleInfo } from './types';
import { articleTypeIcon } from './icons';
import { CITATION_ORDER, type ArticleProvider } from './providers';
import { providerBadge } from './utils';

export function formatCitation(info: ArticleInfo, source?: ArticleProvider): string {
	const type = info.articleType || 'Article';
	const links: { badge: string; url: string }[] = [];
	const ordered = source ? [source, ...CITATION_ORDER.filter((p) => p !== source)] : CITATION_ORDER;

	for (const provider of ordered) {
		const url = provider.citationUrl(info);
		if (url && !links.some((link) => link.url === url)) {
			links.push({ badge: providerBadge(provider.badge.alt, provider.badge.logo, url), url });
		}
	}

	const [primary, ...secondary] = links;
	if (!primary) return '';
	const extras = secondary.map((link) => link.badge).join(' ');
	return `${primary.badge} ${articleTypeIcon(type)} ${type}: [${info.title}](${primary.url}) - ${info.year}, ${info.journal}${extras ? ' ' + extras : ''}`;
}
