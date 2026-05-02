import type { ChartPoint } from '../domain/types';

export function parseNumber(value: string) {
  const normalized = value.replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatInputNumber(value: number) {
  return String(value).replace('.', ',');
}

export function lastPoint(points: ChartPoint[]) {
  return points[points.length - 1]?.value ?? 0;
}

export function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function formatYears(months: number) {
  if (!months) {
    return 'Sem aporte';
  }

  if (months === Infinity) {
    return 'Nao atinge com estes parametros';
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (!years) {
    return `${remainingMonths} meses`;
  }

  if (!remainingMonths) {
    return `${years} anos`;
  }

  return `${years} anos e ${remainingMonths} meses`;
}
