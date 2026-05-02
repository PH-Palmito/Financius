import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { env } from '../../config/env';
import type { Transaction } from '../../domain/types';
import { formatDate } from '../../utils/format';

const currency = new Intl.NumberFormat(env.defaultLocale, {
  style: 'currency',
  currency: env.defaultCurrency,
});

export function TransactionRow({
  transaction,
  compact,
}: {
  transaction: Transaction;
  compact?: boolean;
}) {
  const isBuy = transaction.type === 'buy';

  return (
    <View style={[styles.transactionRow, compact && styles.transactionRowCompact]}>
      <View style={[styles.transactionIcon, isBuy ? styles.buyIcon : styles.sellIcon]}>
        <Ionicons
          color={isBuy ? '#0E7A4F' : '#B64242'}
          name={isBuy ? 'arrow-down-outline' : 'arrow-up-outline'}
          size={18}
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.rowTitle}>{transaction.ticker}</Text>
        <Text style={styles.muted}>
          {isBuy ? 'Compra' : 'Venda'} - {transaction.quantity} un. - {formatDate(transaction.date)}
        </Text>
      </View>
      <View style={styles.transactionValueBlock}>
        <Text style={styles.transactionAmount}>
          {currency.format(transaction.quantity * transaction.price + transaction.fees)}
        </Text>
        <Text style={styles.transactionFees}>taxas {currency.format(transaction.fees)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: {
    color: '#657487',
    fontSize: 13,
    lineHeight: 18,
  },
  rowTitle: {
    color: '#172434',
    fontSize: 14,
    fontWeight: '900',
  },
  transactionRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 14,
  },
  transactionRowCompact: {
    marginBottom: 0,
    marginTop: 10,
    padding: 10,
  },
  transactionIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  buyIcon: {
    backgroundColor: '#E8F6EF',
  },
  sellIcon: {
    backgroundColor: '#FCEBEB',
  },
  transactionInfo: {
    flex: 1,
    gap: 3,
  },
  transactionValueBlock: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    color: '#172434',
    fontSize: 14,
    fontWeight: '900',
  },
  transactionFees: {
    color: '#657487',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
});
