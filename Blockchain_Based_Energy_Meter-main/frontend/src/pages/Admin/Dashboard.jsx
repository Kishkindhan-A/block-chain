import React, { useState, useEffect } from 'react';
import { Users, Activity, Wallet, MessageSquare, Search, RefreshCw, Smartphone, Shield } from 'lucide-react';
import { getLatestReadings } from '../../services/api';

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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const res = await getLatestReadings();
      setReadings(res.data.readings || []);
      setLoading(false);
    } catch (err) {
      console.error('Admin fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000); // 1s live refresh
    return () => clearInterval(interval);
  }, []);

  const filteredReadings = readings.filter(r => 
    r.meter_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-up">
      <div className="kpi-grid">
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
          title="Active Complaints" 
          value="12" 
          icon={<MessageSquare size={24} />} 
          variant="warning"
        />
      </div>

      <div className="card" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity className="text-primary" /> Live Meter Monitoring
          </h2>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#B2BEC3' }} />
              <input 
                type="text" 
                placeholder="Search Meter ID..." 
                className="btn" 
                style={{ paddingLeft: '40px', background: '#F8F9FA' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={fetchData}>
              <RefreshCw size={18} /> Refresh
            </button>
          </div>
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
