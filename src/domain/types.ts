import type { Ionicons } from '@expo/vector-icons';

export type AssetType = 'Acao' | 'FII' | 'ETF' | 'Renda fixa';

export type Position = {
  ticker: string;
  name: string;
  type: AssetType;
  sector: string;
  allocation: number;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  ceilingPrice: number;
  fairPrice: number;
};

export type Dividend = {
  ticker: string;
  sector: string;
  amount: number;
  yieldOnCost: number;
  lastPayment: string;
};

export type Transaction = {
  id: string;
  ticker: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  fees: number;
  date: string;
};

export type ChartPoint = {
  label: string;
  value: number;
};

export type AllocationSlice = {
  label: string;
  value: number;
  color: string;
};

export type AlertItem = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
};
