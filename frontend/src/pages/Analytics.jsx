import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/format';

const CHART_COLORS = ['#3B6D11', '#378ADD', '#D85A30', '#7F77DD', '#D4537E', '#BA7517', '#1D9E75', '#888780'];

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

  const byPaymentMethod = useMemo(() => {
    const map = {};
    spendOnly.forEach((e) => {
      map[e.paymentMethod] = (map[e.paymentMethod] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
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
            <BarChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-line)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatMoney(v, user?.currency)} />
              <Bar dataKey="total" fill="#3B6D11" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="section-title">By category</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {byCategory.map((entry, i) => (
                    <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v, user?.currency)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
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