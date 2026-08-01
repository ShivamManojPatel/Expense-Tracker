import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { formatMoney } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const handle = setTimeout(async () => {
      const res = await api.get('/search', { params: { q: query } });
      setResults(res.data);
      setOpen(true);
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const goTo = (path) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  const hasResults =
    results && (results.expenses.length || results.subscriptions.length || results.goals.length);

  return (
    <div className="global-search" ref={boxRef}>
      <i className="ti ti-search search-icon"></i>
      <input
        placeholder="Search transactions, subscriptions, goals…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query && setOpen(true)}
      />
      {open && results && (
        <div className="search-dropdown">
          {!hasResults ? (
            <div className="search-empty">No matches for "{query}"</div>
          ) : (
            <>
              {results.expenses.length > 0 && (
                <div className="search-group">
                  <div className="search-group-label">Transactions</div>
                  {results.expenses.map((e) => (
                    <button className="search-result" key={e._id} onClick={() => goTo('/transactions')}>
                      <span>{e.note || e.category}</span>
                      <span className="tx-amount">{formatMoney(e.amount, user?.currency)}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.subscriptions.length > 0 && (
                <div className="search-group">
                  <div className="search-group-label">Subscriptions</div>
                  {results.subscriptions.map((s) => (
                    <button className="search-result" key={s._id} onClick={() => goTo('/subscriptions')}>
                      <span>{s.name}</span>
                      <span className="tx-amount">{formatMoney(s.amount, user?.currency)}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.goals.length > 0 && (
                <div className="search-group">
                  <div className="search-group-label">Goals</div>
                  {results.goals.map((g) => (
                    <button className="search-result" key={g._id} onClick={() => goTo('/goals')}>
                      <span>{g.name}</span>
                      <span className="tx-amount">{formatMoney(g.targetAmount, user?.currency)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}