import React, { useState, useEffect } from 'react';
import { Users, Activity, Wallet, MessageSquare, Search, RefreshCw, Smartphone, Shield, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { getLatestReadings, registerRfidCard, getRfidCards, authorizeRfidTap } from '../../services/api';

const AdminKPICard = ({ title, value, icon, variant = 'primary' }) => (
  <div className={`card kpi-card kpi-${variant} animate-up`}>
    <div className="kpi-icon">{icon}</div>
    <div>
      <p className="kpi-label">{title}</p>
      <h2 className="kpi-value">{value}</h2>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updated just now</p>
    </div>
  </div>
);

export default function AdminDashboard() {
  const [readings, setReadings] = useState([]);
  const [rfidCards, setRfidCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rfidForm, setRfidForm] = useState({
    card_uid: '',
    meter_id: 'MTR001',
    owner_name: 'Customer A'
  });
  const [rfidTap, setRfidTap] = useState({
    card_uid: 'AA11BB22',
    meter_id: 'MTR001'
  });
  const [rfidStatus, setRfidStatus] = useState({ type: '', message: '' });
  const [tapStatus, setTapStatus] = useState({ type: '', message: '', authorized: false, transfer_allowed: false });

  const fetchData = async () => {
    try {
      const [readingsRes, rfidRes] = await Promise.all([
        getLatestReadings(),
        getRfidCards()
      ]);
      setReadings(readingsRes.data.readings || []);
      setRfidCards(rfidRes.data.cards || []);
      setLoading(false);
    } catch (err) {
      console.error('Admin fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const filteredReadings = readings.filter(r => 
    r.meter_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRfidSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await registerRfidCard(rfidForm);
      setRfidStatus({
        type: 'success',
        message: response.data.message || 'RFID card registered successfully.'
      });
      setRfidForm({ ...rfidForm, card_uid: '' });
      setRfidTap({ card_uid: rfidForm.card_uid || 'AA11BB22', meter_id: rfidForm.meter_id || 'MTR001' });
      await fetchData();
    } catch (err) {
      setRfidStatus({
        type: 'error',
        message: err.response?.data?.message || err.response?.data?.error || 'Unable to register RFID card.'
      });
    }
  };

  const handleRfidTap = async () => {
    try {
      const response = await authorizeRfidTap(rfidTap);
      const result = response.data;
      setTapStatus({
        type: result.authorized ? 'success' : 'error',
        message: result.message || 'Tap evaluation complete.',
        authorized: !!result.authorized,
        transfer_allowed: !!result.transfer_allowed
      });
    } catch (err) {
      const detail = err.response?.data;
      setTapStatus({
        type: 'error',
        message: detail?.message || detail?.error || 'Tap rejected by the meter security layer.',
        authorized: false,
        transfer_allowed: false
      });
    }
  };

  return (
    <div className="animate-up executive-dashboard">
      <div className="executive-summary card">
        <div className="executive-header">
          <div>
            <p className="eyebrow">Portfolio Overview</p>
            <h2>Executive network health</h2>
          </div>
          <div className="executive-actions">
            <div className="search-wrap">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search Meter ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={fetchData}>
              <RefreshCw size={18} /> Refresh
            </button>
          </div>
        </div>

        <div className="executive-overview">
          <div className="overview-stat">
            <span>Network uptime</span>
            <strong>99.94%</strong>
          </div>
          <div className="overview-stat">
            <span>Active feeders</span>
            <strong>28</strong>
          </div>
          <div className="overview-stat">
            <span>Avg. demand</span>
            <strong>3.8 MW</strong>
          </div>
        </div>
      </div>

      <div className="kpi-grid executive-kpi-grid">
        <AdminKPICard 
          title="Total Consumers" 
          value="1,284" 
          icon={<Users size={24} />} 
        />
        <AdminKPICard 
          title="Total Energy Usage" 
          value="48.2 MWh" 
          icon={<Activity size={24} />} 
          variant="accent"
        />
        <AdminKPICard 
          title="Total Revenue" 
          value="₹14.2 L" 
          icon={<Wallet size={24} />} 
          variant="success"
        />
        <AdminKPICard 
          title="RFID Access" 
          value={rfidCards.length > 0 ? `${rfidCards.length} cards` : '0 cards'} 
          icon={<CreditCard size={24} />} 
          variant="warning"
        />
      </div>

      <div className="card" style={{ marginBottom: '30px', padding: '24px' }}>
        <div className="panel-header monitoring-header">
          <div>
            <p className="eyebrow">Security</p>
            <h3>RFID Meter Access</h3>
          </div>
          <span className="status-line dark"><span className="pulse-dot" /> Tap authorization enabled</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginTop: '18px' }}>
          <form onSubmit={handleRfidSubmit} style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Card UID</label>
              <input
                type="text"
                value={rfidForm.card_uid}
                onChange={(e) => setRfidForm({ ...rfidForm, card_uid: e.target.value })}
                placeholder="AA11BB22"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Meter ID</label>
              <input
                type="text"
                value={rfidForm.meter_id}
                onChange={(e) => setRfidForm({ ...rfidForm, meter_id: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Owner Name</label>
              <input
                type="text"
                value={rfidForm.owner_name}
                onChange={(e) => setRfidForm({ ...rfidForm, owner_name: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
            <button type="submit" className="btn btn-primary">Register RFID Card</button>
            {rfidStatus.message && (
              <div className={`status-pill ${rfidStatus.type === 'success' ? 'success' : 'error'}`}>
                {rfidStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {rfidStatus.message}
              </div>
            )}
          </form>

          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Tap Test</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input
                  type="text"
                  value={rfidTap.card_uid}
                  onChange={(e) => setRfidTap({ ...rfidTap, card_uid: e.target.value })}
                  placeholder="AA11BB22"
                />
                <input
                  type="text"
                  value={rfidTap.meter_id}
                  onChange={(e) => setRfidTap({ ...rfidTap, meter_id: e.target.value })}
                  placeholder="MTR001"
                />
              </div>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleRfidTap}>Tap Card to Authorize Meter</button>
            {tapStatus.message && (
              <div className={`status-pill ${tapStatus.type === 'success' ? 'success' : 'error'}`}>
                {tapStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {tapStatus.message}
              </div>
            )}
            {tapStatus.message && (
              <div className="status-line dark" style={{ width: 'fit-content' }}>
                <span className="pulse-dot" />
                Transfer Allowed: {tapStatus.transfer_allowed ? 'Yes' : 'No'}
              </div>
            )}
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Card UID</th>
                  <th>Meter</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rfidCards.length > 0 ? rfidCards.map((card, idx) => (
                  <tr key={idx}>
                    <td>{card.card_uid}</td>
                    <td>{card.meter_id}</td>
                    <td>
                      <span className="badge badge-success">{card.status || 'ACTIVE'}</span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                      No RFID cards registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card monitoring-panel" style={{ marginBottom: '30px' }}>
        <div className="panel-header monitoring-header">
          <div>
            <p className="eyebrow">Operations</p>
            <h3>Live Meter Monitoring</h3>
          </div>
          <span className="status-line dark"><span className="pulse-dot" /> Live data stream</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Meter ID</th>
                <th>Voltage (V)</th>
                <th>Current (A)</th>
                <th>Power (W)</th>
                <th>Total Energy (kWh)</th>
                <th>Last Ping</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredReadings.length > 0 ? filteredReadings.map((r, i) => (
                <tr key={i}>
                  <td><span style={{ fontWeight: 700 }}>{r.meter_id}</span></td>
                  <td>{parseFloat(r.voltage || 0).toFixed(1)}</td>
                  <td>{parseFloat(r.current || 0).toFixed(2)}</td>
                  <td>{parseFloat(r.power || 0).toFixed(1)}</td>
                  <td>{parseFloat(r.energy_kwh || 0).toFixed(3)}</td>
                  <td>{new Date(r.timestamp).toLocaleTimeString()}</td>
                  <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {r.verified_by_blockchain && (
                      <span className="badge" style={{ background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>
                        <Shield size={12} /> Verified
                      </span>
                    )}
                    <span className="badge badge-success">Online</span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No active meter readings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
