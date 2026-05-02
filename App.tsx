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
  View,
} from 'react-native';

import { env } from './src/config/env';
import {
  allocation,
  dividends,
  positions,
  transactions as initialTransactions,
} from './src/data/mock';
import {
  buildAllocationFromPositions,
  buildPortfolioAlerts,
} from './src/domain/analytics';
import { calculateAveragePrice, groupTransactionsByTicker } from './src/domain/portfolio';
import { refreshPortfolioQuotes } from './src/services/marketData';
import { loadCloudPortfolio, saveCloudPortfolio } from './src/services/portfolioCloud';
import { isSupabaseConfigured, supabase } from './src/services/supabase';
import { AuthScreen } from './src/screens/AuthScreen';
import { Assistant } from './src/screens/Assistant';
import { Benchmarks } from './src/screens/Benchmarks';
import { Dashboard } from './src/screens/Dashboard';
import { Dividends } from './src/screens/Dividends';
import { Goals } from './src/screens/Goals';
import { Opportunities } from './src/screens/Opportunities';
import { Portfolio } from './src/screens/Portfolio';
import type { Position, Transaction } from './src/domain/types';
import {
  clearStoredPortfolio,
  loadStoredPortfolio,
  saveStoredAssets,
  saveStoredTransactions,
} from './src/storage/portfolioStorage';
import { formatDateTime } from './src/utils/format';

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
  const [quotesRefreshing, setQuotesRefreshing] = useState(false);
  const [quoteRefreshStatus, setQuoteRefreshStatus] = useState('Cotacoes locais prontas');

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

  const refreshQuotesNow = () => {
    setQuotesRefreshing(true);
    setQuoteRefreshStatus('Atualizando cotacoes...');

    refreshPortfolioQuotes(portfolioAssets)
      .then((result) => {
        setPortfolioAssets(result.positions);
        setQuoteRefreshStatus(
          result.quotes.length
            ? `${result.quotes.length} cotacoes atualizadas as ${formatDateTime(
                result.updatedAt,
              )}`
            : 'Nenhuma cotacao encontrada',
        );
      })
      .catch(() => setQuoteRefreshStatus('Falha ao atualizar cotacoes'))
      .finally(() => setQuotesRefreshing(false));
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
              onRefreshQuotes={refreshQuotesNow}
              onResetPortfolio={() => {
                setPortfolioAssets(positions);
                setPortfolioTransactions(initialTransactions);
                clearStoredPortfolio();
              }}
              positions={portfolioPositions}
              quoteRefreshStatus={quoteRefreshStatus}
              quotesRefreshing={quotesRefreshing}
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

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F3F6FA',
    flex: 1,
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
  tabsWrap: {
    backgroundColor: '#F8FAFC',
    paddingBottom: 12,
    paddingHorizontal: 14,
    paddingTop: 10,
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
});
