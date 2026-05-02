import type { AlertItem, AllocationSlice, Position } from './types';

export function getSafetyMargin(position: Position) {
  if (!position.fairPrice) {
    return 'Nao se aplica';
  }

  const margin = ((position.fairPrice - position.currentPrice) / position.fairPrice) * 100;
  return `${margin.toFixed(1)}%`;
}

export function getPositionProfit(position: Position) {
  return position.quantity * (position.currentPrice - position.averagePrice);
}

export function buildAllocationFromPositions(
  positions: Position[],
  fallbackAllocation: AllocationSlice[],
): AllocationSlice[] {
  const colors: Record<string, string> = {
    Acao: '#2868E8',
    FII: '#C9821D',
    ETF: '#6F5BD7',
    'Renda fixa': '#2F6F73',
  };
  const values = positions.reduce<Record<string, number>>((groups, position) => {
    const current = position.quantity * position.currentPrice;
    groups[position.type] = (groups[position.type] || 0) + current;
    return groups;
  }, {});
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);

  if (!total) {
    return fallbackAllocation;
  }

  return Object.entries(values)
    .filter(([, value]) => value > 0)
    .map(([label, value]) => ({
      label,
      value: Math.round((value / total) * 100),
      color: colors[label] || '#6C7A89',
    }));
}

export function buildPortfolioAlerts({
  positions,
  allocation,
  formatCurrency,
}: {
  positions: Position[];
  allocation: AllocationSlice[];
  formatCurrency: (value: number) => string;
}): AlertItem[] {
  const positionedAssets = positions.filter((position) => position.quantity > 0);
  const generatedAlerts: AlertItem[] = [];

  if (!positionedAssets.length) {
    return [
      {
        icon: 'wallet-outline',
        title: 'Carteira sem posicoes',
        text: 'Adicione um ativo e registre um lancamento para iniciar o acompanhamento.',
      },
    ];
  }

  const topAllocation = [...allocation].sort((a, b) => b.value - a.value)[0];
  if (topAllocation && topAllocation.value >= 40) {
    generatedAlerts.push({
      icon: 'warning-outline',
      title: `Concentracao em ${topAllocation.label}`,
      text: `${topAllocation.label} representa ${topAllocation.value}% da carteira. Revise se isso combina com seu perfil de risco.`,
    });
  }

  positionedAssets
    .filter(
      (position) => position.ceilingPrice > 0 && position.currentPrice > position.ceilingPrice,
    )
    .slice(0, 2)
    .forEach((position) => {
      const premium =
        ((position.currentPrice - position.ceilingPrice) / position.ceilingPrice) * 100;
      generatedAlerts.push({
        icon: 'pricetag-outline',
        title: `${position.ticker} acima do preco teto`,
        text: `Cotacao esta ${premium.toFixed(1)}% acima do teto configurado. Revise premissas antes de novos aportes.`,
      });
    });

  positionedAssets
    .filter((position) => {
      const invested = position.quantity * position.averagePrice;
      return invested > 0 && getPositionProfit(position) / invested <= -0.08;
    })
    .slice(0, 2)
    .forEach((position) => {
      generatedAlerts.push({
        icon: 'trending-down-outline',
        title: `${position.ticker} com queda relevante`,
        text: `Resultado da posicao esta em ${formatCurrency(getPositionProfit(position))}. Avalie se os fundamentos continuam validos.`,
      });
    });

  if (!generatedAlerts.length) {
    generatedAlerts.push({
      icon: 'checkmark-circle-outline',
      title: 'Nenhum alerta critico',
      text: 'Carteira sem concentracao extrema, sem ativos acima do teto e sem perdas relevantes configuradas.',
    });
  }

  return generatedAlerts;
}

export function getAssistantAnswer({
  question,
  positions,
  allocation,
  totals,
  formatCurrency,
}: {
  question: string;
  positions: Position[];
  allocation: AllocationSlice[];
  totals: {
    invested: number;
    current: number;
    dividendsTotal: number;
    profit: number;
    performance: number;
  };
  formatCurrency: (value: number) => string;
}) {
  const positionedAssets = positions.filter((position) => position.quantity > 0);
  const topAllocation = [...allocation].sort((a, b) => b.value - a.value)[0];
  const bestAsset = [...positionedAssets].sort(
    (a, b) => getPositionProfit(b) - getPositionProfit(a),
  )[0];
  const aboveCeiling = positionedAssets.filter(
    (position) => position.ceilingPrice > 0 && position.currentPrice > position.ceilingPrice,
  );

  if (question.includes('puxaram')) {
    if (!bestAsset) {
      return 'Ainda nao ha posicoes suficientes para identificar os principais motores de rentabilidade.';
    }

    return `${bestAsset.ticker} e o ativo que mais contribui no momento, com resultado aproximado de ${formatCurrency(
      getPositionProfit(bestAsset),
    )}. Use isso como leitura da carteira, nao como recomendacao de compra ou venda.`;
  }

  if (question.includes('dividendos')) {
    return `Neste mes, os dividendos registrados somam ${formatCurrency(
      totals.dividendsTotal,
    )}. Acompanhe tambem a recorrencia por setor e por ativo antes de projetar renda futura.`;
  }

  if (question.includes('preco teto')) {
    if (!aboveCeiling.length) {
      return 'Nenhum ativo com posicao esta acima do preco teto configurado. Ainda assim, revise os fundamentos antes de qualquer decisao.';
    }

    return `${aboveCeiling
      .map((position) => position.ticker)
      .join(', ')} esta acima do preco teto configurado. Isso sugere revisar premissas e fundamentos antes de novos aportes.`;
  }

  return `Sua carteira vale ${formatCurrency(totals.current)}, com resultado de ${formatCurrency(
    totals.profit,
  )} (${totals.performance.toFixed(1)}%). A maior alocacao esta em ${
    topAllocation?.label ?? 'classe indefinida'
  } (${topAllocation?.value ?? 0}%).`;
}
