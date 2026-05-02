import { useWindowDimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { ChartLegend, Metric, SectionTitle } from '../components/ui';
import { benchmarkSeries } from '../data/benchmarks';
import type { ChartPoint } from '../domain/types';
import { lastPoint } from '../utils/format';

export function Benchmarks() {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(344, Math.max(286, width - 56));
  const carteiraReturn = lastPoint(benchmarkSeries.carteira);
  const cdiReturn = lastPoint(benchmarkSeries.cdi);
  const ibovespaReturn = lastPoint(benchmarkSeries.ibovespa);
  const ipcaReturn = lastPoint(benchmarkSeries.ipca);

  return (
    <>
      <View style={styles.heroPanel}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.overline}>Rentabilidade acumulada</Text>
            <Text style={styles.heroValue}>{carteiraReturn.toFixed(1)}%</Text>
          </View>
          <View style={styles.incomeBadge}>
            <Text style={styles.incomeBadgeText}>
              {(carteiraReturn - cdiReturn).toFixed(1)} p.p. vs CDI
            </Text>
          </View>
        </View>
        <View style={styles.metricGrid}>
          <Metric label="CDI" value={`${cdiReturn.toFixed(1)}%`} />
          <Metric label="Ibovespa" value={`${ibovespaReturn.toFixed(1)}%`} />
          <Metric label="IPCA" value={`${ipcaReturn.toFixed(1)}%`} />
          <Metric
            label="Alfa vs Ibov"
            value={`${(carteiraReturn - ibovespaReturn).toFixed(1)} p.p.`}
          />
        </View>
      </View>

      <SectionTitle title="Comparativo" action="ano atual" />
      <View style={styles.card}>
        <BenchmarkChart
          cdi={benchmarkSeries.cdi}
          data={benchmarkSeries.carteira}
          height={210}
          ibovespa={benchmarkSeries.ibovespa}
          ipca={benchmarkSeries.ipca}
          width={chartWidth}
        />
        <View style={styles.benchmarkLegendGrid}>
          <ChartLegend color="#2868E8" label="Carteira" />
          <ChartLegend color="#0E7A4F" label="CDI" />
          <ChartLegend color="#C9821D" label="Ibovespa" />
          <ChartLegend color="#6F5BD7" label="IPCA" />
        </View>
      </View>

      <SectionTitle title="Leitura rapida" />
      <View style={styles.card}>
        <Text style={styles.aiText}>
          A carteira supera CDI e Ibovespa no periodo simulado. Antes de concluir que ha
          vantagem estrutural, compare tambem volatilidade, concentracao e recorrencia dos
          resultados.
        </Text>
      </View>
    </>
  );
}

function BenchmarkChart({
  data,
  cdi,
  ibovespa,
  ipca,
  width,
  height,
}: {
  data: ChartPoint[];
  cdi: ChartPoint[];
  ibovespa: ChartPoint[];
  ipca: ChartPoint[];
  width: number;
  height: number;
}) {
  const padding = { top: 18, right: 12, bottom: 34, left: 38 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const allValues = [...data, ...cdi, ...ibovespa, ...ipca].map((item) => item.value);
  const min = Math.min(...allValues, 0) - 1;
  const max = Math.max(...allValues) + 3;

  const toPoint = (item: ChartPoint, index: number) => {
    const x = padding.left + (chartWidth / (data.length - 1)) * index;
    const y =
      padding.top + chartHeight - ((item.value - min) / (max - min)) * chartHeight;
    return { x, y };
  };

  const linePath = (items: ChartPoint[]) =>
    items
      .map((item, index) => {
        const point = toPoint(item, index);
        return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      })
      .join(' ');

  return (
    <View style={styles.lineChartWrap}>
      <Svg height={height} width="100%" viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.5, 1].map((rate) => {
          const value = min + (max - min) * rate;
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
                {`${value.toFixed(0)}%`}
              </SvgText>
            </G>
          );
        })}
        <Path
          d={linePath(ipca)}
          fill="transparent"
          stroke="#6F5BD7"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <Path
          d={linePath(cdi)}
          fill="transparent"
          stroke="#0E7A4F"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <Path
          d={linePath(ibovespa)}
          fill="transparent"
          stroke="#C9821D"
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
  lineChartWrap: {
    alignItems: 'center',
    minHeight: 188,
    overflow: 'hidden',
  },
  benchmarkLegendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
  },
  aiText: {
    color: '#34495E',
    fontSize: 14,
    lineHeight: 21,
  },
});
