import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Field, Metric, SectionTitle } from '../components/ui';
import { env } from '../config/env';
import { dividendHistory } from '../data/mock';
import { calculateMonthsToGoal, calculateRealAnnualReturn } from '../domain/goals';
import { formatYears, parseNumber } from '../utils/format';

const currency = new Intl.NumberFormat(env.defaultLocale, {
  style: 'currency',
  currency: env.defaultCurrency,
});

type Totals = {
  invested: number;
  current: number;
  dividendsTotal: number;
  profit: number;
  performance: number;
};

export function Goals({ totals }: { totals: Totals }) {
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
  const monthlyDividendAverage =
    dividendHistory.reduce((sum, item) => sum + item.value, 0) / dividendHistory.length;
  const projectedYearlyDividends = monthlyDividendAverage * 12;
  const effectiveMonthlyContribution =
    contribution + (reinvestDividends ? monthlyDividendAverage : 0);
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
  formGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
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
});
