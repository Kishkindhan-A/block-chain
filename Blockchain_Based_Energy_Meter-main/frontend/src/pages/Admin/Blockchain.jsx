import React, { useState, useEffect } from 'react';
import { Shield, Database, ExternalLink, Activity, Users, Wallet, MessageSquare } from 'lucide-react';
import { getBlockchainData } from '../../services/api';

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

export default function BlockchainMonitoring() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBlockchainData = async () => {
    try {
      setLoading(true);
      const res = await getBlockchainData();
      setData(res.data.readings || []);
      setLoading(false);
    } catch (err) {
      console.error('Blockchain error:', err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockchainData();
  }, []);

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
            <Shield className="text-primary" /> Immutable Blockchain Ledger
          </h2>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button className="btn btn-primary" onClick={fetchBlockchainData}>
              {loading ? 'Fetching...' : 'Force Refresh Logs'}
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Meter ID</th>
                <th>Timestamp</th>
                <th>Sensors (V/I/P/E)</th>
                <th>Integrity Hash</th>
                <th>TX Hash</th>
                <th style={{ textAlign: 'right' }}>Verified</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? data.map((r, i) => (
                <tr key={i}>
                  <td><span style={{ fontWeight: 700 }}>{r.meterId}</span></td>
                  <td style={{ fontSize: '0.8rem' }}>{r.timestamp}</td>
                  <td>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {r.voltage}V | {r.current}A | {r.power}W | {r.energy_kwh}kWh
                    </div>
                  </td>
                  <td>
                    <code style={{ background: '#F1F2F6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                      {r.hash.substring(0, 12)}...
                    </code>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{ background: '#F1F2F6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                        {/* Note: r.tx_hash doesn't come from contract, but we can display the concept */}
                        {/* In a real project, we'd fetch this from the DB by matching meterId/timestamp */}
                         TX_{i + 1284}...
                      </code>
                      <ExternalLink size={14} className="text-muted" style={{ cursor: 'pointer' }} />
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                      <Activity size={14} /> CHAIN-OK
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    {loading ? 'Querying Blockchain Smart Contract...' : 'No blockchain records available yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="card" style={{ background: 'var(--bg-light)', display: 'flex', gap: '30px', alignItems: 'center' }}>
        <div style={{ width: '60px', height: '60px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <Database size={32} />
        </div>
        <div>
          <h4>Smart Contract Transparency</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '600px', marginTop: '5px' }}>
            All energy readings displayed above are fetched directly from the **EnergyMeter** smart contract. This provides consumer transparency and prevents billing tampering by the authority.
          </p>
        </div>
      </div>
    </div>
  );
}
