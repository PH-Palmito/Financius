import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { AlertCard, SectionTitle } from '../components/ui';
import { env } from '../config/env';
import { news } from '../data/mock';
import type { AlertItem, Position } from '../domain/types';

const currency = new Intl.NumberFormat(env.defaultLocale, {
  style: 'currency',
  currency: env.defaultCurrency,
});

type OpportunitiesProps = {
  alerts: AlertItem[];
  positions: Position[];
};

export function Opportunities({ alerts, positions }: OpportunitiesProps) {
  const belowCeiling = positions.filter(
    (position) => position.ceilingPrice > 0 && position.currentPrice <= position.ceilingPrice,
  );
  const aboveFair = positions.filter(
    (position) => position.fairPrice > 0 && position.currentPrice > position.fairPrice,
  );

  return (
    <>
      <SectionTitle title="Radar de oportunidades" action="Atualizado" />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Alertas acionaveis</Text>
        {alerts.slice(0, 4).map((alert) => (
          <AlertCard key={alert.title} {...alert} />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Abaixo do preco teto</Text>
        {belowCeiling.length ? (
          belowCeiling.map((position) => (
            <OpportunityRow
              key={position.ticker}
              label={position.ticker}
              value={`${currency.format(position.currentPrice)} / teto ${currency.format(
                position.ceilingPrice,
              )}`}
            />
          ))
        ) : (
          <Text style={styles.muted}>Nenhum ativo abaixo do teto configurado.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Acima do preco justo</Text>
        {aboveFair.length ? (
          aboveFair.map((position) => (
            <OpportunityRow
              key={position.ticker}
              label={position.ticker}
              value={currency.format(position.currentPrice)}
            />
          ))
        ) : (
          <Text style={styles.muted}>Nenhum ativo acima do preco justo estimado.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Noticias monitoradas</Text>
        {news.map((item) => (
          <View key={item} style={styles.newsItem}>
            <Ionicons color="#C9821D" name="ellipse" size={7} />
            <Text style={styles.newsText}>{item}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function OpportunityRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.opportunityRow}>
      <Text style={styles.rowTitle}>{label}</Text>
      <Text style={styles.muted}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  cardTitle: {
    color: '#172434',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },
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
  opportunityRow: {
    borderTopColor: '#EDF1F6',
    borderTopWidth: 1,
    gap: 4,
    paddingVertical: 10,
  },
  newsItem: {
    alignItems: 'flex-start',
    borderTopColor: '#EDF1F6',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  newsText: {
    color: '#34495E',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
