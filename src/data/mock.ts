import type {
  AlertItem,
  AllocationSlice,
  ChartPoint,
  Dividend,
  Position,
  Transaction,
} from '../domain/types';

export const positions: Position[] = [
  {
    ticker: 'ITSA4',
    name: 'Itausa',
    type: 'Acao',
    sector: 'Financeiro',
    allocation: 18.4,
    quantity: 620,
    averagePrice: 8.72,
    currentPrice: 10.18,
    ceilingPrice: 10.8,
    fairPrice: 12.4,
  },
  {
    ticker: 'HGLG11',
    name: 'CSHG Logistica',
    type: 'FII',
    sector: 'Logistica',
    allocation: 15.2,
    quantity: 48,
    averagePrice: 151.2,
    currentPrice: 164.6,
    ceilingPrice: 158.0,
    fairPrice: 171.0,
  },
  {
    ticker: 'BOVA11',
    name: 'ETF Ibovespa',
    type: 'ETF',
    sector: 'Indice',
    allocation: 12.8,
    quantity: 56,
    averagePrice: 111.4,
    currentPrice: 126.9,
    ceilingPrice: 121.0,
    fairPrice: 130.0,
  },
  {
    ticker: 'TESOURO IPCA+',
    name: 'Venc. 2035',
    type: 'Renda fixa',
    sector: 'Renda fixa',
    allocation: 24.5,
    quantity: 1,
    averagePrice: 11420,
    currentPrice: 11980,
    ceilingPrice: 0,
    fairPrice: 0,
  },
];

export const transactions: Transaction[] = [
  { id: 'trx-001', ticker: 'ITSA4', type: 'buy', quantity: 300, price: 8.42, fees: 1.34, date: '2026-02-12' },
  { id: 'trx-002', ticker: 'ITSA4', type: 'buy', quantity: 320, price: 9.0, fees: 1.6, date: '2026-05-17' },
  { id: 'trx-003', ticker: 'HGLG11', type: 'buy', quantity: 28, price: 149.2, fees: 2.1, date: '2026-01-21' },
  { id: 'trx-004', ticker: 'HGLG11', type: 'buy', quantity: 20, price: 154.0, fees: 1.8, date: '2026-04-09' },
  { id: 'trx-005', ticker: 'BOVA11', type: 'buy', quantity: 40, price: 109.8, fees: 1.9, date: '2026-03-03' },
  { id: 'trx-006', ticker: 'BOVA11', type: 'buy', quantity: 16, price: 115.4, fees: 1.2, date: '2026-06-11' },
  { id: 'trx-007', ticker: 'TESOURO IPCA+', type: 'buy', quantity: 1, price: 11420, fees: 0, date: '2026-01-05' },
];

export const allocation: AllocationSlice[] = [
  { label: 'Renda fixa', value: 31, color: '#2F6F73' },
  { label: 'Acoes', value: 29, color: '#2868E8' },
  { label: 'FIIs', value: 21, color: '#C9821D' },
  { label: 'ETFs', value: 13, color: '#6F5BD7' },
  { label: 'Caixa', value: 6, color: '#6C7A89' },
];

export const equityHistory: ChartPoint[] = [
  { label: 'Jan', value: 28400 },
  { label: 'Fev', value: 29680 },
  { label: 'Mar', value: 29140 },
  { label: 'Abr', value: 31420 },
  { label: 'Mai', value: 33280 },
  { label: 'Jun', value: 34860 },
  { label: 'Jul', value: 36120 },
  { label: 'Ago', value: 37940 },
];

export const benchmarkHistory: ChartPoint[] = [
  { label: 'Jan', value: 28400 },
  { label: 'Fev', value: 29110 },
  { label: 'Mar', value: 28790 },
  { label: 'Abr', value: 30020 },
  { label: 'Mai', value: 31200 },
  { label: 'Jun', value: 31990 },
  { label: 'Jul', value: 32640 },
  { label: 'Ago', value: 33480 },
];

export const dividends: Dividend[] = [
  { ticker: 'HGLG11', sector: 'Logistica', amount: 172.8, yieldOnCost: 8.9, lastPayment: '15/08' },
  { ticker: 'ITSA4', sector: 'Financeiro', amount: 148.42, yieldOnCost: 7.2, lastPayment: '01/08' },
  { ticker: 'MXRF11', sector: 'Papel', amount: 92.7, yieldOnCost: 11.4, lastPayment: '14/08' },
  { ticker: 'TAEE11', sector: 'Energia', amount: 88.3, yieldOnCost: 9.1, lastPayment: '28/07' },
  { ticker: 'BOVA11', sector: 'Indice', amount: 34.6, yieldOnCost: 2.3, lastPayment: '30/07' },
];

export const dividendHistory: ChartPoint[] = [
  { label: 'Jan', value: 264 },
  { label: 'Fev', value: 318 },
  { label: 'Mar', value: 286 },
  { label: 'Abr', value: 402 },
  { label: 'Mai', value: 438 },
  { label: 'Jun', value: 461 },
  { label: 'Jul', value: 512 },
  { label: 'Ago', value: 536 },
];

export const alerts: AlertItem[] = [
  {
    icon: 'warning-outline',
    title: 'Concentracao em financeiro',
    text: 'Financeiro representa 34% da carteira. Seu limite configurado e 30%.',
  },
  {
    icon: 'cash-outline',
    title: 'Renda mensal subindo',
    text: 'Dividendos dos ultimos 3 meses cresceram 18% contra o trimestre anterior.',
  },
  {
    icon: 'newspaper-outline',
    title: 'Noticia relevante em bancos',
    text: 'Aumento de inadimplencia pode pressionar lucro e dividendos futuros.',
  },
];

export const news = [
  'Resultado trimestral de bancos veio misto, com pressao em provisoes.',
  'FIIs logisticos mantem vacancia controlada nos principais mercados.',
  'Juros futuros recuam e favorecem marcacao de renda fixa prefixada.',
];
