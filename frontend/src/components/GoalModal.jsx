import { useState } from 'react';

export default function GoalModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(
    initial
      ? { ...initial, targetDate: initial.targetDate ? initial.targetDate.slice(0, 10) : '' }
      : { name: '', targetAmount: '', currentAmount: '', targetDate: '', notes: '' }
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        targetAmount: Number(form.targetAmount),
        currentAmount: Number(form.currentAmount || 0)
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{initial ? 'Edit goal' : 'New savings goal'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <i className="ti ti-x"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Goal name</label>
            <input
              id="name"
              placeholder="Emergency fund, Japan trip…"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="targetAmount">Target amount</label>
              <input
                id="targetAmount"
                type="number"
                min="0"
                step="0.01"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="currentAmount">Already saved</label>
              <input
                id="currentAmount"
                type="number"
                min="0"
                step="0.01"
                value={form.currentAmount}
                onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="targetDate">Target date (optional)</label>
            <input
              id="targetDate"
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
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

          <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create goal'}
          </button>
        </form>
      </div>
    </div>
  );
}