import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/format';

const LOCKABLE_TABS = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'goals', label: 'Goals' },
  { key: 'savings', label: 'Savings' },
  { key: 'debts', label: 'Debts' },
  { key: 'analytics', label: 'Analytics' }
];

export default function Settings() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryAppliesTo, setNewCategoryAppliesTo] = useState('both');
  const [catError, setCatError] = useState('');
  const [editingCategory, setEditingCategory] = useState(null); // { _id, name, appliesTo }
  const [budgetForm, setBudgetForm] = useState({ category: '', monthlyLimit: '' });
  const [expenses, setExpenses] = useState([]);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');

  const [pinForm, setPinForm] = useState({ pin: '', confirmPin: '' });
  const [pinMessage, setPinMessage] = useState('');
  const [pinError, setPinError] = useState('');
  const [selectedTabs, setSelectedTabs] = useState([]);
  const [tabsMessage, setTabsMessage] = useState('');

  useEffect(() => {
    setSelectedTabs(user?.lockedTabs || []);
  }, [user?.lockedTabs]);

  const load = async () => {
    const [catRes, budRes, expRes] = await Promise.all([
      api.get('/categories'),
      api.get('/budgets'),
      api.get('/expenses')
    ]);
    setCategories(catRes.data);
    setBudgets(budRes.data);
    setExpenses(expRes.data);
    if (!budgetForm.category) {
      const firstBudgetable = catRes.data.find((c) => c.appliesTo !== 'income');
      if (firstBudgetable) {
        setBudgetForm((f) => ({ ...f, category: firstBudgetable.name }));
      }
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Account ---
  const submitPasswordChange = async (e) => {
    e.preventDefault();
    setPwMessage('');
    setPwError('');
    if (pwForm.newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    try {
      await api.put('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword
      });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwMessage('Password updated.');
    } catch (err) {
      setPwError(err.response?.data?.message || 'Could not update password.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // --- Categories ---
  // --- Categories ---
  const addCategory = async (e) => {
    e.preventDefault();
    setCatError('');
    if (!newCategory.trim()) return;
    try {
      await api.post('/categories', { name: newCategory.trim(), appliesTo: newCategoryAppliesTo });
      setNewCategory('');
      setNewCategoryAppliesTo('both');
      await load();
    } catch (err) {
      setCatError(err.response?.data?.message || 'Could not add category.');
    }
  };

  const startEditCategory = (c) => {
    setCatError('');
    setEditingCategory({ _id: c._id, name: c.name, appliesTo: c.appliesTo || 'both' });
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
  };

  const saveEditCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory.name.trim()) return;
    try {
      await api.put(`/categories/${editingCategory._id}`, {
        name: editingCategory.name.trim(),
        appliesTo: editingCategory.appliesTo
      });
      setEditingCategory(null);
      await load();
    } catch (err) {
      setCatError(err.response?.data?.message || 'Could not update category.');
    }
  };

  const deleteCategory = async (id) => {
    if (!confirm('Delete this category? Existing expenses keep their category name.')) return;
    await api.delete(`/categories/${id}`);
    await load();
  };

  // --- Budgets ---
  const saveBudget = async (e) => {
    e.preventDefault();
    if (!budgetForm.category || !budgetForm.monthlyLimit) return;
    await api.post('/budgets', { category: budgetForm.category, monthlyLimit: Number(budgetForm.monthlyLimit) });
    setBudgetForm({ ...budgetForm, monthlyLimit: '' });
    await load();
  };

  const deleteBudget = async (id) => {
    await api.delete(`/budgets/${id}`);
    await load();
  };

  // --- Export ---
  const exportCsv = () => {
    const header = 'Date,Category,Amount,Payment Method,Note\n';
    const rows = expenses
      .map((e) => [new Date(e.date).toISOString().slice(0, 10), e.category, e.amount, e.paymentMethod, `"${(e.note || '').replace(/"/g, '""')}"`].join(','))
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- PIN & tab lock ---
  const submitPin = async (e) => {
    e.preventDefault();
    setPinMessage('');
    setPinError('');
    if (!/^\d{4,6}$/.test(pinForm.pin)) {
      setPinError('PIN must be 4 to 6 digits.');
      return;
    }
    if (pinForm.pin !== pinForm.confirmPin) {
      setPinError('PINs do not match.');
      return;
    }
    try {
      await api.post('/auth/pin', { pin: pinForm.pin });
      await refreshUser();
      setPinForm({ pin: '', confirmPin: '' });
      setPinMessage(user?.hasPin ? 'PIN updated.' : 'PIN set — choose which tabs to lock below.');
    } catch (err) {
      setPinError(err.response?.data?.message || 'Could not set PIN.');
    }
  };

  const removePin = async () => {
    if (!confirm('Remove the PIN? Every locked tab will become unlocked.')) return;
    await api.delete('/auth/pin');
    await refreshUser();
    setPinMessage('PIN removed.');
  };

  const toggleTab = (key) => {
    setSelectedTabs((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const saveLockedTabs = async () => {
    setTabsMessage('');
    setPinError('');
    try {
      const res = await api.put('/auth/locked-tabs', { lockedTabs: selectedTabs });
      await refreshUser();
      setTabsMessage(res.data.lockedTabs.length ? 'Locked tabs updated.' : 'No tabs are locked.');
    } catch (err) {
      setPinError(err.response?.data?.message || 'Could not update locked tabs.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Your account, categories, budgets and tab locks.</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Account */}
        <div className="card">
          <div className="section-title">Account</div>
          <div className="settings-info-row">
            <span>Name</span>
            <span>{user?.name}</span>
          </div>
          <div className="settings-info-row">
            <span>Email</span>
            <span>{user?.email}</span>
          </div>
          <div className="settings-info-row" style={{ marginBottom: 18 }}>
            <span>Currency</span>
            <span>{user?.currency}</span>
          </div>

          <div className="settings-divider">Change password</div>
          {pwMessage && <div className="chip" style={{ marginBottom: 12 }}>{pwMessage}</div>}
          {pwError && <div className="error-banner">{pwError}</div>}
          <form onSubmit={submitPasswordChange}>
            <div className="field">
              <label htmlFor="currentPassword">Current password</label>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                required
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="newPassword">New password</label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  minLength={6}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  minLength={6}
                  required
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit">
              <i className="ti ti-key"></i> Update password
            </button>
          </form>

          <div className="settings-divider" />
          <button className="btn btn-danger-outline" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
            <i className="ti ti-logout"></i> Log out
          </button>
        </div>

        {/* Categories */}
        <div className="card">
          <div className="section-title">Categories</div>
          {catError && <div className="error-banner">{catError}</div>}
          <form onSubmit={addCategory} className="settings-inline-form">
            <input
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <select
              value={newCategoryAppliesTo}
              onChange={(e) => setNewCategoryAppliesTo(e.target.value)}
              aria-label="Applies to"
            >
              <option value="both">Both</option>
              <option value="expense">Expense only</option>
              <option value="income">Income only</option>
            </select>
            <button className="btn btn-primary" type="submit">
              <i className="ti ti-plus"></i> Add
            </button>
          </form>

          {categories.map((c) =>
  editingCategory?._id === c._id ? (
    <form key={c._id} onSubmit={saveEditCategory} className="settings-inline-form" style={{ marginBottom: 8 }}>
      <input
        value={editingCategory.name}
        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
        autoFocus
      />
      <select
        value={editingCategory.appliesTo}
        onChange={(e) => setEditingCategory({ ...editingCategory, appliesTo: e.target.value })}
      >
        <option value="both">Both</option>
        <option value="expense">Expense only</option>
        <option value="income">Income only</option>
      </select>
      <button className="btn btn-primary" type="submit">
        <i className="ti ti-check"></i> Save
      </button>
      <button className="btn" type="button" onClick={cancelEditCategory}>
        <i className="ti ti-x"></i> Cancel
      </button>
    </form>
  ) : (
    <div className="tx-row" key={c._id}>
      <div className="tx-icon" style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}>
        <i className={`ti ${c.icon || 'ti-tag'}`}></i>
      </div>
      <div className="tx-main">
        <div className="tx-title">{c.name}</div>
        <div className="tx-meta">
          {c.appliesTo === 'expense' ? 'Expense only' : c.appliesTo === 'income' ? 'Income only' : 'Both'}
        </div>
      </div>
      <button className="icon-btn" onClick={() => startEditCategory(c)} aria-label="Edit category">
        <i className="ti ti-pencil"></i>
      </button>
      <button className="icon-btn" onClick={() => deleteCategory(c._id)} aria-label="Delete category">
        <i className="ti ti-trash"></i>
      </button>
    </div>
  )
)}
        </div>

        {/* Budgets */}
        <div className="card">
          <div className="section-title">Monthly budgets</div>
          <form onSubmit={saveBudget} className="field-row" style={{ marginBottom: 12 }}>
            <select value={budgetForm.category} onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}>
              {categories
                .filter((c) => c.appliesTo !== 'income')
                .map((c) => (
                  <option key={c._id} value={c.name}>{c.name}</option>
                ))}
            </select>
            <input
              type="number"
              min="0"
              placeholder="Monthly limit"
              value={budgetForm.monthlyLimit}
              onChange={(e) => setBudgetForm({ ...budgetForm, monthlyLimit: e.target.value })}
            />
          </form>
          <button className="btn btn-primary" onClick={saveBudget} style={{ marginBottom: 16 }}>
            <i className="ti ti-plus"></i> Set budget
          </button>

          {budgets.length === 0 ? (
            <div className="empty-state" style={{ padding: '1rem 0' }}>
              <i className="ti ti-wallet"></i>
              No budgets set yet.
            </div>
          ) : (
            budgets.map((b) => {
              const pct = b.monthlyLimit ? (b.spent / b.monthlyLimit) * 100 : 0;
              const state = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : '';
              return (
                <div className="budget-item" key={b._id}>
                  <div className="budget-top">
                    <span>{b.category}</span>
                    <span>
                      {formatMoney(b.spent, user?.currency)} / {formatMoney(b.monthlyLimit, user?.currency)}
                    </span>
                  </div>
                  <div className="budget-track">
                    <div className={`budget-fill ${state}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <button className="btn-danger-text" onClick={() => deleteBudget(b._id)} style={{ marginTop: 6 }}>
                    Remove budget
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* PIN + locked tabs */}
        <div className="card">
          <div className="section-title">Tab lock</div>
          <p className="settings-hint">Set a PIN, then choose which tabs stay hidden until you enter it.</p>

          {pinMessage && <div className="chip" style={{ marginBottom: 12 }}>{pinMessage}</div>}
          {pinError && <div className="error-banner">{pinError}</div>}

          <div className="field-row" style={{ marginBottom: 12 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="pin">{user?.hasPin ? 'New PIN' : 'PIN (4–6 digits)'}</label>
              <input
                id="pin"
                name="tab-pin-new"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••"
                value={pinForm.pin}
                onChange={(e) => setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="confirmPin">Confirm PIN</label>
              <input
                id="confirmPin"
                name="tab-pin-confirm"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••"
                value={pinForm.confirmPin}
                onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, '') })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={submitPin}>
              <i className="ti ti-lock"></i> {user?.hasPin ? 'Update PIN' : 'Set PIN'}
            </button>
            {user?.hasPin && (
              <button className="btn" onClick={removePin}>
                <i className="ti ti-lock-open"></i> Remove PIN
              </button>
            )}
          </div>

          <div className="settings-divider">Locked tabs</div>
          {!user?.hasPin ? (
            <p className="settings-hint">Set a PIN above before you can lock any tabs.</p>
          ) : (
            <>
              {tabsMessage && <div className="chip" style={{ marginBottom: 12 }}>{tabsMessage}</div>}
              <div className="lock-tab-grid">
                {LOCKABLE_TABS.map((t) => (
                  <label className="checkbox-field lock-tab-option" key={t.key}>
                    <input
                      type="checkbox"
                      checked={selectedTabs.includes(t.key)}
                      onChange={() => toggleTab(t.key)}
                    />
                    {t.label}
                  </label>
                ))}
              </div>
              <button className="btn btn-primary" onClick={saveLockedTabs} style={{ marginTop: 14 }}>
                <i className="ti ti-device-floppy"></i> Save locked tabs
              </button>
            </>
          )}
        </div>

        {/* Export */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="section-title">Export data</div>
          <p className="settings-hint" style={{ marginBottom: 12 }}>Download all your expenses as a CSV file.</p>
          <button className="btn" onClick={exportCsv}>
            <i className="ti ti-download"></i> Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}