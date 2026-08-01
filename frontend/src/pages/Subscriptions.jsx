import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/format';
import SubscriptionModal from '../components/SubscriptionModal';
import SubscriptionCalendar from '../components/SubscriptionCalendar';

export default function Subscriptions() {
  const { user } = useAuth();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null);
  const [monthDate, setMonthDate] = useState(new Date());

  const load = async () => {
    const res = await api.get('/subscriptions');
    setSubs(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (data) => {
    if (modalMode && modalMode !== 'add') {
      await api.put(`/subscriptions/${modalMode._id}`, data);
    } else {
      await api.post('/subscriptions', data);
    }
    await load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this subscription?')) return;
    await api.delete(`/subscriptions/${id}`);
    await load();
  };

  const changeMonth = (delta) => {
    setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1));
  };

  const monthLabel = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const monthlyTotal = subs
    .filter((s) => s.active)
    .reduce((sum, s) => sum + (s.billingCycle === 'Yearly' ? s.amount / 12 : s.billingCycle === 'Weekly' ? s.amount * 4.33 : s.amount), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Subscriptions</h1>
          <p>{subs.filter((s) => s.active).length} active · {formatMoney(monthlyTotal, user?.currency)}/mo</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalMode('add')}>
          <i className="ti ti-plus"></i> Add subscription
        </button>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="page-header" style={{ marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>{monthLabel}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="icon-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">
                <i className="ti ti-chevron-left"></i>
              </button>
              <button className="icon-btn" onClick={() => changeMonth(1)} aria-label="Next month">
                <i className="ti ti-chevron-right"></i>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-note">Loading…</div>
          ) : (
            <>
              <SubscriptionCalendar monthDate={monthDate} subscriptions={subs} />
              <div className="cal-legend">
                <div className="cal-legend-item">
                  <span className="cal-dot"></span> Billing day
                </div>
                <div className="cal-legend-item">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1.5px solid var(--green)', display: 'inline-block' }}></span> Today
                </div>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="section-title">All subscriptions</div>
          {subs.length === 0 ? (
            <div className="empty-state">
              <i className="ti ti-calendar-event"></i>
              No subscriptions yet.
            </div>
          ) : (
            subs.map((s) => (
              <div className="tx-row" key={s._id}>
                <div className="tx-icon"><i className="ti ti-refresh"></i></div>
                <div className="tx-main">
                  <div className="tx-title">
                    {s.name} {!s.active && <span className="chip" style={{ marginLeft: 6 }}>Paused</span>}
                  </div>
                  <div className="tx-meta">Day {s.billingDay} · {s.billingCycle}</div>
                </div>
                <div className="tx-amount">{formatMoney(s.amount, user?.currency)}</div>
                <button className="icon-btn" onClick={() => setModalMode(s)} aria-label="Edit">
                  <i className="ti ti-edit"></i>
                </button>
                <button className="icon-btn" onClick={() => handleDelete(s._id)} aria-label="Delete">
                  <i className="ti ti-trash"></i>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {modalMode && (
        <SubscriptionModal
          initial={modalMode === 'add' ? null : modalMode}
          onClose={() => setModalMode(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
