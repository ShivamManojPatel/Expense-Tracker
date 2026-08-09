import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function AIInsights() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/ai/insights');
      // Backend returns a clean string array now (parsed from the model's JSON
      // response) rather than raw text, so no markdown/formatting artifacts leak
      // into the UI regardless of how the model chose to format its reply.
      setSuggestions(Array.isArray(res.data.suggestions) ? res.data.suggestions : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load AI suggestions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>AI suggestions</div>
        <button className="btn" onClick={load} disabled={loading}>
          <i className="ti ti-refresh"></i> {loading ? 'Thinking…' : 'Regenerate'}
        </button>
      </div>

      {loading ? (
        <div className="loading-note">Reviewing your last 3 months…</div>
      ) : error ? (
        <div className="empty-state">
          <i className="ti ti-alert-triangle"></i>
          {error}
        </div>
      ) : (
        suggestions.map((line, i) => (
          <div className="insight-row" key={i}>
            <i className="ti ti-bulb"></i> {line}
          </div>
        ))
      )}
    </div>
  );
}