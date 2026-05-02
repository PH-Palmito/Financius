import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionTitle } from '../components/ui';
import { env, hasBackendConfig } from '../config/env';
import { getAssistantAnswer } from '../domain/analytics';
import type { AllocationSlice, Position } from '../domain/types';

const currency = new Intl.NumberFormat(env.defaultLocale, {
  style: 'currency',
  currency: env.defaultCurrency,
});

type AssistantProps = {
  allocation: AllocationSlice[];
  positions: Position[];
  totals: {
    invested: number;
    current: number;
    dividendsTotal: number;
    profit: number;
    performance: number;
  };
};

const questions = [
  'Como esta minha carteira?',
  'Quais ativos mais puxaram minha rentabilidade?',
  'Quanto recebi de dividendos este mes?',
  'Qual ativo esta acima do meu preco teto?',
];

export function Assistant({ allocation, positions, totals }: AssistantProps) {
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
        <Text style={styles.aiText}>{answer}</Text>
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

const styles = StyleSheet.create({
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
