import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { DonutChart, LineChart } from '../components/charts';
import { AlertCard, ChartLegend, Metric, SectionTitle } from '../components/ui';
import { env } from '../config/env';
import { benchmarkHistory, equityHistory } from '../data/mock';
import type { AlertItem, AllocationSlice } from '../domain/types';

const currency = new Intl.NumberFormat(env.defaultLocale, {
  style: 'currency',
  currency: env.defaultCurrency,
});

type DashboardProps = {
  alerts: AlertItem[];
  allocation: AllocationSlice[];
  totals: {
    invested: number;
    current: number;
    dividendsTotal: number;
    profit: number;
    performance: number;
  };
};

export function Dashboard({ alerts, allocation, totals }: DashboardProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(344, Math.max(286, width - 56));

  return (
    <>
      <View style={styles.heroPanel}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.overline}>Patrimonio consolidado</Text>
            <Text style={styles.heroValue}>{currency.format(totals.current)}</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons color="#0E7A4F" name="trending-up-outline" size={15} />
            <Text style={styles.badgeText}>+{totals.performance.toFixed(1)}%</Text>
          </View>
        </View>
        <View style={styles.metricGrid}>
          <Metric label="Investido" value={currency.format(totals.invested)} />
          <Metric label="Resultado" value={currency.format(totals.profit)} tone="positive" />
          <Metric label="Dividendos mes" value={currency.format(totals.dividendsTotal)} />
          <Metric label="Meta renda" value="37%" />
        </View>
      </View>

      <SectionTitle title="Evolucao" action="vs CDI" />
      <View style={styles.card}>
        <LineChart
          benchmark={benchmarkHistory}
          data={equityHistory}
          height={190}
          width={chartWidth}
        />
        <View style={styles.chartLegendRow}>
          <ChartLegend color="#2868E8" label="Carteira" />
          <ChartLegend color="#C9821D" label="Benchmark" />
        </View>
      </View>

      <SectionTitle title="Alocacao" action="Rebalancear" />
      <View style={styles.chartCard}>
        <DonutChart data={allocation} />
        <View style={styles.legendList}>
          {allocation.map((item) => (
            <AllocationRow key={item.label} {...item} />
          ))}
        </View>
      </View>

      <SectionTitle title="Alertas da IA" action="3 novos" />
      {alerts.map((alert) => (
        <AlertCard key={alert.title} {...alert} />
      ))}
    </>
  );
}

function AllocationRow({ label, value, color }: AllocationSlice) {
  return (
    <View style={styles.allocationRow}>
      <View style={styles.allocationLabel}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.rowTitle}>{label}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { backgroundColor: color, width: `${value}%` }]} />
      </View>
      <Text style={styles.percent}>{value}%</Text>
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
  badge: {
    alignItems: 'center',
    backgroundColor: '#E8F6EF',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  badgeText: {
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
  chartCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  chartLegendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'center',
    marginTop: 6,
  },
  legendList: {
    alignSelf: 'stretch',
  },
  allocationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 35,
  },
  allocationLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    width: 94,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  rowTitle: {
    color: '#172434',
    fontSize: 14,
    fontWeight: '900',
  },
  barTrack: {
    backgroundColor: '#EDF1F6',
    borderRadius: 4,
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: 4,
    height: 8,
  },
  percent: {
    color: '#657487',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
    width: 34,
  },
});
