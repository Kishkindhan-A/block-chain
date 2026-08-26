import React, { useState, useEffect } from 'react';
import { Activity, Zap, Shield, TrendingUp, Clock, AlertTriangle, Receipt } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { getMeterReadings, getBilling } from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const KPICard = ({ title, value, label, icon, variant = 'primary', action }) => (
  <div className={`card kpi-card kpi-${variant} animate-up`}>
    <div className="kpi-icon">{icon}</div>
    <div style={{ flex: 1 }}>
      <p className="kpi-label">{title}</p>
      <h2 className="kpi-value">{value}</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</p>
    </div>
    {action && (
      <button className="btn btn-accent" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
        {action}
      </button>
    )}
  </div>
);

export default function ConsumerDashboard({ user }) {
  const [data, setData] = useState({
    voltage: 0,
    current: 0,
    power: 0,
    energy_kwh: 0,
    bill: 0,
    history: []
  });

  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [readingsRes, billRes] = await Promise.all([
        getMeterReadings(user.meterId),
        getBilling(user.meterId)
      ]);

      const latest = readingsRes.data.readings[0] || {};
      const history = readingsRes.data.readings.slice(0, 10).reverse();

      setData({
        voltage: parseFloat(latest.voltage || 0),
        current: parseFloat(latest.current || 0),
        power: parseFloat(latest.power || 0),
        energy_kwh: parseFloat(latest.energy_kwh || 0),
        bill: parseFloat(billRes.data.total_bill || 0),
        history
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err.message);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000); // 1s real-time auto-refresh
    return () => clearInterval(interval);
  }, [user.meterId]);

  const chartData = {
    labels: data.history.map(h => new Date(h.timestamp).toLocaleTimeString()),
    datasets: [{
      label: 'Live Power Consumption (W)',
      data: data.history.map(h => h.power),
      borderColor: '#F79F1F',
      backgroundColor: 'rgba(247, 159, 31, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: '#f1f2f6' }, border: { dash: [4, 4] } },
      x: { grid: { display: false } }
    }
  };

  return (
    <div>
      <div className="kpi-grid">
        <KPICard 
          title="Current Bill" 
          value={`₹${data.bill.toFixed(2)}`} 
          label={`Due Date: April 10, 2026`} 
          icon={<Receipt size={24} />} 
          variant="accent"
          action="PAY NOW"
        />
        <KPICard 
          title="Live Power" 
          value={`${data.power.toFixed(1)} W`} 
          label="Real-time Load" 
          icon={<Zap size={24} />} 
        />
        <KPICard 
          title="Total Energy" 
          value={`${data.energy_kwh.toFixed(3)} kWh`} 
          label="Cumulative Usage" 
          icon={<TrendingUp size={24} />} 
          variant="success"
        />
        <KPICard 
          title="Data Integrity" 
          value={data.history[0]?.verified_by_blockchain ? "Verified" : "Pending..."} 
          label="Blockchain Anchored" 
          icon={<Shield size={24} />} 
          variant={data.history[0]?.verified_by_blockchain ? "success" : "warning"}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
            <h3>Power Consumption Graph</h3>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ width: '10px', height: '10px', background: 'var(--accent)', borderRadius: '50%' }}></span>
                <span>Real-time Wattage</span>
              </div>
            </div>
          </div>
          <div style={{ height: '320px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Current Meter Stats</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#F8F9FA', padding: '16px', borderRadius: '12px', border: '1px solid #eee' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mains Voltage</p>
              <h2 style={{ color: 'var(--primary)' }}>{data.voltage.toFixed(1)} V</h2>
            </div>
            <div style={{ background: '#F8F9FA', padding: '16px', borderRadius: '12px', border: '1px solid #eee' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Load Current</p>
              <h2 style={{ color: 'var(--primary)' }}>{data.current.toFixed(2)} A</h2>
            </div>
            <div style={{ background: '#F8F9FA', padding: '16px', borderRadius: '12px', border: '1px solid #eee' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Timestamp</p>
              <p style={{ fontWeight: 600 }}>{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
