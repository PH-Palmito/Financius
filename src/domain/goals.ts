export function calculateRealAnnualReturn(
  nominalAnnualReturn: number,
  annualInflation: number,
) {
  const nominal = nominalAnnualReturn / 100;
  const inflation = annualInflation / 100;
  return ((1 + nominal) / (1 + inflation) - 1) * 100;
}

export function calculateMonthsToGoal({
  currentValue,
  monthlyContribution,
  targetValue,
  annualRealReturn,
}: {
  currentValue: number;
  monthlyContribution: number;
  targetValue: number;
  annualRealReturn: number;
}) {
  if (currentValue >= targetValue) {
    return 0;
  }

  const monthlyRate = Math.pow(1 + annualRealReturn / 100, 1 / 12) - 1;
  let value = currentValue;

  for (let month = 1; month <= 1200; month += 1) {
    value = value * (1 + monthlyRate) + monthlyContribution;

    if (value >= targetValue) {
      return month;
    }
  }

  return Infinity;
}
