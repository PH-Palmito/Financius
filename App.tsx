import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { env, hasBackendConfig } from './src/config/env';
import {
  alerts,
  allocation,
  benchmarkHistory,
  dividendHistory,
  dividends,
  equityHistory,
  news,
  positions,
  transactions as initialTransactions,
} from './src/data/mock';
import { calculateAveragePrice, groupTransactionsByTicker } from './src/domain/portfolio';
import type {
  AllocationSlice,
  ChartPoint,
  Dividend,
  Position,
  Transaction,
} from './src/domain/types';
import {
  clearStoredPortfolio,
  loadStoredPortfolio,
  saveStoredAssets,
  saveStoredTransactions,
} from './src/storage/portfolioStorage';

type TabKey = 'dashboard' | 'carteira' | 'dividendos' | 'radar' | 'ia';

const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'dashboard', label: 'Inicio', icon: 'grid-outline' },
  { key: 'carteira', label: 'Carteira', icon: 'wallet-outline' },
  { key: 'dividendos', label: 'Dividendos', icon: 'cash-outline' },
  { key: 'radar', label: 'Radar', icon: 'scan-outline' },
  { key: 'ia', label: 'IA', icon: 'sparkles-outline' },
];

const currency = new Intl.NumberFormat(env.defaultLocale, {
  style: 'currency',
  currency: env.defaultCurrency,
});

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [portfolioAssets, setPortfolioAssets] = useState(positions);
  const [portfolioTransactions, setPortfolioTransactions] = useState(initialTransactions);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadStoredPortfolio()
      .then((stored) => {
        if (!mounted) {
          return;
        }

        if (stored.assets?.length) {
          setPortfolioAssets(stored.assets);
        }

        if (stored.transactions?.length) {
          setPortfolioTransactions(stored.transactions);
        }
      })
      .finally(() => {
        if (mounted) {
          setStorageReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (storageReady) {
      saveStoredAssets(portfolioAssets);
    }
  }, [portfolioAssets, storageReady]);

  useEffect(() => {
    if (storageReady) {
      saveStoredTransactions(portfolioTransactions);
    }
  }, [portfolioTransactions, storageReady]);

  const portfolioPositions = useMemo(() => {
    const transactionsByTicker = groupTransactionsByTicker(portfolioTransactions);

    return portfolioAssets.map((position) => {
      const calculated = calculateAveragePrice(transactionsByTicker[position.ticker] || []);
      return {
        ...position,
        quantity: calculated.quantity,
        averagePrice: calculated.averagePrice || position.averagePrice,
      };
    });
  }, [portfolioAssets, portfolioTransactions]);

  const totals = useMemo(() => {
    const invested = portfolioPositions.reduce(
      (sum, position) => sum + position.quantity * position.averagePrice,
      0,
    );
    const current = portfolioPositions.reduce(
      (sum, position) => sum + position.quantity * position.currentPrice,
      0,
    );
    const dividendsTotal = dividends.reduce((sum, item) => sum + item.amount, 0);

    return {
      invested,
      current,
      dividendsTotal,
      profit: current - invested,
      performance: invested > 0 ? ((current - invested) / invested) * 100 : 0,
    };
  }, [portfolioPositions]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <Header />
        {!storageReady ? (
          <View style={styles.storageBanner}>
            <Ionicons color="#657487" name="sync-outline" size={16} />
            <Text style={styles.storageBannerText}>Carregando carteira local...</Text>
          </View>
        ) : null}
        <View style={styles.tabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tabs}>
              {tabs.map((tab) => {
                const selected = activeTab === tab.key;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={[styles.tabButton, selected && styles.tabButtonActive]}
                  >
                    <Ionicons
                      color={selected ? '#FFFFFF' : '#657487'}
                      name={tab.icon}
                      size={17}
                    />
                    <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'dashboard' && <Dashboard totals={totals} />}
          {activeTab === 'carteira' && (
            <Portfolio
              onAddAsset={(asset) =>
                setPortfolioAssets((current) => [
                  ...current.filter((item) => item.ticker !== asset.ticker),
                  asset,
                ])
              }
              onAddTransaction={(transaction) =>
                setPortfolioTransactions((current) => [transaction, ...current])
              }
              onResetPortfolio={() => {
                setPortfolioAssets(positions);
                setPortfolioTransactions(initialTransactions);
                clearStoredPortfolio();
              }}
              positions={portfolioPositions}
              transactions={portfolioTransactions}
            />
          )}
          {activeTab === 'dividendos' && <Dividends />}
          {activeTab === 'radar' && <Opportunities positions={portfolioPositions} />}
          {activeTab === 'ia' && <Assistant />}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>{env.appName}</Text>
        <Text style={styles.headerCopy}>{env.appTagline}</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable accessibilityRole="button" style={styles.iconButton}>
          <Ionicons color="#172434" name="search-outline" size={21} />
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.iconButton}>
          <Ionicons color="#172434" name="notifications-outline" size={21} />
        </Pressable>
      </View>
    </View>
  );
}

function Dashboard({
  totals,
}: {
  totals: {
    invested: number;
    current: number;
    dividendsTotal: number;
    profit: number;
    performance: number;
  };
}) {
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

function Portfolio({
  positions,
  onAddAsset,
  onResetPortfolio,
  transactions,
  onAddTransaction,
}: {
  positions: Position[];
  onAddAsset: (asset: Position) => void;
  onResetPortfolio: () => void;
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <>
      <SectionTitle
        action={showForm ? 'Fechar' : 'Adicionar'}
        onActionPress={() => setShowForm((current) => !current)}
        title="Posicoes"
      />
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
      {positions.map((position) => (
        <View key={position.ticker} style={styles.positionCard}>
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
        </View>
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

function Dividends() {
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

function Opportunities({ positions }: { positions: Position[] }) {
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

function Assistant() {
  if (!env.aiAssistantEnabled) {
    return (
      <View style={styles.aiPanel}>
        <View style={styles.aiIconMuted}>
          <Ionicons color="#657487" name="lock-closed-outline" size={24} />
        </View>
        <Text style={styles.aiTitle}>Assistente desativado</Text>
        <Text style={styles.aiText}>
          Ative EXPO_PUBLIC_AI_ASSISTANT_ENABLED quando o backend com guardrails estiver
          configurado. Chaves privadas de IA devem ficar apenas no servidor.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.aiPanel}>
        <View style={styles.aiIcon}>
          <Ionicons color="#FFFFFF" name="sparkles-outline" size={24} />
        </View>
        <Text style={styles.aiTitle}>Assistente da carteira</Text>
        <Text style={styles.aiText}>
          Sua carteira esta positiva no ano, mas ha concentracao acima do limite no setor
          financeiro. Este painel oferece apoio educacional e nao substitui analise propria.
        </Text>
        <View style={styles.configNotice}>
          <Ionicons
            color={hasBackendConfig ? '#0E7A4F' : '#9A5A04'}
            name={hasBackendConfig ? 'checkmark-circle-outline' : 'alert-circle-outline'}
            size={17}
          />
          <Text style={styles.configNoticeText}>
            {hasBackendConfig
              ? 'Backend configurado por variaveis de ambiente.'
              : 'Configure API/Supabase no .env para conectar dados reais.'}
          </Text>
        </View>
      </View>

      <SectionTitle title="Perguntas rapidas" />
      {[
        'Como esta minha carteira?',
        'Quais ativos mais puxaram minha rentabilidade?',
        'Quanto recebi de dividendos este mes?',
        'Qual ativo esta acima do meu preco teto?',
      ].map((question) => (
        <Pressable accessibilityRole="button" key={question} style={styles.questionButton}>
          <Text style={styles.questionText}>{question}</Text>
          <Ionicons color="#2868E8" name="arrow-forward-outline" size={18} />
        </Pressable>
      ))}
    </>
  );
}

function Metric({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: string;
  tone?: 'positive';
  compact?: boolean;
}) {
  return (
    <View style={compact ? styles.metricCompact : styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, tone === 'positive' && styles.positiveText]}>
        {value}
      </Text>
    </View>
  );
}

function SectionTitle({
  title,
  action,
  onActionPress,
}: {
  title: string;
  action?: string;
  onActionPress?: () => void;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionHeading}>{title}</Text>
      {action ? (
        <Pressable
          accessibilityRole={onActionPress ? 'button' : undefined}
          disabled={!onActionPress}
          onPress={onActionPress}
        >
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AllocationRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
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

function AlertCard({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.alertCard}>
      <View style={styles.alertIcon}>
        <Ionicons color="#9A5A04" name={icon} size={20} />
      </View>
      <View style={styles.alertTextBlock}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.muted}>{text}</Text>
      </View>
    </View>
  );
}

function TransactionForm({
  onCancel,
  positions,
  onSubmit,
}: {
  onCancel: () => void;
  positions: Position[];
  onSubmit: (transaction: Transaction) => void;
}) {
  const [ticker, setTicker] = useState(positions[0].ticker);
  const [type, setType] = useState<Transaction['type']>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('0');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const quantityValue = parseNumber(quantity);
  const priceValue = parseNumber(price);
  const feesValue = parseNumber(fees);
  const canSubmit =
    quantityValue > 0 && priceValue > 0 && feesValue >= 0 && isValidDateInput(date);

  return (
    <View style={styles.formCard}>
      <View style={styles.segmented}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setType('buy')}
          style={[styles.segmentButton, type === 'buy' && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, type === 'buy' && styles.segmentTextActive]}>
            Compra
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setType('sell')}
          style={[styles.segmentButton, type === 'sell' && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, type === 'sell' && styles.segmentTextActive]}>
            Venda
          </Text>
        </Pressable>
      </View>

      <Text style={styles.inputLabel}>Ativo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterChips}>
          {positions.map((position) => {
            const selected = ticker === position.ticker;
            return (
              <Pressable
                accessibilityRole="button"
                key={position.ticker}
                onPress={() => setTicker(position.ticker)}
                style={[styles.filterChip, selected && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                  {position.ticker}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.formGrid}>
        <Field
          label="Quantidade"
          onChangeText={setQuantity}
          placeholder="100"
          value={quantity}
        />
        <Field
          label="Preco"
          onChangeText={setPrice}
          placeholder="10,50"
          value={price}
        />
        <Field label="Taxas" onChangeText={setFees} placeholder="0,00" value={fees} />
      </View>
      <Field
        inputMode="numeric"
        label="Data"
        onChangeText={setDate}
        placeholder="2026-04-28"
        value={date}
      />

      <View style={styles.formSummary}>
        <Text style={styles.muted}>Total estimado</Text>
        <Text style={styles.formSummaryValue}>
          {currency.format(quantityValue * priceValue + feesValue)}
        </Text>
      </View>

      <View style={styles.formActions}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancelar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={() =>
            onSubmit({
              id: `trx-${Date.now()}`,
              ticker,
              type,
              quantity: quantityValue,
              price: priceValue,
              fees: feesValue,
              date,
            })
          }
          style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
        >
          <Text style={styles.primaryButtonText}>Salvar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AssetForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (asset: Position) => void;
}) {
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<Position['type']>('Acao');
  const [sector, setSector] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [ceilingPrice, setCeilingPrice] = useState('');
  const [fairPrice, setFairPrice] = useState('');

  const currentPriceValue = parseNumber(currentPrice);
  const ceilingPriceValue = parseNumber(ceilingPrice);
  const fairPriceValue = parseNumber(fairPrice);
  const normalizedTicker = ticker.trim().toUpperCase();
  const canSubmit =
    normalizedTicker.length >= 3 &&
    name.trim().length >= 2 &&
    sector.trim().length >= 2 &&
    currentPriceValue > 0;

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Novo ativo</Text>
      <View style={styles.formGrid}>
        <Field
          inputMode="text"
          label="Ticker"
          onChangeText={setTicker}
          placeholder="PETR4"
          value={ticker}
        />
        <Field
          inputMode="text"
          label="Nome"
          onChangeText={setName}
          placeholder="Petrobras"
          value={name}
        />
      </View>

      <Text style={styles.inputLabel}>Classe</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterChips}>
          {(['Acao', 'FII', 'ETF', 'Renda fixa'] as Position['type'][]).map((type) => {
            const selected = assetType === type;
            return (
              <Pressable
                accessibilityRole="button"
                key={type}
                onPress={() => setAssetType(type)}
                style={[styles.filterChip, selected && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Field
        inputMode="text"
        label="Setor"
        onChangeText={setSector}
        placeholder="Energia"
        value={sector}
      />

      <View style={styles.formGrid}>
        <Field
          label="Cotacao"
          onChangeText={setCurrentPrice}
          placeholder="32,10"
          value={currentPrice}
        />
        <Field
          label="Preco teto"
          onChangeText={setCeilingPrice}
          placeholder="30,00"
          value={ceilingPrice}
        />
        <Field
          label="Preco justo"
          onChangeText={setFairPrice}
          placeholder="36,00"
          value={fairPrice}
        />
      </View>

      <View style={styles.formSummary}>
        <Text style={styles.muted}>Ativo sera criado sem quantidade</Text>
        <Text style={styles.formSummaryValue}>{normalizedTicker || '-'}</Text>
      </View>

      <View style={styles.formActions}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancelar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={() =>
            onSubmit({
              ticker: normalizedTicker,
              name: name.trim(),
              type: assetType,
              sector: sector.trim(),
              allocation: 0,
              quantity: 0,
              averagePrice: 0,
              currentPrice: currentPriceValue,
              ceilingPrice: ceilingPriceValue,
              fairPrice: fairPriceValue,
            })
          }
          style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
        >
          <Text style={styles.primaryButtonText}>Criar ativo</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  inputMode = 'decimal',
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  inputMode?: 'decimal' | 'numeric' | 'text';
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        inputMode={inputMode}
        keyboardType={inputMode === 'text' ? 'default' : 'decimal-pad'}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={styles.input}
        value={value}
      />
    </View>
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

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isBuy = transaction.type === 'buy';

  return (
    <View style={styles.transactionRow}>
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

function OpportunityRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.opportunityRow}>
      <Text style={styles.rowTitle}>{label}</Text>
      <Text style={styles.muted}>{value}</Text>
    </View>
  );
}

function DonutChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const size = 156;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <View style={styles.donutWrap}>
      <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {data.map((item) => {
            const dash = (item.value / 100) * circumference;
            const segment = (
              <Circle
                cx={center}
                cy={center}
                fill="transparent"
                key={item.label}
                r={radius}
                stroke={item.color}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                strokeWidth={strokeWidth}
              />
            );
            offset += dash;
            return segment;
          })}
        </G>
        <Circle cx={center} cy={center} fill="#FFFFFF" r={radius - strokeWidth / 1.4} />
        <SvgText
          fill="#172434"
          fontSize="22"
          fontWeight="900"
          textAnchor="middle"
          x={center}
          y={center - 2}
        >
          100%
        </SvgText>
        <SvgText
          fill="#657487"
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
          x={center}
          y={center + 18}
        >
          alocado
        </SvgText>
      </Svg>
    </View>
  );
}

function LineChart({
  data,
  benchmark,
  width,
  height,
}: {
  data: { label: string; value: number }[];
  benchmark: { label: string; value: number }[];
  width: number;
  height: number;
}) {
  const padding = { top: 18, right: 12, bottom: 34, left: 44 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const allValues = [...data, ...benchmark].map((item) => item.value);
  const min = Math.min(...allValues) * 0.98;
  const max = Math.max(...allValues) * 1.02;

  const toPoint = (item: { value: number }, index: number) => {
    const x = padding.left + (chartWidth / (data.length - 1)) * index;
    const y =
      padding.top + chartHeight - ((item.value - min) / (max - min)) * chartHeight;
    return { x, y };
  };

  const linePath = (items: { value: number }[]) =>
    items
      .map((item, index) => {
        const point = toPoint(item, index);
        return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      })
      .join(' ');

  const gridValues = [0, 1, 2].map((step) => min + ((max - min) / 2) * step);

  return (
    <View style={styles.lineChartWrap}>
      <Svg height={height} width="100%" viewBox={`0 0 ${width} ${height}`}>
        {gridValues.map((value) => {
          const y = padding.top + chartHeight - ((value - min) / (max - min)) * chartHeight;
          return (
            <G key={value}>
              <Line
                stroke="#E7ECF2"
                strokeDasharray="4 6"
                strokeWidth="1"
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
              />
              <SvgText
                fill="#657487"
                fontSize="10"
                fontWeight="700"
                textAnchor="end"
                x={padding.left - 8}
                y={y + 3}
              >
                {`${Math.round(value / 1000)}k`}
              </SvgText>
            </G>
          );
        })}
        <Path
          d={linePath(benchmark)}
          fill="transparent"
          stroke="#C9821D"
          strokeDasharray="5 5"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <Path
          d={linePath(data)}
          fill="transparent"
          stroke="#2868E8"
          strokeLinecap="round"
          strokeWidth="4"
        />
        {data.map((item, index) => {
          const point = toPoint(item, index);
          const showLabel = index === 0 || index === data.length - 1 || index % 2 === 1;

          return (
            <G key={item.label}>
              <Circle cx={point.x} cy={point.y} fill="#FFFFFF" r="5" />
              <Circle cx={point.x} cy={point.y} fill="#2868E8" r="3" />
              {showLabel ? (
                <SvgText
                  fill="#657487"
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="middle"
                  x={point.x}
                  y={height - 10}
                >
                  {item.label}
                </SvgText>
              ) : null}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

function BarChart({
  data,
  width,
  height,
}: {
  data: { label: string; value: number }[];
  width: number;
  height: number;
}) {
  const padding = { top: 18, right: 10, bottom: 32, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((item) => item.value)) * 1.18;
  const barGap = 8;
  const barWidth = (chartWidth - barGap * (data.length - 1)) / data.length;

  return (
    <View style={styles.lineChartWrap}>
      <Svg height={height} width="100%" viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.5, 1].map((rate) => {
          const y = padding.top + chartHeight - rate * chartHeight;
          return (
            <G key={rate}>
              <Line
                stroke="#E7ECF2"
                strokeDasharray="4 6"
                strokeWidth="1"
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
              />
              <SvgText
                fill="#657487"
                fontSize="10"
                fontWeight="700"
                textAnchor="end"
                x={padding.left - 8}
                y={y + 3}
              >
                {Math.round((max * rate) / 100) * 100}
              </SvgText>
            </G>
          );
        })}
        {data.map((item, index) => {
          const barHeight = (item.value / max) * chartHeight;
          const x = padding.left + index * (barWidth + barGap);
          const y = padding.top + chartHeight - barHeight;
          const selected = index === data.length - 1;

          return (
            <G key={item.label}>
              <Rect
                fill={selected ? '#0E7A4F' : '#8FB7A3'}
                height={barHeight}
                rx="5"
                width={barWidth}
                x={x}
                y={y}
              />
              <SvgText
                fill="#657487"
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
                x={x + barWidth / 2}
                y={height - 10}
              >
                {item.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.chartLegend}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

function parseNumber(value: string) {
  const normalized = value.replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function getSafetyMargin(position: Position) {
  if (!position.fairPrice) {
    return 'Nao se aplica';
  }

  const margin = ((position.fairPrice - position.currentPrice) / position.fairPrice) * 100;
  return `${margin.toFixed(1)}%`;
}

function getPositionProfit(position: Position) {
  return position.quantity * (position.currentPrice - position.averagePrice);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F6FA',
  },
  shell: {
    alignSelf: 'center',
    backgroundColor: '#F3F6FA',
    flex: 1,
    maxWidth: 760,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomColor: '#E4EAF1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  brand: {
    color: '#172434',
    fontSize: 27,
    fontWeight: '900',
  },
  headerCopy: {
    color: '#657487',
    fontSize: 13,
    marginTop: 3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  tabsWrap: {
    backgroundColor: '#F8FAFC',
    paddingBottom: 12,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  storageBanner: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomColor: '#E1E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  storageBannerText: {
    color: '#657487',
    fontSize: 12,
    fontWeight: '800',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
  },
  tabButtonActive: {
    backgroundColor: '#2868E8',
    borderColor: '#2868E8',
  },
  tabLabel: {
    color: '#657487',
    fontSize: 12,
    fontWeight: '800',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  content: {
    padding: 14,
    paddingBottom: 36,
  },
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
    justifyContent: 'space-between',
    gap: 12,
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
  metric: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    minHeight: 66,
    padding: 11,
    width: '47.8%',
  },
  metricCompact: {
    minWidth: '30%',
  },
  metricLabel: {
    color: '#657487',
    fontSize: 12,
    fontWeight: '800',
  },
  metricValue: {
    color: '#172434',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 6,
  },
  positiveText: {
    color: '#0E7A4F',
  },
  negativeText: {
    color: '#B64242',
  },
  sectionTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 20,
  },
  sectionHeading: {
    color: '#172434',
    fontSize: 18,
    fontWeight: '900',
  },
  sectionAction: {
    color: '#2868E8',
    fontSize: 13,
    fontWeight: '900',
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
  cardTitle: {
    color: '#172434',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
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
  legendList: {
    alignSelf: 'stretch',
  },
  donutWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 162,
  },
  lineChartWrap: {
    alignItems: 'center',
    minHeight: 188,
    overflow: 'hidden',
  },
  chartLegendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'center',
    marginTop: 6,
  },
  chartLegend: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
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
  alertCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 14,
  },
  alertIcon: {
    alignItems: 'center',
    backgroundColor: '#FFF4DF',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  alertTextBlock: {
    flex: 1,
    gap: 4,
  },
  muted: {
    color: '#657487',
    fontSize: 13,
    lineHeight: 18,
  },
  positionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  quickActionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E0EA',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 42,
  },
  quickActionActive: {
    backgroundColor: '#2868E8',
    borderColor: '#2868E8',
  },
  quickActionText: {
    color: '#2868E8',
    fontSize: 13,
    fontWeight: '900',
  },
  quickActionTextActive: {
    color: '#FFFFFF',
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
    minHeight: 36,
    justifyContent: 'center',
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
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E0EA',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  formTitle: {
    color: '#172434',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  inputLabel: {
    color: '#657487',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 7,
    marginTop: 12,
  },
  formGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  field: {
    flex: 1,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    color: '#172434',
    fontSize: 14,
    fontWeight: '800',
    minHeight: 44,
    paddingHorizontal: 10,
  },
  formSummary: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    padding: 10,
  },
  formSummaryValue: {
    color: '#172434',
    fontSize: 14,
    fontWeight: '900',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#D7E0EA',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryButtonText: {
    color: '#657487',
    fontSize: 13,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2868E8',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButtonDisabled: {
    backgroundColor: '#AFC4EF',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
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
  aiPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8E3FF',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  aiIcon: {
    alignItems: 'center',
    backgroundColor: '#2868E8',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    marginBottom: 14,
    width: 48,
  },
  aiIconMuted: {
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    marginBottom: 14,
    width: 48,
  },
  aiTitle: {
    color: '#172434',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  aiText: {
    color: '#34495E',
    fontSize: 14,
    lineHeight: 21,
  },
  configNotice: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 10,
  },
  configNoticeText: {
    color: '#657487',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  questionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  questionText: {
    color: '#172434',
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    paddingRight: 10,
  },
});
