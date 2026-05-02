import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Metric } from '../ui';
import { env } from '../../config/env';
import { getSafetyMargin } from '../../domain/analytics';
import type { Position, Transaction } from '../../domain/types';
import { TransactionRow } from './TransactionRow';

const currency = new Intl.NumberFormat(env.defaultLocale, {
  style: 'currency',
  currency: env.defaultCurrency,
});

export function AssetDetail({
  position,
  transactions,
  onClose,
}: {
  position: Position;
  transactions: Transaction[];
  onClose: () => void;
}) {
  const invested = position.quantity * position.averagePrice;
  const current = position.quantity * position.currentPrice;
  const profit = current - invested;
  const belowCeiling =
    position.ceilingPrice > 0 && position.currentPrice <= position.ceilingPrice;
  const aboveFair = position.fairPrice > 0 && position.currentPrice > position.fairPrice;

  return (
    <View style={styles.detailPanel}>
      <View style={styles.detailHeader}>
        <View>
          <Text style={styles.detailTicker}>{position.ticker}</Text>
          <Text style={styles.muted}>{position.name}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.detailClose}>
          <Ionicons color="#657487" name="close-outline" size={20} />
        </Pressable>
      </View>

      <View style={styles.detailGrid}>
        <Metric compact label="Valor atual" value={currency.format(current)} />
        <Metric compact label="Investido" value={currency.format(invested)} />
        <Metric
          compact
          label="Resultado"
          tone={profit >= 0 ? 'positive' : undefined}
          value={currency.format(profit)}
        />
        <Metric compact label="Margem" value={getSafetyMargin(position)} />
      </View>

      <View style={styles.valuationGrid}>
        <ValuationItem label="Cotacao" value={currency.format(position.currentPrice)} />
        <ValuationItem label="Preco teto" value={formatOptionalCurrency(position.ceilingPrice)} />
        <ValuationItem label="Preco justo" value={formatOptionalCurrency(position.fairPrice)} />
      </View>

      <View style={styles.detailFlags}>
        <StatusPill
          tone={belowCeiling ? 'positive' : 'neutral'}
          text={belowCeiling ? 'Abaixo do teto' : 'Acima do teto'}
        />
        <StatusPill
          tone={aboveFair ? 'warning' : 'positive'}
          text={aboveFair ? 'Acima do justo' : 'Dentro do valor justo'}
        />
      </View>

      <View style={styles.detailTransactionsHeader}>
        <Text style={styles.rowTitle}>Lancamentos do ativo</Text>
        <Text style={styles.muted}>{transactions.length} registros</Text>
      </View>
      {transactions.slice(0, 3).map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} compact />
      ))}
    </View>
  );
}

function ValuationItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.valuationItem}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.valuationValue}>{value}</Text>
    </View>
  );
}

function StatusPill({
  text,
  tone,
}: {
  text: string;
  tone: 'positive' | 'warning' | 'neutral';
}) {
  return (
    <View
      style={[
        styles.statusPill,
        tone === 'positive' && styles.statusPillPositive,
        tone === 'warning' && styles.statusPillWarning,
      ]}
    >
      <Text
        style={[
          styles.statusPillText,
          tone === 'positive' && styles.statusPillTextPositive,
          tone === 'warning' && styles.statusPillTextWarning,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function formatOptionalCurrency(value: number) {
  return value > 0 ? currency.format(value) : 'Nao definido';
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
  metricLabel: {
    color: '#657487',
    fontSize: 12,
    fontWeight: '800',
  },
  detailPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CFE0F6',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  detailHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  detailTicker: {
    color: '#172434',
    fontSize: 24,
    fontWeight: '900',
  },
  detailClose: {
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  detailGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
  },
  valuationGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  valuationItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    flex: 1,
    minHeight: 62,
    padding: 10,
  },
  valuationValue: {
    color: '#172434',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 6,
  },
  detailFlags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  statusPill: {
    backgroundColor: '#F0F4F8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPillPositive: {
    backgroundColor: '#E8F6EF',
  },
  statusPillWarning: {
    backgroundColor: '#FFF4DF',
  },
  statusPillText: {
    color: '#657487',
    fontSize: 12,
    fontWeight: '900',
  },
  statusPillTextPositive: {
    color: '#0E7A4F',
  },
  statusPillTextWarning: {
    color: '#9A5A04',
  },
  detailTransactionsHeader: {
    alignItems: 'center',
    borderTopColor: '#E1E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
  },
});
