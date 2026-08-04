import { useState } from 'react';

export default function DebtModal({ initial, defaultType, defaultPerson, onClose, onSave }) {
  const [form, setForm] = useState(
    initial
      ? { ...initial, date: initial.date ? initial.date.slice(0, 10) : new Date().toISOString().slice(0, 10) }
      : {
          type: defaultType || 'borrowed',
          person: defaultPerson || '',
          amount: '',
          remarks: '',
          date: new Date().toISOString().slice(0, 10)
        }
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        person: form.person,
        type: form.type,
        amount: Number(form.amount),
        remarks: form.remarks,
        date: form.date
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
          <h3>{initial ? 'Edit debt entry' : 'Add debt entry'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <i className="ti ti-x"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="toggle-group field">
            <button
              type="button"
              className={`toggle-btn ${form.type === 'borrowed' ? 'active-expense' : ''}`}
              onClick={() => setForm({ ...form, type: 'borrowed' })}
            >
              I borrowed
            </button>
            <button
              type="button"
              className={`toggle-btn ${form.type === 'repaid' ? 'active-income' : ''}`}
              onClick={() => setForm({ ...form, type: 'repaid' })}
            >
              I repaid
            </button>
          </div>

          <div className="field">
            <label htmlFor="person">{form.type === 'borrowed' ? 'Borrowed from' : 'Repaid to'}</label>
            <input
              id="person"
              placeholder="Name"
              value={form.person}
              onChange={(e) => setForm({ ...form, person: e.target.value })}
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
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="remarks">Remarks</label>
            <input
              id="remarks"
              placeholder="What was this for?"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add entry'}
          </button>
        </form>
      </div>
    </div>
  );
}