import type { Transaction } from './types';

export function calculateAveragePrice(transactions: Transaction[]) {
  return transactions.reduce(
    (position, transaction) => {
      if (transaction.type === 'buy') {
        const cost = transaction.quantity * transaction.price + transaction.fees;
        const nextQuantity = position.quantity + transaction.quantity;
        const nextCost = position.cost + cost;

        return {
          quantity: nextQuantity,
          cost: nextCost,
          averagePrice: nextQuantity > 0 ? nextCost / nextQuantity : 0,
        };
      }

      const soldQuantity = Math.min(transaction.quantity, position.quantity);
      const remainingQuantity = position.quantity - soldQuantity;
      const remainingCost = position.averagePrice * remainingQuantity;

      return {
        quantity: remainingQuantity,
        cost: remainingCost,
        averagePrice: remainingQuantity > 0 ? remainingCost / remainingQuantity : 0,
      };
    },
    { quantity: 0, cost: 0, averagePrice: 0 },
  );
}

export function groupTransactionsByTicker(transactions: Transaction[]) {
  return transactions.reduce<Record<string, Transaction[]>>((groups, transaction) => {
    const current = groups[transaction.ticker] || [];
    groups[transaction.ticker] = [...current, transaction];
    return groups;
  }, {});
}
