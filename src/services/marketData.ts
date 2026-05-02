import { env } from '../config/env';
import { assetCatalog } from '../data/assetCatalog';
import type { Position } from '../domain/types';

export type QuoteSource = 'mock' | 'api';

export type MarketQuote = {
  ticker: string;
  price: number;
  currency: string;
  source: QuoteSource;
  updatedAt: string;
};

export async function resolveLatestQuote(ticker: string): Promise<MarketQuote | null> {
  const normalizedTicker = ticker.trim().toUpperCase();

  if (!normalizedTicker) {
    return null;
  }

  if (env.marketDataProvider === 'api' && env.marketDataApiBaseUrl) {
    return fetchQuoteFromApi(normalizedTicker);
  }

  return resolveMockQuote(normalizedTicker);
}

export async function refreshPortfolioQuotes(positions: Position[]) {
  const quotes = await Promise.all(
    positions.map((position) => resolveLatestQuote(position.ticker)),
  );

  const quotesByTicker = new Map(
    quotes
      .filter((quote): quote is MarketQuote => Boolean(quote))
      .map((quote) => [quote.ticker, quote]),
  );

  return {
    positions: positions.map((position) => {
      const quote = quotesByTicker.get(position.ticker);

      if (!quote) {
        return position;
      }

      return {
        ...position,
        currentPrice: quote.price,
      };
    }),
    quotes: Array.from(quotesByTicker.values()),
    updatedAt: new Date().toISOString(),
  };
}

function resolveMockQuote(ticker: string): MarketQuote | null {
  const asset = assetCatalog.find((item) => item.ticker === ticker);

  if (!asset) {
    return null;
  }

  return {
    ticker,
    price: asset.currentPrice,
    currency: env.defaultCurrency,
    source: 'mock',
    updatedAt: new Date().toISOString(),
  };
}

async function fetchQuoteFromApi(ticker: string): Promise<MarketQuote | null> {
  const url = `${env.marketDataApiBaseUrl.replace(/\/$/, '')}/quotes/${ticker}`;
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as Partial<MarketQuote>;

  if (typeof data.price !== 'number') {
    return null;
  }

  return {
    ticker,
    price: data.price,
    currency: data.currency || env.defaultCurrency,
    source: 'api',
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}
