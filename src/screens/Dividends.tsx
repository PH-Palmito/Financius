import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { BarChart } from '../components/charts';
import { Field, Metric, SectionTitle } from '../components/ui';
import { env } from '../config/env';
import { dividendHistory, dividends } from '../data/mock';
import type { Dividend } from '../domain/types';

const currency = new Intl.NumberFormat(env.defaultLocale, {
  style: 'currency',
  currency: env.defaultCurrency,
});

export function Dividends() {
  const [sector, setSector] = useState('Todos');
  const [rankingMode, setRankingMode] = useState<'valor' | 'yield'>('valor');
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(344, Math.max(286, width - 56));
  const sectors = ['Todos', ...Array.from(new Set(dividends.map((item) => item.sector)))];
  const filtered = dividends
    .filter((item) => sector === 'Todos' || item.sector === sector)
    .sort((a, b) =>
      rankingMode === 'valor' ? b.amount - a.amount : b.yieldOnCost - a.yieldOnCost,
    );
  const total = filtered.reduce((sum, item) => sum + item.amount, 0);
  const yearlyProjection = dividendHistory[dividendHistory.length - 1].value * 12;

  return (
    <>
      <View style={styles.heroPanel}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.overline}>Dividendos filtrados</Text>
            <Text style={styles.heroValue}>{currency.format(total)}</Text>
          </View>
          <View style={styles.incomeBadge}>
            <Text style={styles.incomeBadgeText}>+18% tri</Text>
          </View>
        </View>
        <View style={styles.metricGrid}>
          <Metric label="Projecao anual" value={currency.format(yearlyProjection)} />
          <Metric label="Media 8 meses" value={currency.format(402.1)} />
          <Metric label="Maior pagador" value={filtered[0]?.ticker ?? '-'} />
          <Metric label="Setores" value={String(sectors.length - 1)} />
        </View>
      </View>

      <SectionTitle title="Evolucao mensal" action="proventos" />
      <View style={styles.card}>
        <BarChart data={dividendHistory} height={188} width={chartWidth} />
      </View>

      <SectionTitle title="Filtros" />
      <View style={styles.card}>
        <View style={styles.segmented}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRankingMode('valor')}
            style={[styles.segmentButton, rankingMode === 'valor' && styles.segmentActive]}
          >
            <Text
              style={[
                styles.segmentText,
                rankingMode === 'valor' && styles.segmentTextActive,
              ]}
            >
              Mais pagam
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRankingMode('yield')}
            style={[styles.segmentButton, rankingMode === 'yield' && styles.segmentActive]}
          >
            <Text
              style={[
                styles.segmentText,
                rankingMode === 'yield' && styles.segmentTextActive,
              ]}
            >
              Maior yield
            </Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterChips}>
            {sectors.map((item) => {
              const selected = sector === item;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={item}
                  onPress={() => setSector(item)}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <SectionTitle title="Ranking de pagadores" action={`${filtered.length} ativos`} />
      {filtered.map((item, index) => (
        <DividendRow key={item.ticker} item={item} rank={index + 1} />
      ))}
    </>
  );
}

function DividendRow({ item, rank }: { item: Dividend; rank: number }) {
  return (
    <View style={styles.dividendRow}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <View style={styles.dividendInfo}>
        <Text style={styles.rowTitle}>{item.ticker}</Text>
        <Text style={styles.muted}>
          {item.sector} - pago em {item.lastPayment}
        </Text>
      </View>
      <View style={styles.dividendValueBlock}>
        <Text style={styles.dividendAmount}>{currency.format(item.amount)}</Text>
        <Text style={styles.dividendYield}>{item.yieldOnCost.toFixed(1)}% a.a.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  heroTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  overline: {
    color: '#657487',
    fontSize: 13,
    fontWeight: '800',
  },
  heroValue: {
    color: '#172434',
    fontSize: 31,
    fontWeight: '900',
    marginTop: 7,
  },
  incomeBadge: {
    backgroundColor: '#E8F6EF',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  incomeBadgeText: {
    color: '#0E7A4F',
    fontSize: 12,
    fontWeight: '900',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  segmented: {
    backgroundColor: '#F0F4F8',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 7,
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    color: '#657487',
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#172434',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
  },
  filterChip: {
    backgroundColor: '#F5F7FA',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: '#172434',
    borderColor: '#172434',
  },
  filterChipText: {
    color: '#657487',
    fontSize: 12,
    fontWeight: '900',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  dividendRow: {
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
  rankBadge: {
    alignItems: 'center',
    backgroundColor: '#E8F6EF',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  rankText: {
    color: '#0E7A4F',
    fontSize: 13,
    fontWeight: '900',
  },
  dividendInfo: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    color: '#172434',
    fontSize: 14,
    fontWeight: '900',
  },
  muted: {
    color: '#657487',
    fontSize: 13,
    lineHeight: 18,
  },
  dividendValueBlock: {
    alignItems: 'flex-end',
  },
  dividendAmount: {
    color: '#172434',
    fontSize: 14,
    fontWeight: '900',
  },
  dividendYield: {
    color: '#0E7A4F',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
});
