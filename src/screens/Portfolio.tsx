import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AssetDetail } from '../components/portfolio/AssetDetail';
import { TransactionForm } from '../components/portfolio/TransactionForm';
import { TransactionRow } from '../components/portfolio/TransactionRow';
import { Metric, SectionTitle } from '../components/ui';
import { env } from '../config/env';
import { getPositionProfit, getSafetyMargin } from '../domain/analytics';
import type { Position, Transaction } from '../domain/types';

const currency = new Intl.NumberFormat(env.defaultLocale, {
  style: 'currency',
  currency: env.defaultCurrency,
});

type PortfolioProps = {
  positions: Position[];
  onAddAsset: (asset: Position) => void;
  onRefreshQuotes: () => void;
  quoteRefreshStatus: string;
  quotesRefreshing: boolean;
  onResetPortfolio: () => void;
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
};

export function Portfolio({
  positions,
  onAddAsset,
  onRefreshQuotes,
  quoteRefreshStatus,
  quotesRefreshing,
  onResetPortfolio,
  transactions,
  onAddTransaction,
}: PortfolioProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState(positions[0]?.ticker ?? '');
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const selectedPosition = positions.find((position) => position.ticker === selectedTicker);
  const selectedTransactions = transactions
    .filter((transaction) => transaction.ticker === selectedPosition?.ticker)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <SectionTitle
        action={showForm ? 'Fechar' : 'Adicionar'}
        onActionPress={() => setShowForm((current) => !current)}
        title="Posicoes"
      />
      <View style={styles.quoteToolbar}>
        <View style={styles.quoteStatusBlock}>
          <Text style={styles.quoteStatusLabel}>Cotacoes</Text>
          <Text style={styles.muted}>{quoteRefreshStatus}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={quotesRefreshing}
          onPress={onRefreshQuotes}
          style={[styles.quoteButton, quotesRefreshing && styles.quoteButtonDisabled]}
        >
          <Ionicons color="#2868E8" name="refresh-outline" size={17} />
          <Text style={styles.quoteButtonText}>
            {quotesRefreshing ? 'Atualizando' : 'Atualizar'}
          </Text>
        </Pressable>
      </View>
      {showForm ? (
        <TransactionForm
          onCancel={() => setShowForm(false)}
          onCreateAsset={onAddAsset}
          positions={positions}
          onSubmit={(transaction) => {
            onAddTransaction(transaction);
            setShowForm(false);
          }}
        />
      ) : null}
      {selectedPosition ? (
        <AssetDetail
          onClose={() => setSelectedTicker('')}
          position={selectedPosition}
          transactions={selectedTransactions}
        />
      ) : null}
      {positions.map((position) => (
        <Pressable
          accessibilityRole="button"
          key={position.ticker}
          onPress={() => setSelectedTicker(position.ticker)}
          style={[
            styles.positionCard,
            selectedTicker === position.ticker && styles.positionCardSelected,
          ]}
        >
          <View style={styles.positionHeader}>
            <View style={styles.positionTitleBlock}>
              <Text style={styles.ticker}>{position.ticker}</Text>
              <Text style={styles.muted}>{position.name}</Text>
            </View>
            <View style={styles.assetPill}>
              <Text style={styles.assetPillText}>
                {position.quantity > 0 ? position.type : 'Sem posicao'}
              </Text>
            </View>
          </View>
          <View style={styles.positionStats}>
            <Metric compact label="Qtd." value={String(position.quantity)} />
            <Metric compact label="Preco medio" value={currency.format(position.averagePrice)} />
            <Metric compact label="Atual" value={currency.format(position.currentPrice)} />
          </View>
          <View style={styles.securityLine}>
            <Text style={styles.muted}>Margem de seguranca</Text>
            <Text style={styles.securityValue}>{getSafetyMargin(position)}</Text>
          </View>
          <View style={styles.positionValueLine}>
            <View>
              <Text style={styles.muted}>Valor atual</Text>
              <Text style={styles.positionValue}>
                {currency.format(position.quantity * position.currentPrice)}
              </Text>
            </View>
            <View style={styles.positionResultBlock}>
              <Text style={styles.muted}>Resultado</Text>
              <Text
                style={[
                  styles.positionResult,
                  getPositionProfit(position) < 0 && styles.negativeText,
                ]}
              >
                {currency.format(getPositionProfit(position))}
              </Text>
            </View>
          </View>
          <View style={styles.averageLine}>
            <Text style={styles.muted}>Preco medio calculado por lancamentos</Text>
            <Text style={styles.averageValue}>{currency.format(position.averagePrice)}</Text>
          </View>
        </Pressable>
      ))}

      <SectionTitle title="Ultimos lancamentos" action={`${transactions.length} total`} />
      {recentTransactions.map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} />
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={onResetPortfolio}
        style={styles.resetButton}
      >
        <Ionicons color="#B64242" name="refresh-outline" size={17} />
        <Text style={styles.resetButtonText}>Restaurar carteira de exemplo</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  muted: {
    color: '#657487',
    fontSize: 13,
    lineHeight: 18,
  },
  negativeText: {
    color: '#B64242',
  },
  quoteToolbar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 12,
  },
  quoteStatusBlock: {
    flex: 1,
    gap: 3,
  },
  quoteStatusLabel: {
    color: '#172434',
    fontSize: 13,
    fontWeight: '900',
  },
  quoteButton: {
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderColor: '#D7E0EA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 10,
  },
  quoteButtonDisabled: {
    opacity: 0.58,
  },
  quoteButtonText: {
    color: '#2868E8',
    fontSize: 12,
    fontWeight: '900',
  },
  positionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  positionCardSelected: {
    borderColor: '#2868E8',
  },
  positionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  positionTitleBlock: {
    flex: 1,
    paddingRight: 10,
  },
  ticker: {
    color: '#172434',
    fontSize: 20,
    fontWeight: '900',
  },
  assetPill: {
    backgroundColor: '#EAF0FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  assetPillText: {
    color: '#2868E8',
    fontSize: 12,
    fontWeight: '900',
  },
  positionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  securityLine: {
    alignItems: 'center',
    borderTopColor: '#E1E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
  },
  securityValue: {
    color: '#0E7A4F',
    fontSize: 14,
    fontWeight: '900',
  },
  positionValueLine: {
    alignItems: 'center',
    borderTopColor: '#E1E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
  },
  positionValue: {
    color: '#172434',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 3,
  },
  positionResultBlock: {
    alignItems: 'flex-end',
  },
  positionResult: {
    color: '#0E7A4F',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 3,
  },
  averageLine: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    padding: 10,
  },
  averageValue: {
    color: '#2868E8',
    fontSize: 13,
    fontWeight: '900',
  },
  resetButton: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  resetButtonText: {
    color: '#B64242',
    fontSize: 12,
    fontWeight: '900',
  },
});
