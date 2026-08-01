import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDate } from '../utils/format';
import GoalModal from '../components/GoalModal';

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null);
  const [contributeId, setContributeId] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const load = async () => {
    const res = await api.get('/goals');
    setGoals(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (data) => {
    if (modalMode && modalMode !== 'add') {
      await api.put(`/goals/${modalMode._id}`, data);
    } else {
      await api.post('/goals', data);
    }
    await load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return;
    await api.delete(`/goals/${id}`);
    await load();
  };

  const submitContribution = async (goal) => {
    const amount = Number(contributeAmount);
    if (!amount) return;
    await api.put(`/goals/${goal._id}`, { currentAmount: goal.currentAmount + amount });
    setContributeId(null);
    setContributeAmount('');
    await load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Savings goals</h1>
          <p>{goals.length} goal{goals.length !== 1 ? 's' : ''} in progress</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalMode('add')}>
          <i className="ti ti-plus"></i> New goal
        </button>
      </div>

      {loading ? (
        <div className="loading-note">Loading…</div>
      ) : goals.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <i className="ti ti-target-arrow"></i>
            No savings goals yet — set one to start tracking progress.
          </div>
        </div>
      ) : (
        <div className="goal-grid">
          {goals.map((g) => {
            const pct = g.targetAmount ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
            return (
              <div className="card goal-card" key={g._id}>
                <div className="page-header" style={{ marginBottom: 10 }}>
                  <h3 style={{ fontSize: 16 }}>{g.name}</h3>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn" onClick={() => setModalMode(g)} aria-label="Edit">
                      <i className="ti ti-edit"></i>
                    </button>
                    <button className="icon-btn" onClick={() => handleDelete(g._id)} aria-label="Delete">
                      <i className="ti ti-trash"></i>
                    </button>
                  </div>
                </div>

                <div className="budget-top">
                  <span>{formatMoney(g.currentAmount, user?.currency)}</span>
                  <span>{formatMoney(g.targetAmount, user?.currency)}</span>
                </div>
                <div className="budget-track">
                  <div className="budget-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="tx-meta" style={{ marginTop: 8 }}>
                  {Math.round(pct)}% funded
                  {g.targetDate && ` · target ${formatDate(g.targetDate)}`}
                </div>

                {contributeId === g._id ? (
                  <div className="field-row" style={{ marginTop: 12 }}>
                    <input
                      type="number"
                      placeholder="Amount"
                      value={contributeAmount}
                      onChange={(e) => setContributeAmount(e.target.value)}
                      autoFocus
                    />
                    <button className="btn btn-primary" onClick={() => submitContribution(g)}>Add</button>
                  </div>
                ) : (
                  <button className="btn" style={{ marginTop: 12 }} onClick={() => setContributeId(g._id)}>
                    <i className="ti ti-plus"></i> Add contribution
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalMode && (
        <GoalModal
          initial={modalMode === 'add' ? null : modalMode}
          onClose={() => setModalMode(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}