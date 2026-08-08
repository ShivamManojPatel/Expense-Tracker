import { formatMoney } from '../utils/format';

// A moody, "vault ledger" categorical palette — brass, verdigris, rust, slate, plum,
// olive, steel, leather — deliberately distinct from the app's semantic green/coral
// (income/expense) so pie slices don't get misread as good/bad signals.
export const CHART_COLORS = ['#CBA24D', '#6E8B7E', '#8C5A3C', '#6B7280', '#9C7A9C', '#7A8C4C', '#4C6B8C', '#A67C52'];

export function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{payload[0].payload.name || label}</div>
      <div className="chart-tooltip-value">{formatMoney(payload[0].value, currency)}</div>
    </div>
  );
}