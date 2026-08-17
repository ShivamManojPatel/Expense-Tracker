import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/format';
import { CHART_COLORS, ChartTooltip } from '../components/ChartTheme';

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

  // Day-by-day spend for the current calendar month, up through today. Expense
  // dates are stored as UTC midnight (see date-handling notes elsewhere), so this
  // buckets by UTC day/month/year to stay consistent with the rest of the app.
  const dailySpending = useMemo(() => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const todayDate = now.getUTCDate();

    const map = {};
    spendOnly.forEach((e) => {
      const d = new Date(e.date);
      if (d.getUTCFullYear() === year && d.getUTCMonth() === month) {
        const day = d.getUTCDate();
        map[day] = (map[day] || 0) + e.amount;
      }
    });

    const days = [];
    for (let day = 1; day <= todayDate; day++) {
      days.push({ day: String(day), name: `Day ${day}`, total: Math.round((map[day] || 0) * 100) / 100 });
    }
    return days;
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

      {dailySpending.some((d) => d.total > 0) && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title">Daily spending this month</div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySpending}>
                <defs>
                  <linearGradient id="dailyBrassFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#CBA24D" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#CBA24D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-line)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} interval={dailySpending.length > 20 ? 2 : 0} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<ChartTooltip currency={user?.currency} />} cursor={{ stroke: 'var(--amber)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Area type="monotone" dataKey="total" stroke="#CBA24D" strokeWidth={2} fill="url(#dailyBrassFill)" dot={false} activeDot={{ r: 4, fill: '#CBA24D', stroke: 'var(--paper-raised)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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