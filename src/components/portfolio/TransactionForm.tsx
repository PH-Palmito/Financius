import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field } from '../ui';
import { env } from '../../config/env';
import {
  resolveAssetCandidates,
  resolveBestAsset,
  type AssetMatch,
} from '../../domain/assetResolver';
import type { Position, Transaction } from '../../domain/types';
import { resolveLatestQuote } from '../../services/marketData';
import {
  formatInputNumber,
  isValidDateInput,
  parseNumber,
} from '../../utils/format';

const currency = new Intl.NumberFormat(env.defaultLocale, {
  style: 'currency',
  currency: env.defaultCurrency,
});

export function TransactionForm({
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
  const [quoteStatus, setQuoteStatus] = useState('Digite ticker ou nome para buscar cotacao');

  const normalizedNewTicker = newTicker.trim().toUpperCase();
  const selectedPosition = positions.find((position) => position.ticker === ticker);
  const catalogMatches = useMemo(
    () => resolveAssetCandidates(`${newTicker} ${name}`),
    [name, newTicker],
  );

  useEffect(() => {
    let active = true;

    if (assetMode === 'existing' && selectedPosition) {
      setQuoteStatus('Buscando cotacao...');
      resolveLatestQuote(selectedPosition.ticker)
        .then((quote) => {
          if (!active) {
            return;
          }

          if (quote) {
            setPrice(formatInputNumber(quote.price));
            setQuoteStatus(
              quote.source === 'api'
                ? `Cotacao atualizada por API: ${currency.format(quote.price)}`
                : `Cotacao do catalogo: ${currency.format(quote.price)}`,
            );
            return;
          }

          setPrice(formatInputNumber(selectedPosition.currentPrice));
          setQuoteStatus('Cotacao local da carteira');
        })
        .catch(() => {
          if (active) {
            setPrice(formatInputNumber(selectedPosition.currentPrice));
            setQuoteStatus('Falha ao buscar cotacao, usando carteira');
          }
        });
    }

    return () => {
      active = false;
    };
  }, [assetMode, selectedPosition]);

  useEffect(() => {
    if (assetMode !== 'new') {
      return;
    }

    const bestMatch = resolveBestAsset(`${newTicker} ${name}`);
    if (
      bestMatch &&
      (bestMatch.ticker !== normalizedNewTicker ||
        bestMatch.name !== name ||
        !sector ||
        !currentPrice)
    ) {
      applyCatalogMatch(bestMatch);
    }
  }, [assetMode, currentPrice, name, newTicker, normalizedNewTicker, sector]);

  const quantityValue = parseNumber(quantity);
  const existingPriceValue = parseNumber(price);
  const currentPriceValue = parseNumber(currentPrice);
  const priceValue = assetMode === 'new' ? currentPriceValue : existingPriceValue;
  const feesValue = parseNumber(fees);
  const ceilingPriceValue = parseNumber(ceilingPrice);
  const fairPriceValue = parseNumber(fairPrice);
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

  const applyCatalogMatch = (match: AssetMatch) => {
    setNewTicker(match.ticker);
    setName(match.name);
    setAssetType(match.type);
    setSector(match.sector);
    setCurrentPrice(formatInputNumber(match.currentPrice));
    setCeilingPrice(match.ceilingPrice > 0 ? formatInputNumber(match.ceilingPrice) : '');
    setFairPrice(match.fairPrice > 0 ? formatInputNumber(match.fairPrice) : '');
    setQuoteStatus(`Ativo identificado: ${currency.format(match.currentPrice)}`);
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
                    <Text style={styles.suggestionType}>
                      {match.type} - {match.matchedBy === 'ticker' ? 'ticker' : 'nome'}
                    </Text>
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
        <Text style={styles.muted}>{quoteStatus}</Text>
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

const styles = StyleSheet.create({
  muted: {
    color: '#657487',
    fontSize: 13,
    lineHeight: 18,
  },
  rowTitle: {
    color: '#172434',
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
    justifyContent: 'center',
    minHeight: 36,
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
});
