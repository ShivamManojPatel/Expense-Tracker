import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const TAB_LABELS = {
  transactions: 'Transactions',
  subscriptions: 'Subscriptions',
  goals: 'Goals',
  savings: 'Savings',
  debts: 'Debts',
  analytics: 'Analytics'
};

export default function LockGate({ tabKey, children }) {
  const { user } = useAuth();
  const isLocked = !!user?.lockedTabs?.includes(tabKey);
  const [unlocked, setUnlocked] = useState(!isLocked);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [checkingPin, setCheckingPin] = useState(false);

  useEffect(() => {
    setUnlocked(!isLocked);
  }, [isLocked]);

  const submitPin = async (e) => {
    e.preventDefault();
    setPinError('');
    setCheckingPin(true);
    try {
      const res = await api.post('/auth/pin/verify', { pin: pinInput });
      if (res.data.valid) {
        setUnlocked(true);
        setPinInput('');
      } else {
        setPinError('Incorrect PIN.');
      }
    } catch (err) {
      setPinError(err.response?.data?.message || 'Could not verify PIN.');
    } finally {
      setCheckingPin(false);
    }
  };

  if (!isLocked) return children;

  if (!unlocked) {
    return (
      <div className="lock-screen">
        <div className="lock-card">
          <i className="ti ti-lock lock-icon"></i>
          <h2>{TAB_LABELS[tabKey] || 'This tab'} is locked</h2>
          <p>Enter your PIN to view this tab.</p>
          <div>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              name="tab-pin"
              maxLength={6}
              placeholder="PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && submitPin(e)}
              autoFocus
              style={{ textAlign: 'center', letterSpacing: '4px', fontSize: 18, marginBottom: 12 }}
            />
            {pinError && <div className="error-banner">{pinError}</div>}
            <button
              className="btn btn-primary"
              type="button"
              onClick={submitPin}
              disabled={checkingPin}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {checkingPin ? 'Checking…' : 'Unlock'}
            </button>
          </div>
        </div>
      </div>
    );
  }

    return (
        <div>
          <div className="lock-gate-bar">
            <button className="btn lock-relock-btn" onClick={() => setUnlocked(false)}>
              <i className="ti ti-lock"></i> Lock this tab
            </button>
          </div>
          {children}
        </div>
    );
}