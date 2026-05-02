import { assetCatalog, type AssetCatalogItem } from '../data/assetCatalog';

export type AssetMatch = AssetCatalogItem & {
  confidence: 'high' | 'medium';
  matchedBy: 'ticker' | 'name';
};

export function resolveAssetCandidates(query: string, limit = 4): AssetMatch[] {
  const normalizedQuery = normalizeAssetQuery(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  return assetCatalog
    .map((asset) => {
      const ticker = normalizeAssetQuery(asset.ticker);
      const name = normalizeAssetQuery(asset.name);
      const tickerMatches = ticker.includes(normalizedQuery);
      const nameMatches = name.includes(normalizedQuery);

      if (!tickerMatches && !nameMatches) {
        return null;
      }

      const exactTicker = ticker === normalizedQuery;
      const startsWithTicker = ticker.startsWith(normalizedQuery);
      const startsWithName = name.startsWith(normalizedQuery);

      return {
        ...asset,
        confidence: exactTicker || startsWithTicker || startsWithName ? 'high' : 'medium',
        matchedBy: tickerMatches ? 'ticker' : 'name',
      } satisfies AssetMatch;
    })
    .filter((asset): asset is AssetMatch => Boolean(asset))
    .sort((a, b) => scoreAssetMatch(b, normalizedQuery) - scoreAssetMatch(a, normalizedQuery))
    .slice(0, limit);
}

export function resolveBestAsset(query: string) {
  const [best] = resolveAssetCandidates(query, 1);
  return best?.confidence === 'high' ? best : null;
}

export function normalizeAssetQuery(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function scoreAssetMatch(asset: AssetMatch, normalizedQuery: string) {
  const ticker = normalizeAssetQuery(asset.ticker);
  const name = normalizeAssetQuery(asset.name);

  if (ticker === normalizedQuery) {
    return 100;
  }

  if (ticker.startsWith(normalizedQuery)) {
    return 80;
  }

  if (name.startsWith(normalizedQuery)) {
    return 60;
  }

  return asset.matchedBy === 'ticker' ? 40 : 20;
}
