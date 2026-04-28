import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Position, Transaction } from '../domain/types';

const ASSETS_KEY = '@financius/assets';
const TRANSACTIONS_KEY = '@financius/transactions';

export async function loadStoredPortfolio() {
  const [assetsValue, transactionsValue] = await Promise.all([
    AsyncStorage.getItem(ASSETS_KEY),
    AsyncStorage.getItem(TRANSACTIONS_KEY),
  ]);

  return {
    assets: parseStoredValue<Position[]>(assetsValue),
    transactions: parseStoredValue<Transaction[]>(transactionsValue),
  };
}

export async function saveStoredAssets(assets: Position[]) {
  await AsyncStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
}

export async function saveStoredTransactions(transactions: Transaction[]) {
  await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

export async function clearStoredPortfolio() {
  await Promise.all([
    AsyncStorage.removeItem(ASSETS_KEY),
    AsyncStorage.removeItem(TRANSACTIONS_KEY),
  ]);
}

function parseStoredValue<T>(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
