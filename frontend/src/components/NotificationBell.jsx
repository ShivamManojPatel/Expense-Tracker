import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { formatMoney, daysUntilNextBilling } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function NotificationBell() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const load = async () => {
    const [budRes, subRes] = await Promise.all([api.get('/budgets'), api.get('/subscriptions')]);
    const list = [];
    const now = new Date();

    budRes.data.forEach((b) => {
      const pct = b.monthlyLimit ? (b.spent / b.monthlyLimit) * 100 : 0;
      if (pct >= 100) {
        list.push({ type: 'danger', text: `${b.category} budget is over by ${formatMoney(b.spent - b.monthlyLimit, user?.currency)}` });
      } else if (pct >= 80) {
        list.push({ type: 'warn', text: `${b.category} budget is ${Math.round(pct)}% used` });
      }
    });

    subRes.data.filter((s) => s.active && !s.paidThisCycle).forEach((s) => {
      const daysAway = daysUntilNextBilling(s, now);
      if (daysAway <= 3) {
        list.push({ type: 'info', text: `${s.name} renews ${daysAway === 0 ? 'today' : 'in ' + daysAway + ' day' + (daysAway > 1 ? 's' : '')}` });
      }
    });

    setAlerts(list);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="notification-bell" ref={boxRef}>
      <button className="icon-btn bell-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <i className="ti ti-bell"></i>
        {alerts.length > 0 && <span className="bell-badge">{alerts.length}</span>}
      </button>
      {open && (
        <div className="search-dropdown bell-dropdown">
          {alerts.length === 0 ? (
            <div className="search-empty">You're all caught up.</div>
          ) : (
            alerts.map((a, i) => (
              <div className={`alert-banner alert-${a.type}`} key={i} style={{ margin: '6px 8px' }}>
                <i className={`ti ${a.type === 'danger' ? 'ti-alert-triangle' : a.type === 'warn' ? 'ti-alert-circle' : 'ti-calendar-event'}`}></i>
                {a.text}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}