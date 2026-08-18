import { useEffect, useState } from 'react';
import { formatMoney } from '../utils/format';

const PAYMENT_METHODS = ['Card', 'Cash', 'UPI', 'Bank Transfer', 'Other'];

export default function ExpenseModal({ categories, subscriptions = [], currency, initial, defaultType, onClose, onSave }) {
  const [form, setForm] = useState(
    initial
      ? { ...initial, tagsText: (initial.tags || []).join(', '), linkedSubscription: initial.linkedSubscription || '' }
      : {
          type: defaultType || 'expense',
          amount: '',
          category:
            defaultType === 'saving_deposit' || defaultType === 'saving_withdrawal'
              ? 'Savings'
              : categories.find(
                  (c) => (c.appliesTo || 'both') === 'both' || c.appliesTo === (defaultType || 'expense')
                )?.name || categories[0]?.name || '',
          note: '',
          tagsText: '',
          paymentMethod: 'Card',
          date: new Date().toISOString().slice(0, 10),
          isSplit: false,
          totalAmount: '',
          splitWith: '',
          linkedSubscription: ''
        }
  );
  const [saving, setSaving] = useState(false);
  // Tracks whether the person manually touched the subscription picker, so
  // auto-detection doesn't keep overriding a choice they already made (e.g. they
  // cleared it because this really was a one-off charge, not the subscription).
  const [subscriptionTouched, setSubscriptionTouched] = useState(!!initial?.linkedSubscription);

  const isSavingType = form.type === 'saving_deposit' || form.type === 'saving_withdrawal';

  const activeSubscriptions = subscriptions.filter((s) => s.active);

  // Every active subscription whose price matches the entered amount. Could be
  // zero, one (safe to auto-select), or more than one (ambiguous — e.g. two
  // subscriptions that happen to cost the same; we highlight all of them as
  // candidates instead of guessing which one is right).
  const matchingSubs =
    form.type === 'expense' && form.amount
      ? activeSubscriptions.filter((s) => Math.abs(s.amount - Number(form.amount)) < 0.01)
      : [];

  // Auto-detect only fires for an unambiguous single match.
  useEffect(() => {
    if (subscriptionTouched || form.type !== 'expense' || !form.amount) return;
    if (matchingSubs.length === 1) {
      setForm((f) => ({ ...f, linkedSubscription: matchingSubs[0]._id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.amount, form.type]);

  const autoDetectedSub =
    !subscriptionTouched && matchingSubs.length === 1 && activeSubscriptions.find((s) => s._id === form.linkedSubscription);

  const categoriesFor = (type) =>
    categories.filter((c) => {
      const scope = c.appliesTo || 'both';
      return scope === 'both' || scope === type;
    });

  const visibleCategories = (() => {
    const scoped = categoriesFor(form.type);
    // If the transaction's current category isn't in the scoped list (e.g. it was
    // recategorized as expense/income-only after this transaction was saved),
    // keep it selectable so the dropdown doesn't silently show a different category.
    if (form.category && !scoped.some((c) => c.name === form.category)) {
      const existing = categories.find((c) => c.name === form.category);
      if (existing) return [existing, ...scoped];
    }
    return scoped;
  })();

  const switchType = (type) => {
    const isSaving = type === 'saving_deposit' || type === 'saving_withdrawal';
    if (isSaving) {
      setForm({ ...form, type, category: 'Savings', linkedSubscription: '' });
      return;
    }
    const stillValid = categoriesFor(type).some((c) => c.name === form.category);
    setForm({
      ...form,
      type,
      category: stillValid ? form.category : categoriesFor(type)[0]?.name || '',
      linkedSubscription: type === 'expense' ? form.linkedSubscription : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tags = form.tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await onSave({
        ...form,
        amount: Number(form.amount),
        totalAmount: form.isSplit ? Number(form.totalAmount) : undefined,
        tags,
        linkedSubscription: form.type === 'expense' && form.linkedSubscription ? form.linkedSubscription : null
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
          <h3>{initial ? 'Edit transaction' : 'Add transaction'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <i className="ti ti-x"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="toggle-group field">
            <button
              type="button"
              className={`toggle-btn ${form.type === 'expense' ? 'active-expense' : ''}`}
              onClick={() => switchType('expense')}
            >
              Expense
            </button>
            <button
              type="button"
              className={`toggle-btn ${form.type === 'income' ? 'active-income' : ''}`}
              onClick={() => switchType('income')}
            >
              Income
            </button>
            <button
              type="button"
              className={`toggle-btn ${isSavingType ? 'active-income' : ''}`}
              onClick={() => switchType('saving_deposit')}
            >
              Savings
            </button>
          </div>

          {isSavingType && (
            <div className="toggle-group field">
              <button
                type="button"
                className={`toggle-btn ${form.type === 'saving_deposit' ? 'active-income' : ''}`}
                onClick={() => setForm({ ...form, type: 'saving_deposit' })}
              >
                <i className="ti ti-piggy-bank"></i> Deposit
              </button>
              <button
                type="button"
                className={`toggle-btn ${form.type === 'saving_withdrawal' ? 'active-expense' : ''}`}
                onClick={() => setForm({ ...form, type: 'saving_withdrawal' })}
              >
                <i className="ti ti-arrow-back-up"></i> Withdraw
              </button>
            </div>
          )}

          <div className="field">
            <label htmlFor="amount">{form.isSplit ? 'Your share' : 'Amount'}</label>
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

          <div className="field-row">
            {!isSavingType && (
              <div className="field">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {visibleCategories.map((c) => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                value={typeof form.date === 'string' ? form.date.slice(0, 10) : form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="paymentMethod">Payment method</label>
            <select
              id="paymentMethod"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {form.type === 'expense' && activeSubscriptions.length > 0 && (
            <div className="field">
              <label>Subscription payment</label>
              {matchingSubs.length > 1 && (
                <div className="subscription-detected-hint">
                  <i className="ti ti-alert-circle"></i> {matchingSubs.length} subscriptions match this amount — pick which one:
                </div>
              )}
              <div className="subscription-chip-row">
                <button
                  type="button"
                  className={`chip chip-btn ${!form.linkedSubscription ? 'chip-active' : ''}`}
                  onClick={() => {
                    setSubscriptionTouched(true);
                    setForm({ ...form, linkedSubscription: '' });
                  }}
                >
                  None
                </button>
                {activeSubscriptions.map((s) => {
                  const isSelected = form.linkedSubscription === s._id;
                  const isCandidate = !isSelected && matchingSubs.some((m) => m._id === s._id);
                  return (
                    <button
                      key={s._id}
                      type="button"
                      className={`chip chip-btn ${isSelected ? 'chip-active' : ''} ${isCandidate ? 'chip-candidate' : ''}`}
                      onClick={() => {
                        setSubscriptionTouched(true);
                        setForm({ ...form, linkedSubscription: s._id });
                      }}
                    >
                      {s.name} · {formatMoney(s.amount, currency)}
                    </button>
                  );
                })}
              </div>
              {autoDetectedSub && (
                <div className="subscription-detected-hint">
                  <i className="ti ti-sparkles"></i> Matches your {autoDetectedSub.name} subscription — it'll be marked paid.
                </div>
              )}
            </div>
          )}

          <div className="field">
            <label htmlFor="note">Note</label>
            <input
              id="note"
              placeholder="What was this for?"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="tags">Tags</label>
            <input
              id="tags"
              placeholder="business, reimbursable, tax-deductible…"
              value={form.tagsText}
              onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
            />
          </div>

          {form.type === 'expense' && (
            <>
              <div className="field checkbox-field">
                <input
                  id="isSplit"
                  type="checkbox"
                  checked={form.isSplit}
                  onChange={(e) => setForm({ ...form, isSplit: e.target.checked })}
                />
                <label htmlFor="isSplit" style={{ margin: 0 }}>This bill is split with someone else</label>
              </div>

              {form.isSplit && (
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="totalAmount">Total bill amount</label>
                    <input
                      id="totalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.totalAmount}
                      onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="splitWith">Split with</label>
                    <input
                      id="splitWith"
                      placeholder="Roommate name"
                      value={form.splitWith}
                      onChange={(e) => setForm({ ...form, splitWith: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add transaction'}
          </button>
        </form>
      </div>
    </div>
  );
}