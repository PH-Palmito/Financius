import type { Position } from '../domain/types';

export type AssetCatalogItem = Pick<
  Position,
  'ticker' | 'name' | 'type' | 'sector' | 'currentPrice' | 'ceilingPrice' | 'fairPrice'
>;

export const assetCatalog: AssetCatalogItem[] = [
  {
    ticker: 'PETR4',
    name: 'Petrobras PN',
    type: 'Acao',
    sector: 'Energia',
    currentPrice: 38.42,
    ceilingPrice: 34.5,
    fairPrice: 44.0,
  },
  {
    ticker: 'VALE3',
    name: 'Vale ON',
    type: 'Acao',
    sector: 'Materiais basicos',
    currentPrice: 61.18,
    ceilingPrice: 58.0,
    fairPrice: 72.0,
  },
  {
    ticker: 'TAEE11',
    name: 'Taesa Units',
    type: 'Acao',
    sector: 'Energia eletrica',
    currentPrice: 35.72,
    ceilingPrice: 34.0,
    fairPrice: 39.5,
  },
  {
    ticker: 'MXRF11',
    name: 'Maxi Renda FII',
    type: 'FII',
    sector: 'Papel',
    currentPrice: 10.31,
    ceilingPrice: 10.0,
    fairPrice: 10.8,
  },
  {
    ticker: 'KNRI11',
    name: 'Kinea Renda Imobiliaria',
    type: 'FII',
    sector: 'Hibrido',
    currentPrice: 152.4,
    ceilingPrice: 148.0,
    fairPrice: 164.0,
  },
  {
    ticker: 'IVVB11',
    name: 'ETF S&P 500',
    type: 'ETF',
    sector: 'Exterior',
    currentPrice: 342.7,
    ceilingPrice: 0,
    fairPrice: 0,
  },
];

export function searchAssetCatalog(query: string) {
  const normalizedQuery = normalize(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  return assetCatalog
    .filter((asset) => {
      const ticker = normalize(asset.ticker);
      const name = normalize(asset.name);
      return ticker.includes(normalizedQuery) || name.includes(normalizedQuery);
    })
    .slice(0, 4);
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
