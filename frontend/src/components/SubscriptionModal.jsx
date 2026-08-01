import { useState } from 'react';

const CYCLES = ['Weekly', 'Monthly', 'Yearly'];

export default function SubscriptionModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(
    initial || {
      name: '',
      amount: '',
      category: 'Subscriptions',
      billingCycle: 'Monthly',
      billingDay: 1,
      notes: '',
      active: true
    }
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, amount: Number(form.amount), billingDay: Number(form.billingDay) });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{initial ? 'Edit subscription' : 'Add subscription'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <i className="ti ti-x"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              placeholder="Netflix, Gym membership…"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="amount">Amount</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="billingCycle">Billing cycle</label>
              <select
                id="billingCycle"
                value={form.billingCycle}
                onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
              >
                {CYCLES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="billingDay">Day of month it bills (1–31)</label>
            <input
              id="billingDay"
              type="number"
              min="1"
              max="31"
              value={form.billingDay}
              onChange={(e) => setForm({ ...form, billingDay: e.target.value })}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="notes">Notes</label>
            <input
              id="notes"
              placeholder="Optional"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id="active"
              type="checkbox"
              style={{ width: 'auto' }}
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <label htmlFor="active" style={{ margin: 0 }}>Active</label>
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add subscription'}
          </button>
        </form>
      </div>
    </div>
  );
}
