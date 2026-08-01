import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Subscriptions from './pages/Subscriptions';
import Goals from './pages/Goals';
import Savings from './pages/Savings';
import Debts from './pages/Debts';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LockGate from './components/LockGate';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<LockGate tabKey="transactions"><Transactions /></LockGate>} />
        <Route path="subscriptions" element={<LockGate tabKey="subscriptions"><Subscriptions /></LockGate>} />
        <Route path="goals" element={<LockGate tabKey="goals"><Goals /></LockGate>} />
        <Route path="savings" element={<LockGate tabKey="savings"><Savings /></LockGate>} />
        <Route path="debts" element={<LockGate tabKey="debts"><Debts /></LockGate>} />
        <Route path="analytics" element={<LockGate tabKey="analytics"><Analytics /></LockGate>} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}