import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

type TabKey = 'dashboard' | 'carteira' | 'dividendos' | 'radar' | 'ia';

type Position = {
  ticker: string;
  name: string;
  type: string;
  sector: string;
  allocation: number;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  ceilingPrice: number;
  fairPrice: number;
};

type Dividend = {
  ticker: string;
  sector: string;
  amount: number;
  yieldOnCost: number;
  lastPayment: string;
};

const positions: Position[] = [
  {
    ticker: 'ITSA4',
    name: 'Itausa',
    type: 'Acao',
    sector: 'Financeiro',
    allocation: 18.4,
    quantity: 620,
    averagePrice: 8.72,
    currentPrice: 10.18,
    ceilingPrice: 10.8,
    fairPrice: 12.4,
  },
  {
    ticker: 'HGLG11',
    name: 'CSHG Logistica',
    type: 'FII',
    sector: 'Logistica',
    allocation: 15.2,
    quantity: 48,
    averagePrice: 151.2,
    currentPrice: 164.6,
    ceilingPrice: 158.0,
    fairPrice: 171.0,
  },
  {
    ticker: 'BOVA11',
    name: 'ETF Ibovespa',
    type: 'ETF',
    sector: 'Indice',
    allocation: 12.8,
    quantity: 56,
    averagePrice: 111.4,
    currentPrice: 126.9,
    ceilingPrice: 121.0,
    fairPrice: 130.0,
  },
  {
    ticker: 'TESOURO IPCA+',
    name: 'Venc. 2035',
    type: 'Renda fixa',
    sector: 'Renda fixa',
    allocation: 24.5,
    quantity: 1,
    averagePrice: 11420,
    currentPrice: 11980,
    ceilingPrice: 0,
    fairPrice: 0,
  },
];

const allocation = [
  { label: 'Renda fixa', value: 31, color: '#2F6F73' },
  { label: 'Acoes', value: 29, color: '#2868E8' },
  { label: 'FIIs', value: 21, color: '#C9821D' },
  { label: 'ETFs', value: 13, color: '#6F5BD7' },
  { label: 'Caixa', value: 6, color: '#6C7A89' },
];

const equityHistory = [
  { label: 'Jan', value: 28400 },
  { label: 'Fev', value: 29680 },
  { label: 'Mar', value: 29140 },
  { label: 'Abr', value: 31420 },
  { label: 'Mai', value: 33280 },
  { label: 'Jun', value: 34860 },
  { label: 'Jul', value: 36120 },
  { label: 'Ago', value: 37940 },
];

const benchmarkHistory = [
  { label: 'Jan', value: 28400 },
  { label: 'Fev', value: 29110 },
  { label: 'Mar', value: 28790 },
  { label: 'Abr', value: 30020 },
  { label: 'Mai', value: 31200 },
  { label: 'Jun', value: 31990 },
  { label: 'Jul', value: 32640 },
  { label: 'Ago', value: 33480 },
];

const dividends: Dividend[] = [
  { ticker: 'HGLG11', sector: 'Logistica', amount: 172.8, yieldOnCost: 8.9, lastPayment: '15/08' },
  { ticker: 'ITSA4', sector: 'Financeiro', amount: 148.42, yieldOnCost: 7.2, lastPayment: '01/08' },
  { ticker: 'MXRF11', sector: 'Papel', amount: 92.7, yieldOnCost: 11.4, lastPayment: '14/08' },
  { ticker: 'TAEE11', sector: 'Energia', amount: 88.3, yieldOnCost: 9.1, lastPayment: '28/07' },
  { ticker: 'BOVA11', sector: 'Indice', amount: 34.6, yieldOnCost: 2.3, lastPayment: '30/07' },
];

const dividendHistory = [
  { label: 'Jan', value: 264 },
  { label: 'Fev', value: 318 },
  { label: 'Mar', value: 286 },
  { label: 'Abr', value: 402 },
  { label: 'Mai', value: 438 },
  { label: 'Jun', value: 461 },
  { label: 'Jul', value: 512 },
  { label: 'Ago', value: 536 },
];

const alerts: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}[] = [
  {
    icon: 'warning-outline',
    title: 'Concentracao em financeiro',
    text: 'Financeiro representa 34% da carteira. Seu limite configurado e 30%.',
  },
  {
    icon: 'cash-outline',
    title: 'Renda mensal subindo',
    text: 'Dividendos dos ultimos 3 meses cresceram 18% contra o trimestre anterior.',
  },
  {
    icon: 'newspaper-outline',
    title: 'Noticia relevante em bancos',
    text: 'Aumento de inadimplencia pode pressionar lucro e dividendos futuros.',
  },
];

const news = [
  'Resultado trimestral de bancos veio misto, com pressao em provisoes.',
  'FIIs logisticos mantem vacancia controlada nos principais mercados.',
  'Juros futuros recuam e favorecem marcacao de renda fixa prefixada.',
];

const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'dashboard', label: 'Inicio', icon: 'grid-outline' },
  { key: 'carteira', label: 'Carteira', icon: 'wallet-outline' },
  { key: 'dividendos', label: 'Dividendos', icon: 'cash-outline' },
  { key: 'radar', label: 'Radar', icon: 'scan-outline' },
  { key: 'ia', label: 'IA', icon: 'sparkles-outline' },
];

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  const totals = useMemo(() => {
    const invested = positions.reduce(
      (sum, position) => sum + position.quantity * position.averagePrice,
      0,
    );
    const current = positions.reduce(
      (sum, position) => sum + position.quantity * position.currentPrice,
      0,
    );
    const dividendsTotal = dividends.reduce((sum, item) => sum + item.amount, 0);

    return {
      invested,
      current,
      dividendsTotal,
      profit: current - invested,
      performance: ((current - invested) / invested) * 100,
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <Header />
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
          {activeTab === 'carteira' && <Portfolio />}
          {activeTab === 'dividendos' && <Dividends />}
          {activeTab === 'radar' && <Opportunities />}
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
        <Text style={styles.brand}>Financius</Text>
        <Text style={styles.headerCopy}>Gestao de investimentos com IA</Text>
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

function Portfolio() {
  return (
    <>
      <SectionTitle title="Posicoes" action="Adicionar" />
      {positions.map((position) => (
        <View key={position.ticker} style={styles.positionCard}>
          <View style={styles.positionHeader}>
            <View style={styles.positionTitleBlock}>
              <Text style={styles.ticker}>{position.ticker}</Text>
              <Text style={styles.muted}>{position.name}</Text>
            </View>
            <View style={styles.assetPill}>
              <Text style={styles.assetPillText}>{position.type}</Text>
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
        </View>
      ))}
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

function Opportunities() {
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

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionHeading}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
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

function DividendRow({ item, rank }: { item: Dividend; rank: number }) {
  return (
    <View style={styles.dividendRow}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <View style={styles.dividendInfo}>
        <Text style={styles.rowTitle}>{item.ticker}</Text>
        <Text style={styles.muted}>
          {item.sector} · pago em {item.lastPayment}
        </Text>
      </View>
      <View style={styles.dividendValueBlock}>
        <Text style={styles.dividendAmount}>{currency.format(item.amount)}</Text>
        <Text style={styles.dividendYield}>{item.yieldOnCost.toFixed(1)}% a.a.</Text>
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

function getSafetyMargin(position: Position) {
  if (!position.fairPrice) {
    return 'Nao se aplica';
  }

  const margin = ((position.fairPrice - position.currentPrice) / position.fairPrice) * 100;
  return `${margin.toFixed(1)}%`;
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
