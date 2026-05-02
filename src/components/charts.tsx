import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

export function DonutChart({
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

export function LineChart({
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

export function BarChart({
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

const styles = StyleSheet.create({
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
});
