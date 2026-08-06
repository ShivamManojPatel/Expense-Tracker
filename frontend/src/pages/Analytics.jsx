import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/format';

// A moody, "vault ledger" categorical palette — brass, verdigris, rust, slate, plum,
// olive, steel, leather — deliberately distinct from the app's semantic green/coral
// (income/expense) so pie slices don't get misread as good/bad signals.
const CHART_COLORS = ['#CBA24D', '#6E8B7E', '#8C5A3C', '#6B7280', '#9C7A9C', '#7A8C4C', '#4C6B8C', '#A67C52'];

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{payload[0].payload.name || label}</div>
      <div className="chart-tooltip-value">{formatMoney(payload[0].value, currency)}</div>
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/expenses').then((res) => {
      setExpenses(res.data);
      setLoading(false);
    });
  }, []);

  const spendOnly = useMemo(() => expenses.filter((e) => e.type === 'expense'), [expenses]);

  const byMonth = useMemo(() => {
    const map = {};
    spendOnly.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + e.amount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .slice(-6)
      .map(([key, total]) => {
        const [y, m] = key.split('-');
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short' });
        return { key, month: label, total: Math.round(total * 100) / 100 };
      });
  }, [spendOnly]);

  const byCategory = useMemo(() => {
    const map = {};
    spendOnly.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [spendOnly]);

  const categoryTotal = byCategory.reduce((s, c) => s + c.value, 0);

  const byPaymentMethod = useMemo(() => {
    const map = {};
    spendOnly.forEach((e) => {
      map[e.paymentMethod] = (map[e.paymentMethod] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [spendOnly]);

  const insights = useMemo(() => {
    if (byMonth.length < 1) return [];
    const list = [];
    const thisMonth = byMonth[byMonth.length - 1];
    const lastMonth = byMonth.length > 1 ? byMonth[byMonth.length - 2] : null;

    if (lastMonth && lastMonth.total > 0) {
      const change = ((thisMonth.total - lastMonth.total) / lastMonth.total) * 100;
      const dir = change >= 0 ? 'more' : 'less';
      list.push(`You spent ${Math.abs(Math.round(change))}% ${dir} this month than last month.`);
    }

    if (byCategory.length > 0) {
      list.push(`${byCategory[0].name} is your biggest category overall, at ${formatMoney(byCategory[0].value, user?.currency)}.`);
    }

    const biggest = [...spendOnly].sort((a, b) => b.amount - a.amount)[0];
    if (biggest) {
      list.push(`Your largest single expense was ${formatMoney(biggest.amount, user?.currency)} on ${biggest.note || biggest.category}.`);
    }

    return list;
  }, [byMonth, byCategory, spendOnly]);

  if (loading) return <div className="loading-note">Crunching the numbers…</div>;

  if (spendOnly.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Analytics</h1>
            <p>Trends across your spending.</p>
          </div>
        </div>
        <div className="card">
          <div className="empty-state">
            <i className="ti ti-chart-bar" aria-hidden="true"></i>
            Add a few expenses to see your trends here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>Trends across your spending.</p>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title">Insights</div>
          {insights.map((text, i) => (
            <div className="insight-row" key={i}>
              <i className="ti ti-bulb"></i> {text}
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Last 6 months</div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byMonth} barCategoryGap="32%">
              <defs>
                <linearGradient id="barBrass" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DBAF57" />
                  <stop offset="100%" stopColor="#8C7A3D" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-line)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<ChartTooltip currency={user?.currency} />} cursor={{ fill: 'var(--amber-light)' }} />
              <Bar dataKey="total" fill="url(#barBrass)" radius={[5, 5, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="section-title">By category</div>
          <div className="pie-wrap" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                  stroke="var(--paper-raised)"
                  strokeWidth={2}
                >
                  {byCategory.map((entry, i) => (
                    <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip currency={user?.currency} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-center-label">
              <div className="pie-center-value">{formatMoney(categoryTotal, user?.currency)}</div>
              <div className="pie-center-caption">Total</div>
            </div>
          </div>
          <div className="chart-legend">
            {byCategory.slice(0, 6).map((c, i) => (
              <div className="chart-legend-item" key={c.name}>
                <span className="chart-legend-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="chart-legend-name">{c.name}</span>
                <span className="chart-legend-value">{formatMoney(c.value, user?.currency)}</span>
                <span className="chart-legend-pct">{categoryTotal > 0 ? Math.round((c.value / categoryTotal) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">By payment method</div>
          {byPaymentMethod.map((p, i) => (
            <div className="budget-item" key={p.name}>
              <div className="budget-top">
                <span>{p.name}</span>
                <span>{formatMoney(p.value, user?.currency)}</span>
              </div>
              <div className="budget-track">
                <div
                  className="budget-fill"
                  style={{
                    width: `${Math.min(100, (p.value / byPaymentMethod[0].value) * 100)}%`,
                    background: CHART_COLORS[i % CHART_COLORS.length]
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}