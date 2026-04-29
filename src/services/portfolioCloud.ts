import type { Position, Transaction } from '../domain/types';
import { supabase } from './supabase';

type PortfolioPayload = {
  assets: Position[];
  transactions: Transaction[];
};

export async function loadCloudPortfolio(userId: string) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_portfolios')
    .select('assets, transactions')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    assets: Array.isArray(data.assets) ? (data.assets as Position[]) : [],
    transactions: Array.isArray(data.transactions)
      ? (data.transactions as Transaction[])
      : [],
  };
}

export async function saveCloudPortfolio(userId: string, portfolio: PortfolioPayload) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('user_portfolios').upsert({
    user_id: userId,
    assets: portfolio.assets,
    transactions: portfolio.transactions,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}
