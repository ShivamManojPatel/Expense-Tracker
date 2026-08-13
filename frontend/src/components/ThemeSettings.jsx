import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { THEME_FIELDS, isLowContrast } from '../utils/theme';

export default function ThemeSettings() {
  const { theme, previewTheme, saveTheme, resetTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await saveTheme();
      setMessage('Theme saved.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not save theme.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset to the default Vault theme?')) return;
    setSaving(true);
    setMessage('');
    try {
      await resetTheme();
      setMessage('Reset to default.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not reset theme.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="section-title">Appearance</div>
      <p className="settings-hint">
        Customize every color in the app. Changes preview instantly — nothing is saved until you hit "Save theme."
      </p>

      {message && <div className="success-banner">{message}</div>}
      {isLowContrast(theme) && (
        <div className="error-banner">Text and background are close in brightness — this may be hard to read.</div>
      )}

      <div className="theme-picker-grid">
        {THEME_FIELDS.map((f) => (
          <label className="theme-picker-item" key={f.key}>
            <input
              type="color"
              value={theme[f.key]}
              onChange={(e) => previewTheme({ [f.key]: e.target.value })}
            />
            <span>
              <span className="theme-picker-label">{f.label}</span>
              <span className="theme-picker-hint">{f.hint}</span>
            </span>
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <i className="ti ti-device-floppy"></i> Save theme
        </button>
        <button className="btn" onClick={handleReset} disabled={saving}>
          <i className="ti ti-refresh"></i> Reset to default
        </button>
      </div>
    </div>
  );
}