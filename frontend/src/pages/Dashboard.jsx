import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDate, daysUntilBilling } from '../utils/format';
import { CHART_COLORS, ChartTooltip } from '../components/ChartTheme';
import ExpenseModal from '../components/ExpenseModal';
import SubscriptionCalendar from '../components/SubscriptionCalendar';
import AIInsights from '../components/AIInsights';

export default function Dashboard() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState('overview');

  const load = async () => {
    const [expRes, catRes, budRes, subRes] = await Promise.all([
      api.get('/expenses'),
      api.get('/categories'),
      api.get('/budgets'),
      api.get('/subscriptions')
    ]);
    setExpenses(expRes.data);
    setCategories(catRes.data);
    setBudgets(budRes.data);
    setSubs(subRes.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const now = new Date();
  const monthExpenses = useMemo(
    () =>
      expenses.filter((e) => {
        const d = new Date(e.date);
        // Transaction dates are stored as UTC midnight of the picked calendar day,
        // so read them back with UTC getters — "now" stays local since that's the
        // real current moment for the user.
        return d.getUTCMonth() === now.getMonth() && d.getUTCFullYear() === now.getFullYear();
      }),
    [expenses]
  );

  const monthSpend = monthExpenses.filter((e) => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const monthIncome = monthExpenses.filter((e) => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const netThisMonth = monthIncome - monthSpend;
  const totalBudget = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const remaining = totalBudget - monthSpend;
  const monthlySubTotal = subs
    .filter((s) => s.active)
    .reduce((sum, s) => sum + (s.billingCycle === 'Yearly' ? s.amount / 12 : s.billingCycle === 'Weekly' ? s.amount * 4.33 : s.amount), 0);

  const byCategory = useMemo(() => {
    const map = {};
    monthExpenses.filter((e) => e.type === 'expense').forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses]);

  const alerts = useMemo(() => {
    const list = [];
    budgets.forEach((b) => {
      const pct = b.monthlyLimit ? (b.spent / b.monthlyLimit) * 100 : 0;
      if (pct >= 100) list.push({ type: 'danger', text: `${b.category} budget is over by ${formatMoney(b.spent - b.monthlyLimit, user?.currency)}` });
      else if (pct >= 80) list.push({ type: 'warn', text: `${b.category} budget is ${Math.round(pct)}% used` });
    });
    subs.filter((s) => s.active).forEach((s) => {
      const daysAway = daysUntilBilling(s.billingDay, now);
      if (daysAway <= 3) list.push({ type: 'info', text: `${s.name} renews ${daysAway === 0 ? 'today' : 'in ' + daysAway + ' day' + (daysAway > 1 ? 's' : '')}` });
    });
    return list;
  }, [budgets, subs]);

  const recent = expenses.slice(0, 5);

  const handleSave = async (data) => {
    await api.post('/expenses', data);
    await load();
  };

  if (loading) return <div className="loading-note">Loading your dashboard…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p>Here's where things stand this month.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="ti ti-plus"></i> Add transaction
        </button>
      </div>

      <div className="dash-tabs">
        <button className={`dash-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
          Overview
        </button>
        <button className={`dash-tab ${tab === 'ai' ? 'active' : ''}`} onClick={() => setTab('ai')}>
          <i className="ti ti-sparkles"></i> AI suggestions
        </button>
      </div>

      {tab === 'ai' ? (
        <AIInsights />
      ) : (
        <>
          {alerts.length > 0 && (
            <div className="alert-stack">
              {alerts.map((a, i) => (
                <div className={`alert-banner alert-${a.type}`} key={i}>
                  <i className={`ti ${a.type === 'danger' ? 'ti-alert-triangle' : a.type === 'warn' ? 'ti-alert-circle' : 'ti-bell'}`}></i>
                  {a.text}
                </div>
              ))}
            </div>
          )}

          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-label">Spent this month</div>
              <div className="metric-value">{formatMoney(monthSpend, user?.currency)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Income this month</div>
              <div className="metric-value green">{formatMoney(monthIncome, user?.currency)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Net this month</div>
              <div className={`metric-value ${netThisMonth < 0 ? 'coral' : 'green'}`}>{formatMoney(netThisMonth, user?.currency)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Budget remaining</div>
              <div className={`metric-value ${remaining < 0 ? 'coral' : ''}`}>
                {totalBudget ? formatMoney(remaining, user?.currency) : '—'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Monthly subscriptions</div>
              <div className="metric-value">{formatMoney(monthlySubTotal, user?.currency)}</div>
            </div>
          </div>

          <div className="two-col">
            <div className="card">
              <div className="section-title">Recent transactions</div>
              {recent.length === 0 ? (
                <div className="empty-state">
                  <i className="ti ti-receipt-2" aria-hidden="true"></i>
                  Start logging transactions to see them here.
                </div>
              ) : (
                recent.map((e) => (
                  <div className="tx-row" key={e._id}>
                    <div className={`tx-icon ${e.type === 'income' || e.type === 'saving_deposit' ? 'tx-icon-income' : ''}`}>
                      <i className={`ti ${e.type === 'income' ? 'ti-arrow-down-left' : e.type.startsWith('saving') ? 'ti-piggy-bank' : 'ti-receipt'}`}></i>
                    </div>
                    <div className="tx-main">
                      <div className="tx-title">{e.note || e.category}</div>
                      <div className="tx-meta">{e.category} · {formatDate(e.date)}</div>
                    </div>
                    <div className={`tx-amount ${e.type === 'income' || e.type === 'saving_deposit' ? 'tx-amount-income' : ''}`}>
                      {e.type === 'income' || e.type === 'saving_deposit' ? '+' : '−'}{formatMoney(e.amount, user?.currency)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="section-title">Where it's going</div>
                {byCategory.length === 0 ? (
                  <div className="empty-state" style={{ padding: '1.5rem 0' }}>
                    <i className="ti ti-chart-donut"></i>
                    No spending yet this month.
                  </div>
                ) : (
                  <div className="pie-wrap" style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={byCategory}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={48}
                          outerRadius={72}
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
                      <div className="pie-center-value">{formatMoney(monthSpend, user?.currency)}</div>
                      <div className="pie-center-caption">This month</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="section-title">This month's subscriptions</div>
                <SubscriptionCalendar monthDate={now} subscriptions={subs} showTooltip currency={user?.currency} />
              </div>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <ExpenseModal categories={categories} onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
    </div>
  );
}