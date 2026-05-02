import { Ionicons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { env, hasBackendConfig } from './src/config/env';
import { ChartLegend, Field, Metric, SectionTitle } from './src/components/ui';
import { BarChart, DonutChart, LineChart } from './src/components/charts';
import { searchAssetCatalog } from './src/data/assetCatalog';
import {
  allocation,
  benchmarkHistory,
  dividendHistory,
  dividends,
  equityHistory,
  news,
  positions,
  transactions as initialTransactions,
} from './src/data/mock';
import {
  buildAllocationFromPositions,
  buildPortfolioAlerts,
  getAssistantAnswer,
  getPositionProfit,
  getSafetyMargin,
} from './src/domain/analytics';
import { calculateMonthsToGoal, calculateRealAnnualReturn } from './src/domain/goals';
import { calculateAveragePrice, groupTransactionsByTicker } from './src/domain/portfolio';
import { loadCloudPortfolio, saveCloudPortfolio } from './src/services/portfolioCloud';
import { isSupabaseConfigured, supabase } from './src/services/supabase';
import { AuthScreen } from './src/screens/AuthScreen';
import { Benchmarks } from './src/screens/Benchmarks';
import type {
  AlertItem,
  AllocationSlice,
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
import {
  formatDate,
  formatInputNumber,
  formatYears,
  isValidDateInput,
  parseNumber,
} from './src/utils/format';

type TabKey =
  | 'dashboard'
  | 'carteira'
  | 'dividendos'
  | 'metas'
  | 'benchmarks'
  | 'radar'
  | 'ia';

const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'dashboard', label: 'Inicio', icon: 'grid-outline' },
  { key: 'carteira', label: 'Carteira', icon: 'wallet-outline' },
  { key: 'dividendos', label: 'Dividendos', icon: 'cash-outline' },
  { key: 'metas', label: 'Metas', icon: 'flag-outline' },
  { key: 'benchmarks', label: 'Benchmarks', icon: 'analytics-outline' },
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
  const [session, setSession] = useState<Session | null>(null);
  const [syncStatus, setSyncStatus] = useState('Carteira local');
  const [syncing, setSyncing] = useState(false);

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
    if (!supabase) {
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!storageReady || !session?.user.id) {
      return;
    }

    setSyncing(true);
    setSyncStatus('Sincronizando carteira...');
    loadCloudPortfolio(session.user.id)
      .then((cloudPortfolio) => {
        if (cloudPortfolio?.assets.length) {
          setPortfolioAssets(cloudPortfolio.assets);
        }

        if (cloudPortfolio?.transactions.length) {
          setPortfolioTransactions(cloudPortfolio.transactions);
        }

        setSyncStatus(cloudPortfolio ? 'Carteira sincronizada' : 'Carteira local pronta');
      })
      .catch(() => setSyncStatus('Falha ao sincronizar'))
      .finally(() => setSyncing(false));
  }, [session?.user.id, storageReady]);

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

  useEffect(() => {
    if (!storageReady || !session?.user.id) {
      return;
    }

    const timeout = setTimeout(() => {
      setSyncing(true);
      setSyncStatus('Salvando na nuvem...');
      saveCloudPortfolio(session.user.id, {
        assets: portfolioAssets,
        transactions: portfolioTransactions,
      })
        .then(() => setSyncStatus('Carteira sincronizada'))
        .catch(() => setSyncStatus('Falha ao salvar na nuvem'))
        .finally(() => setSyncing(false));
    }, 600);

    return () => clearTimeout(timeout);
  }, [portfolioAssets, portfolioTransactions, session?.user.id, storageReady]);

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

  const portfolioAllocation = useMemo(
    () => buildAllocationFromPositions(portfolioPositions, allocation),
    [portfolioPositions],
  );
  const portfolioAlerts = useMemo(
    () =>
      buildPortfolioAlerts({
        allocation: portfolioAllocation,
        formatCurrency: (value) => currency.format(value),
        positions: portfolioPositions,
      }),
    [portfolioAllocation, portfolioPositions],
  );

  const saveNow = () => {
    if (!session?.user.id) {
      return;
    }

    setSyncing(true);
    setSyncStatus('Salvando na nuvem...');
    saveCloudPortfolio(session.user.id, {
      assets: portfolioAssets,
      transactions: portfolioTransactions,
    })
      .then(() => setSyncStatus('Carteira sincronizada'))
      .catch(() => setSyncStatus('Falha ao salvar na nuvem'))
      .finally(() => setSyncing(false));
  };

  const pullNow = () => {
    if (!session?.user.id) {
      return;
    }

    setSyncing(true);
    setSyncStatus('Buscando nuvem...');
    loadCloudPortfolio(session.user.id)
      .then((cloudPortfolio) => {
        if (cloudPortfolio?.assets.length) {
          setPortfolioAssets(cloudPortfolio.assets);
        }

        if (cloudPortfolio?.transactions.length) {
          setPortfolioTransactions(cloudPortfolio.transactions);
        }

        setSyncStatus(cloudPortfolio ? 'Carteira baixada' : 'Nada salvo na nuvem');
      })
      .catch(() => setSyncStatus('Falha ao baixar da nuvem'))
      .finally(() => setSyncing(false));
  };

  if (isSupabaseConfigured && !session) {
    return <AuthScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <Header />
        <View style={styles.syncBanner}>
          <Ionicons
            color={session ? '#0E7A4F' : '#9A5A04'}
            name={session ? 'cloud-done-outline' : 'phone-portrait-outline'}
            size={16}
          />
          <Text style={styles.syncBannerText}>
            {session?.user.email ? `${syncStatus} - ${session.user.email}` : 'Modo local'}
          </Text>
          {session ? (
            <View style={styles.syncActions}>
              <Pressable accessibilityRole="button" disabled={syncing} onPress={saveNow}>
                <Text style={styles.syncActionText}>Sync</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={syncing} onPress={pullNow}>
                <Text style={styles.syncActionText}>Baixar</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => supabase?.auth.signOut()}>
                <Text style={styles.signOutText}>Sair</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
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
          {activeTab === 'dashboard' && (
            <Dashboard
              alerts={portfolioAlerts}
              allocation={portfolioAllocation}
              totals={totals}
            />
          )}
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
          {activeTab === 'metas' && <Goals totals={totals} />}
          {activeTab === 'benchmarks' && <Benchmarks />}
          {activeTab === 'radar' && (
            <Opportunities alerts={portfolioAlerts} positions={portfolioPositions} />
          )}
          {activeTab === 'ia' && (
            <Assistant
              allocation={portfolioAllocation}
              positions={portfolioPositions}
              totals={totals}
            />
          )}
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
  alerts,
  allocation,
  totals,
}: {
  alerts: AlertItem[];
  allocation: AllocationSlice[];
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

function Goals({
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
  const [monthlyContribution, setMonthlyContribution] = useState('1000');
  const [expectedReturn, setExpectedReturn] = useState('10');
  const [expectedInflation, setExpectedInflation] = useState('4');
  const [passiveIncomeTargetInput, setPassiveIncomeTargetInput] = useState('3000');
  const [emergencyReserveTargetInput, setEmergencyReserveTargetInput] = useState('36000');
  const [financialFreedomTargetInput, setFinancialFreedomTargetInput] = useState('1000000');
  const [reinvestDividends, setReinvestDividends] = useState(true);
  const contribution = parseNumber(monthlyContribution);
  const annualReturn = parseNumber(expectedReturn);
  const annualInflation = parseNumber(expectedInflation);
  const passiveIncomeTarget = parseNumber(passiveIncomeTargetInput);
  const emergencyReserveTarget = parseNumber(emergencyReserveTargetInput);
  const financialFreedomTarget = parseNumber(financialFreedomTargetInput);
  const monthlyDividendAverage = dividendHistory.reduce((sum, item) => sum + item.value, 0) / dividendHistory.length;
  const projectedYearlyDividends = monthlyDividendAverage * 12;
  const effectiveMonthlyContribution = contribution + (reinvestDividends ? monthlyDividendAverage : 0);
  const realAnnualReturn = calculateRealAnnualReturn(annualReturn, annualInflation);
  const monthsToFreedom = calculateMonthsToGoal({
    currentValue: totals.current,
    monthlyContribution: effectiveMonthlyContribution,
    targetValue: financialFreedomTarget,
    annualRealReturn: realAnnualReturn,
  });

  return (
    <>
      <View style={styles.heroPanel}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.overline}>Plano financeiro</Text>
            <Text style={styles.heroValue}>{currency.format(totals.current)}</Text>
          </View>
          <View style={styles.incomeBadge}>
            <Text style={styles.incomeBadgeText}>
              {Math.round((totals.current / financialFreedomTarget) * 100)}%
            </Text>
          </View>
        </View>
        <View style={styles.metricGrid}>
          <Metric label="Meta liberdade" value={currency.format(financialFreedomTarget)} />
          <Metric label="Renda projetada" value={currency.format(projectedYearlyDividends)} />
          <Metric label="Aporte efetivo" value={currency.format(effectiveMonthlyContribution)} />
          <Metric label="Retorno real" value={`${realAnnualReturn.toFixed(1)}% a.a.`} />
        </View>
      </View>

      <SectionTitle title="Configurar metas" />
      <View style={styles.card}>
        <Field
          label="Renda passiva mensal desejada"
          onChangeText={setPassiveIncomeTargetInput}
          placeholder="3000"
          value={passiveIncomeTargetInput}
        />
        <Field
          label="Reserva de emergencia desejada"
          onChangeText={setEmergencyReserveTargetInput}
          placeholder="36000"
          value={emergencyReserveTargetInput}
        />
        <Field
          label="Meta de liberdade financeira"
          onChangeText={setFinancialFreedomTargetInput}
          placeholder="1000000"
          value={financialFreedomTargetInput}
        />
      </View>

      <SectionTitle title="Metas principais" />
      <GoalCard
        icon="cash-outline"
        label="Renda passiva mensal"
        progress={monthlyDividendAverage}
        target={passiveIncomeTarget}
      />
      <GoalCard
        icon="shield-checkmark-outline"
        label="Reserva de emergencia"
        progress={Math.min(totals.current * 0.18, emergencyReserveTarget)}
        target={emergencyReserveTarget}
      />
      <GoalCard
        icon="rocket-outline"
        label="Liberdade financeira"
        progress={totals.current}
        target={financialFreedomTarget}
      />

      <SectionTitle title="Simulacao" action="aporte mensal" />
      <View style={styles.card}>
        <Field
          label="Quanto voce pretende aportar por mes?"
          onChangeText={setMonthlyContribution}
          placeholder="1000"
          value={monthlyContribution}
        />
        <View style={styles.formGrid}>
          <Field
            label="Rentabilidade anual esperada (%)"
            onChangeText={setExpectedReturn}
            placeholder="10"
            value={expectedReturn}
          />
          <Field
            label="Inflacao anual esperada (%)"
            onChangeText={setExpectedInflation}
            placeholder="4"
            value={expectedInflation}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setReinvestDividends((current) => !current)}
          style={styles.toggleRow}
        >
          <View style={[styles.toggleBox, reinvestDividends && styles.toggleBoxActive]}>
            {reinvestDividends ? (
              <Ionicons color="#FFFFFF" name="checkmark-outline" size={16} />
            ) : null}
          </View>
          <View style={styles.toggleTextBlock}>
            <Text style={styles.rowTitle}>Reinvestir dividendos</Text>
            <Text style={styles.muted}>
              Soma a media mensal de dividendos ao aporte da simulacao.
            </Text>
          </View>
        </Pressable>
        <View style={styles.formSummary}>
          <Text style={styles.muted}>Prazo com juros compostos reais</Text>
          <Text style={styles.formSummaryValue}>{formatYears(monthsToFreedom)}</Text>
        </View>
        <Text style={styles.simulationNote}>
          A simulacao usa rentabilidade real mensal, descontando inflacao, e considera aportes
          mensais constantes. Quando ativado, dividendos entram como aporte adicional.
        </Text>
      </View>
    </>
  );
}

function GoalCard({
  icon,
  label,
  progress,
  target,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  progress: number;
  target: number;
}) {
  const percent = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;

  return (
    <View style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <View style={styles.goalIcon}>
          <Ionicons color="#2868E8" name={icon} size={20} />
        </View>
        <View style={styles.goalTitleBlock}>
          <Text style={styles.rowTitle}>{label}</Text>
          <Text style={styles.muted}>
            {currency.format(progress)} de {currency.format(target)}
          </Text>
        </View>
        <Text style={styles.goalPercent}>{percent}%</Text>
      </View>
      <View style={styles.goalTrack}>
        <View style={[styles.goalFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

function Opportunities({
  alerts,
  positions,
}: {
  alerts: AlertItem[];
  positions: Position[];
}) {
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

function Assistant({
  allocation,
  positions,
  totals,
}: {
  allocation: AllocationSlice[];
  positions: Position[];
  totals: {
    invested: number;
    current: number;
    dividendsTotal: number;
    profit: number;
    performance: number;
  };
}) {
  const questions = [
    'Como esta minha carteira?',
    'Quais ativos mais puxaram minha rentabilidade?',
    'Quanto recebi de dividendos este mes?',
    'Qual ativo esta acima do meu preco teto?',
  ];
  const [selectedQuestion, setSelectedQuestion] = useState(questions[0]);
  const answer = getAssistantAnswer({
    allocation,
    formatCurrency: (value) => currency.format(value),
    positions,
    question: selectedQuestion,
    totals,
  });

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
          {answer}
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
      {questions.map((question) => (
        <Pressable
          accessibilityRole="button"
          key={question}
          onPress={() => setSelectedQuestion(question)}
          style={[
            styles.questionButton,
            selectedQuestion === question && styles.questionButtonActive,
          ]}
        >
          <Text
            style={[
              styles.questionText,
              selectedQuestion === question && styles.questionTextActive,
            ]}
          >
            {question}
          </Text>
          <Ionicons
            color={selectedQuestion === question ? '#FFFFFF' : '#2868E8'}
            name="arrow-forward-outline"
            size={18}
          />
        </Pressable>
      ))}
    </>
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

function AssetDetail({
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

function TransactionForm({
  onCancel,
  onCreateAsset,
  positions,
  onSubmit,
}: {
  onCancel: () => void;
  onCreateAsset: (asset: Position) => void;
  positions: Position[];
  onSubmit: (transaction: Transaction) => void;
}) {
  const [assetMode, setAssetMode] = useState<'existing' | 'new'>('existing');
  const [ticker, setTicker] = useState(positions[0].ticker);
  const [type, setType] = useState<Transaction['type']>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('0');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTicker, setNewTicker] = useState('');
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<Position['type']>('Acao');
  const [sector, setSector] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [ceilingPrice, setCeilingPrice] = useState('');
  const [fairPrice, setFairPrice] = useState('');

  const selectedPosition = positions.find((position) => position.ticker === ticker);
  const catalogMatches = useMemo(
    () => searchAssetCatalog(`${newTicker} ${name}`),
    [name, newTicker],
  );

  useEffect(() => {
    if (assetMode === 'existing' && selectedPosition) {
      setPrice(String(selectedPosition.currentPrice).replace('.', ','));
    }
  }, [assetMode, selectedPosition]);

  const quantityValue = parseNumber(quantity);
  const existingPriceValue = parseNumber(price);
  const currentPriceValue = parseNumber(currentPrice);
  const priceValue = assetMode === 'new' ? currentPriceValue : existingPriceValue;
  const feesValue = parseNumber(fees);
  const ceilingPriceValue = parseNumber(ceilingPrice);
  const fairPriceValue = parseNumber(fairPrice);
  const normalizedNewTicker = newTicker.trim().toUpperCase();
  const newAssetIsValid =
    normalizedNewTicker.length >= 3 &&
    name.trim().length >= 2 &&
    sector.trim().length >= 2 &&
    currentPriceValue > 0;
  const canSubmit =
    quantityValue > 0 &&
    priceValue > 0 &&
    feesValue >= 0 &&
    isValidDateInput(date) &&
    (assetMode === 'existing' || newAssetIsValid);

  const transactionTicker = assetMode === 'new' ? normalizedNewTicker : ticker;

  const applyCatalogMatch = (match: ReturnType<typeof searchAssetCatalog>[number]) => {
    setNewTicker(match.ticker);
    setName(match.name);
    setAssetType(match.type);
    setSector(match.sector);
    setCurrentPrice(formatInputNumber(match.currentPrice));
    setCeilingPrice(match.ceilingPrice > 0 ? formatInputNumber(match.ceilingPrice) : '');
    setFairPrice(match.fairPrice > 0 ? formatInputNumber(match.fairPrice) : '');
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Adicionar ativo ou lancamento</Text>
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

      <Text style={styles.inputLabel}>Origem do ativo</Text>
      <View style={styles.segmented}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAssetMode('existing')}
          style={[styles.segmentButton, assetMode === 'existing' && styles.segmentActive]}
        >
          <Text
            style={[
              styles.segmentText,
              assetMode === 'existing' && styles.segmentTextActive,
            ]}
          >
            Existente
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAssetMode('new')}
          style={[styles.segmentButton, assetMode === 'new' && styles.segmentActive]}
        >
          <Text
            style={[
              styles.segmentText,
              assetMode === 'new' && styles.segmentTextActive,
            ]}
          >
            Novo ativo
          </Text>
        </Pressable>
      </View>

      <Text style={styles.inputLabel}>Ativo</Text>
      {assetMode === 'existing' ? (
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
      ) : (
        <>
          <View style={styles.formGrid}>
            <Field
              inputMode="text"
              label="Ticker"
              onChangeText={setNewTicker}
              placeholder="PETR4"
              value={newTicker}
            />
            <Field
              inputMode="text"
              label="Nome"
              onChangeText={setName}
              placeholder="Petrobras"
              value={name}
            />
          </View>
          {catalogMatches.length ? (
            <View style={styles.suggestionBox}>
              <Text style={styles.suggestionTitle}>Sugestoes encontradas</Text>
              {catalogMatches.map((match) => (
                <Pressable
                  accessibilityRole="button"
                  key={match.ticker}
                  onPress={() => applyCatalogMatch(match)}
                  style={styles.suggestionRow}
                >
                  <View>
                    <Text style={styles.rowTitle}>{match.ticker}</Text>
                    <Text style={styles.muted}>{match.name}</Text>
                  </View>
                  <View style={styles.suggestionMeta}>
                    <Text style={styles.suggestionType}>{match.type}</Text>
                    <Text style={styles.suggestionPrice}>
                      {currency.format(match.currentPrice)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={styles.inputLabel}>Classe</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterChips}>
              {(['Acao', 'FII', 'ETF', 'Renda fixa'] as Position['type'][]).map((item) => {
                const selected = assetType === item;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={item}
                    onPress={() => setAssetType(item)}
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
        </>
      )}

      <View style={styles.formGrid}>
        <Field
          label="Quantidade"
          onChangeText={setQuantity}
          placeholder="100"
          value={quantity}
        />
        {assetMode === 'existing' ? (
          <Field
            label="Preco"
            onChangeText={setPrice}
            placeholder="10,50"
            value={price}
          />
        ) : null}
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
        <Text style={styles.muted}>
          {assetMode === 'new'
            ? 'Preco do lancamento vem da cotacao'
            : 'Preco preenchido pela cotacao atual'}
        </Text>
        <Text style={styles.formSummaryValue}>{currency.format(priceValue)}</Text>
      </View>

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
          onPress={() => {
            if (assetMode === 'new') {
              onCreateAsset({
                ticker: normalizedNewTicker,
                name: name.trim(),
                type: assetType,
                sector: sector.trim(),
                allocation: 0,
                quantity: 0,
                averagePrice: 0,
                currentPrice: currentPriceValue,
                ceilingPrice: ceilingPriceValue,
                fairPrice: fairPriceValue,
              });
            }

            onSubmit({
              id: `trx-${Date.now()}`,
              ticker: transactionTicker,
              type,
              quantity: quantityValue,
              price: priceValue,
              fees: feesValue,
              date,
            });
          }}
          style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
        >
          <Text style={styles.primaryButtonText}>Salvar</Text>
        </Pressable>
      </View>
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

function TransactionRow({
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

function OpportunityRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.opportunityRow}>
      <Text style={styles.rowTitle}>{label}</Text>
      <Text style={styles.muted}>{value}</Text>
    </View>
  );
}

function formatOptionalCurrency(value: number) {
  return value > 0 ? currency.format(value) : 'Nao definido';
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
  authShell: {
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 520,
    padding: 18,
    width: '100%',
  },
  authTitle: {
    color: '#172434',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 18,
  },
  authText: {
    color: '#657487',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    marginTop: 8,
  },
  authMessage: {
    color: '#9A5A04',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginBottom: 12,
    marginTop: 4,
  },
  authSwitch: {
    alignItems: 'center',
    marginTop: 14,
    minHeight: 36,
    justifyContent: 'center',
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
  syncBanner: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomColor: '#E1E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  syncBannerText: {
    color: '#657487',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  syncActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  syncActionText: {
    color: '#2868E8',
    fontSize: 12,
    fontWeight: '900',
  },
  signOutText: {
    color: '#B64242',
    fontSize: 12,
    fontWeight: '900',
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
  benchmarkLegendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
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
  positionCardSelected: {
    borderColor: '#2868E8',
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
  suggestionBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 10,
  },
  suggestionTitle: {
    color: '#657487',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
  },
  suggestionRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: 10,
  },
  suggestionMeta: {
    alignItems: 'flex-end',
  },
  suggestionType: {
    color: '#2868E8',
    fontSize: 12,
    fontWeight: '900',
  },
  suggestionPrice: {
    color: '#172434',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
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
  toggleRow: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    padding: 10,
  },
  toggleBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 6,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  toggleBoxActive: {
    backgroundColor: '#2868E8',
    borderColor: '#2868E8',
  },
  toggleTextBlock: {
    flex: 1,
    gap: 3,
  },
  simulationNote: {
    color: '#657487',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 10,
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
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F0',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  goalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  goalIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF0FF',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  goalTitleBlock: {
    flex: 1,
    gap: 3,
  },
  goalPercent: {
    color: '#2868E8',
    fontSize: 15,
    fontWeight: '900',
  },
  goalTrack: {
    backgroundColor: '#EDF1F6',
    borderRadius: 5,
    height: 10,
    marginTop: 14,
    overflow: 'hidden',
  },
  goalFill: {
    backgroundColor: '#2868E8',
    borderRadius: 5,
    height: 10,
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
  questionButtonActive: {
    backgroundColor: '#2868E8',
    borderColor: '#2868E8',
  },
  questionText: {
    color: '#172434',
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    paddingRight: 10,
  },
  questionTextActive: {
    color: '#FFFFFF',
  },
});
