import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDate } from '../utils/format';
import ExpenseModal from '../components/ExpenseModal';

export default function Savings() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalDefault, setModalDefault] = useState(null); // 'saving_deposit' | 'saving_withdrawal' | null

  const load = async () => {
    const [expRes, catRes] = await Promise.all([api.get('/expenses'), api.get('/categories')]);
    setExpenses(expRes.data);
    setCategories(catRes.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const savingTx = useMemo(
    () =>
      expenses
        .filter((e) => e.type === 'saving_deposit' || e.type === 'saving_withdrawal')
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [expenses]
  );

  const balance = savingTx.reduce(
    (sum, e) => sum + (e.type === 'saving_deposit' ? e.amount : -e.amount),
    0
  );

  const now = new Date();
  const monthTx = savingTx.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthDeposits = monthTx.filter((e) => e.type === 'saving_deposit').reduce((s, e) => s + e.amount, 0);
  const monthWithdrawals = monthTx.filter((e) => e.type === 'saving_withdrawal').reduce((s, e) => s + e.amount, 0);

  const monthIncome = expenses
    .filter((e) => e.type === 'income' && new Date(e.date).getMonth() === now.getMonth() && new Date(e.date).getFullYear() === now.getFullYear())
    .reduce((s, e) => s + e.amount, 0);
  const savingsRate = monthIncome > 0 ? (monthDeposits / monthIncome) * 100 : null;

  const balanceHistory = useMemo(() => {
    let running = 0;
    const byMonth = {};
    savingTx.forEach((e) => {
      running += e.type === 'saving_deposit' ? e.amount : -e.amount;
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = running;
    });
    return Object.entries(byMonth)
      .slice(-6)
      .map(([key, value]) => {
        const [y, m] = key.split('-');
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short' });
        return { month: label, balance: Math.round(value * 100) / 100 };
      });
  }, [savingTx]);

  const handleSave = async (data) => {
    await api.post('/expenses', data);
    await load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this savings transaction?')) return;
    await api.delete(`/expenses/${id}`);
    await load();
  };

  if (loading) return <div className="loading-note">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Savings</h1>
          <p>Track money you set aside, separate from everyday spending.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setModalDefault('saving_withdrawal')}>
            <i className="ti ti-arrow-back-up"></i> Withdraw
          </button>
          <button className="btn btn-primary" onClick={() => setModalDefault('saving_deposit')}>
            <i className="ti ti-piggy-bank"></i> Add to savings
          </button>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label">Total saved</div>
          <div className="metric-value green">{formatMoney(balance, user?.currency)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Deposited this month</div>
          <div className="metric-value green">{formatMoney(monthDeposits, user?.currency)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Withdrawn this month</div>
          <div className="metric-value">{formatMoney(monthWithdrawals, user?.currency)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Savings rate this month</div>
          <div className="metric-value">{savingsRate === null ? '—' : `${Math.round(savingsRate)}%`}</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="section-title">History</div>
          {savingTx.length === 0 ? (
            <div className="empty-state">
              <i className="ti ti-piggy-bank" aria-hidden="true"></i>
              No savings activity yet — add your first deposit.
            </div>
          ) : (
            [...savingTx].reverse().map((e) => (
              <div className="tx-row" key={e._id}>
                <div className={`tx-icon ${e.type === 'saving_deposit' ? 'tx-icon-income' : ''}`}>
                  <i className="ti ti-piggy-bank"></i>
                </div>
                <div className="tx-main">
                  <div className="tx-title">{e.note || (e.type === 'saving_deposit' ? 'Deposit' : 'Withdrawal')}</div>
                  <div className="tx-meta">{formatDate(e.date)}</div>
                </div>
                <div className={`tx-amount ${e.type === 'saving_deposit' ? 'tx-amount-income' : ''}`}>
                  {e.type === 'saving_deposit' ? '+' : '−'}{formatMoney(e.amount, user?.currency)}
                </div>
                <button className="icon-btn" onClick={() => handleDelete(e._id)} aria-label="Delete">
                  <i className="ti ti-trash"></i>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="section-title">Balance over time</div>
          {balanceHistory.length < 2 ? (
            <div className="empty-state" style={{ padding: '1.5rem 0' }}>
              <i className="ti ti-chart-line"></i>
              Add savings activity across a few months to see a trend line.
            </div>
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-line)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatMoney(v, user?.currency)} />
                  <Line type="monotone" dataKey="balance" stroke="#5bc03e" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {modalDefault && (
        <ExpenseModal
          categories={categories}
          defaultType={modalDefault}
          onClose={() => setModalDefault(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}