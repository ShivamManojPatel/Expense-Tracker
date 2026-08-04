import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDate } from '../utils/format';
import DebtModal from '../components/DebtModal';

export default function Debts() {
  const { user } = useAuth();
  const [summary, setSummary] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null);
  const [modalPreset, setModalPreset] = useState(null);
  const [personFilter, setPersonFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [sumRes, entRes] = await Promise.all([
      api.get('/debts/summary'),
      api.get('/debts', { params: { person: personFilter } })
    ]);
    setSummary(sumRes.data);
    setEntries(entRes.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personFilter]);

  const handleSave = async (data) => {
    setError('');
    try {
      if (modalMode && modalMode !== 'add') {
        await api.put(`/debts/${modalMode._id}`, data);
      } else {
        await api.post('/debts', data);
      }
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this entry.');
      throw err; // keep the modal open so the person can retry
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this debt entry?')) return;
    setError('');
    try {
      await api.delete(`/debts/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete this entry.');
    }
  };

  const openModal = (mode, preset) => {
    setModalPreset(preset || null);
    setModalMode(mode);
  };

  const totalBorrowed = summary.reduce((s, p) => s + p.borrowed, 0);
  const totalRepaid = summary.reduce((s, p) => s + p.repaid, 0);
  const totalOutstanding = summary.reduce((s, p) => s + Math.max(0, p.outstanding), 0);

  const visibleEntries = entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return e.person.toLowerCase().includes(q) || (e.remarks || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Debts</h1>
          <p>Who you owe, who you've paid back, and what's left.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal('add')}>
          <i className="ti ti-plus"></i> Add entry
        </button>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label">Total borrowed</div>
          <div className="metric-value">{formatMoney(totalBorrowed, user?.currency)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total repaid</div>
          <div className="metric-value green">{formatMoney(totalRepaid, user?.currency)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Still outstanding</div>
          <div className={`metric-value ${totalOutstanding > 0 ? 'coral' : 'green'}`}>
            {formatMoney(totalOutstanding, user?.currency)}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-note">Loading…</div>
      ) : summary.length === 0 ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="empty-state">
            <i className="ti ti-hand-stop" aria-hidden="true"></i>
            No debt activity yet — add your first entry.
          </div>
        </div>
      ) : (
        <div className="goal-grid" style={{ marginBottom: 16 }}>
          {summary.map((p) => (
            <div className="card goal-card" key={p.person}>
              <div className="page-header" style={{ marginBottom: 10 }}>
                <h3 style={{ fontSize: 16 }}>{p.person}</h3>
                {p.outstanding > 0 ? (
                  <span className="chip" style={{ background: 'var(--coral-light)', color: 'var(--coral)' }}>
                    You owe {formatMoney(p.outstanding, user?.currency)}
                  </span>
                ) : p.outstanding < 0 ? (
                  <span className="chip" style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}>
                    Overpaid {formatMoney(-p.outstanding, user?.currency)}
                  </span>
                ) : (
                  <span className="chip">Settled</span>
                )}
              </div>
              <div className="tx-meta" style={{ marginBottom: 10 }}>
                Borrowed {formatMoney(p.borrowed, user?.currency)} · Repaid {formatMoney(p.repaid, user?.currency)}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn"
                  style={{ flex: 1 }}
                  onClick={() => openModal('add', { type: 'borrowed', person: p.person })}
                >
                  Borrow more
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => openModal('add', { type: 'repaid', person: p.person })}
                  disabled={p.outstanding <= 0}
                >
                  Repay
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>History</div>
        </div>

        <div className="filters-bar">
          <input
            placeholder="Search by person or remarks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)}>
            <option value="All">All people</option>
            {summary.map((p) => (
              <option key={p.person} value={p.person}>{p.person}</option>
            ))}
          </select>
        </div>

        {visibleEntries.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-receipt-2" aria-hidden="true"></i>
            No entries match this filter.
          </div>
        ) : (
          visibleEntries.map((e) => (
            <div className="tx-row" key={e._id}>
              <div className={`tx-icon ${e.type === 'repaid' ? 'tx-icon-income' : ''}`}>
                <i className={`ti ${e.type === 'repaid' ? 'ti-check' : 'ti-hand-stop'}`}></i>
              </div>
              <div className="tx-main">
                <div className="tx-title">
                  {e.person} {e.remarks && <span className="tx-meta">· {e.remarks}</span>}
                </div>
                <div className="tx-meta">{e.type === 'borrowed' ? 'Borrowed' : 'Repaid'} · {formatDate(e.date)}</div>
              </div>
              <div className={`tx-amount ${e.type === 'repaid' ? 'tx-amount-income' : ''}`}>
                {e.type === 'repaid' ? '+' : '−'}{formatMoney(e.amount, user?.currency)}
              </div>
              <button className="icon-btn" onClick={() => setModalMode(e)} aria-label="Edit">
                <i className="ti ti-edit"></i>
              </button>
              <button className="icon-btn" onClick={() => handleDelete(e._id)} aria-label="Delete">
                <i className="ti ti-trash"></i>
              </button>
            </div>
          ))
        )}
      </div>

      {modalMode && (
        <DebtModal
          initial={modalMode === 'add' ? null : modalMode}
          defaultType={modalPreset?.type}
          defaultPerson={modalPreset?.person}
          onClose={() => { setModalMode(null); setModalPreset(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}