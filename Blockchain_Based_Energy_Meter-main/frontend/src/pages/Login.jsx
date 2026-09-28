import React, { useState } from 'react';
import { ShieldCheck, User, Lock, BatteryCharging, Activity, Gauge } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [activeTab, setActiveTab] = useState('consumer');
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({ username: '', password: '' });

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const usernameTrimmed = formData.username.trim();
    const passwordTrimmed = formData.password.trim();

    if (activeTab === 'admin') {
      if (usernameTrimmed.toUpperCase() === 'EB-ADMIN' && passwordTrimmed === 'TNEB@ADMIN') {
        onLogin('admin', { name: 'Energy Board Admin', role: 'admin' });
      } else {
        setErrorMsg('Invalid Admin credentials. Use Username: EB-Admin and Password: TNEB@ADMIN');
      }
    } else {
      if (passwordTrimmed.toUpperCase() === `TNEB@${usernameTrimmed.toUpperCase()}`) {
        onLogin('consumer', { name: 'Consumer', meterId: usernameTrimmed.toUpperCase(), role: 'consumer' });
      } else {
        setErrorMsg(`Incorrect password for ${usernameTrimmed || 'Meter'}. Format: TNEB@${usernameTrimmed || 'MTR001'}`);
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell animate-up">
        <section className="login-hero">
          <div className="brand-row">
            <div className="brand-mark">E</div>
            <span>ENARGY</span>
          </div>

          <div className="hero-copy">
            <h1>Smarter energy for every meter.</h1>
            <p>
              Monitor consumption, verify blockchain data, and keep every connection transparent from the grid edge to the billing desk.
            </p>
          </div>

          <div className="hero-metrics">
            <div className="metric-box">
              <strong>24/7</strong>
              <span>Live monitoring</span>
            </div>
            <div className="metric-box">
              <strong>99.9%</strong>
              <span>Data integrity</span>
            </div>
            <div className="metric-box">
              <strong>1.2k</strong>
              <span>Connected meters</span>
            </div>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', display: 'grid', placeItems: 'center' }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0 }}>Welcome back</h2>
              </div>
            </div>

            <p className="login-subtitle">Secure Blockchain Energy System</p>

            <div className="tab-row">
              <button
                type="button"
                className={`tab-button ${activeTab === 'consumer' ? 'active' : ''}`}
                onClick={() => { setActiveTab('consumer'); setErrorMsg(''); }}
              >
                Consumer
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => { setActiveTab('admin'); setErrorMsg(''); }}
              >
                EB Admin
              </button>
            </div>

            {errorMsg && (
              <div style={{ background: '#ffe5e5', color: '#b91c1c', padding: '10px 12px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.12)' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>{activeTab === 'consumer' ? 'Meter ID' : 'Username'}</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    style={{ paddingLeft: '42px' }}
                    placeholder={activeTab === 'consumer' ? 'e.g. MTR001' : 'e.g. EB-Admin'}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                  <input
                    type="password"
                    style={{ paddingLeft: '42px' }}
                    placeholder={activeTab === 'consumer' ? `e.g. TNEB@${formData.username || 'MTR001'}` : 'e.g. TNEB@ADMIN'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-button">
                  Login to System
                </button>
              </div>
            </form>

            <div className="demo-note">
              {activeTab === 'consumer' ? (
                <>
                  <strong>Demo credentials:</strong><br />
                  Meter ID: <code>MTR001</code> | Password: <code>TNEB@MTR001</code>
                </>
              ) : (
                <>
                  <strong>Admin credentials:</strong><br />
                  Username: <code>EB-Admin</code> | Password: <code>TNEB@ADMIN</code>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
