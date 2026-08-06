import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDate } from '../utils/format';
import ExpenseModal from '../components/ExpenseModal';

const TYPE_META = {
  expense: { icon: 'ti-receipt', sign: '−', cls: '' },
  income: { icon: 'ti-arrow-down-left', sign: '+', cls: 'tx-icon-income' },
  saving_deposit: { icon: 'ti-piggy-bank', sign: '+', cls: 'tx-icon-income' },
  saving_withdrawal: { icon: 'ti-piggy-bank', sign: '−', cls: '' }
};

export default function Transactions() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null);
  const [filters, setFilters] = useState({ category: 'All', type: 'All', search: '', tag: '' });

  const load = async () => {
    const [expRes, catRes] = await Promise.all([
      api.get('/expenses', {
        params: {
          category: filters.category,
          type: filters.type,
          search: filters.search
        }
      }),
      api.get('/categories')
    ]);
    setExpenses(expRes.data);
    setCategories(catRes.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.type, filters.search]);

  const handleSave = async (data) => {
    if (modalMode && modalMode !== 'add') {
      await api.put(`/expenses/${modalMode._id}`, data);
    } else {
      await api.post('/expenses', data);
    }
    await load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    await api.delete(`/expenses/${id}`);
    await load();
  };

  // Tag filtering happens client-side (not sent to the server) so the tag chip row
  // always reflects every tag among the category/type/search-filtered transactions,
  // not just the ones matching whichever tag is currently selected.
  const tagFiltered = filters.tag
    ? expenses.filter((e) => (e.tags || []).includes(filters.tag))
    : expenses;

  const net = tagFiltered.reduce((sum, e) => {
    if (e.type === 'income') return sum + e.amount;
    if (e.type === 'expense') return sum - e.amount;
    return sum;
  }, 0);
  const allTags = [...new Set(expenses.flatMap((e) => e.tags || []))];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>{tagFiltered.length} entries · net {formatMoney(net, user?.currency)}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalMode('add')}>
          <i className="ti ti-plus"></i> Add transaction
        </button>
      </div>

      <div className="filters-bar">
        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="All">All types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="saving_deposit">Savings deposit</option>
          <option value="saving_withdrawal">Savings withdrawal</option>
        </select>
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="All">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <input
          placeholder="Search notes…"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      {allTags.length > 0 && (
        <div className="tag-filter-row">
          <button
            className={`chip chip-btn ${filters.tag === '' ? 'chip-active' : ''}`}
            onClick={() => setFilters({ ...filters, tag: '' })}
          >
            All tags
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              className={`chip chip-btn ${filters.tag === t ? 'chip-active' : ''}`}
              onClick={() => setFilters({ ...filters, tag: t })}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="loading-note">Loading…</div>
        ) : tagFiltered.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-receipt-2" aria-hidden="true"></i>
            No transactions match these filters.
          </div>
        ) : (
          tagFiltered.map((e) => {
            const meta = TYPE_META[e.type] || TYPE_META.expense;
            return (
              <div className="tx-row" key={e._id}>
                <div className={`tx-icon ${meta.cls}`}>
                  <i className={`ti ${meta.icon}`}></i>
                </div>
                <div className="tx-main">
                  <div className="tx-title">
                    {e.note || e.category}
                    {e.isSplit && <span className="chip" style={{ marginLeft: 6 }}>Split with {e.splitWith || 'someone'}</span>}
                  </div>
                  <div className="tx-meta">
                    {e.category} · {e.paymentMethod} · {formatDate(e.date)}
                    {e.tags && e.tags.length > 0 && ` · ${e.tags.join(', ')}`}
                  </div>
                </div>
                <div className={`tx-amount ${meta.cls === 'tx-icon-income' ? 'tx-amount-income' : ''}`}>
                  {meta.sign}{formatMoney(e.amount, user?.currency)}
                </div>
                <button className="icon-btn" onClick={() => setModalMode(e)} aria-label="Edit">
                  <i className="ti ti-edit"></i>
                </button>
                <button className="icon-btn" onClick={() => handleDelete(e._id)} aria-label="Delete">
                  <i className="ti ti-trash"></i>
                </button>
              </div>
            );
          })
        )}
      </div>

      {modalMode && (
        <ExpenseModal
          categories={categories}
          initial={modalMode === 'add' ? null : modalMode}
          onClose={() => setModalMode(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}