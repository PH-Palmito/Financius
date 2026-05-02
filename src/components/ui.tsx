import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export function Metric({
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

export function SectionTitle({
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

export function Field({
  label,
  value,
  placeholder,
  inputMode = 'decimal',
  secureTextEntry,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  inputMode?: 'decimal' | 'numeric' | 'text';
  secureTextEntry?: boolean;
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
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

export function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.chartLegend}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  field: {
    flex: 1,
  },
  inputLabel: {
    color: '#657487',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 7,
    marginTop: 12,
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
  muted: {
    color: '#657487',
    fontSize: 13,
    lineHeight: 18,
  },
});
