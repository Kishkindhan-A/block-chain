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
    labels: data.history.map(h => {
      const readingDate = new Date(h.timestamp);
      return Number.isNaN(readingDate.getTime())
        ? 'Unknown time'
        : readingDate.toLocaleTimeString();
    }),
    datasets: [{
      label: 'Live Power Consumption (W)',
      data: data.history.map(h => h.power || 0),
      borderColor: '#0f172a',
      borderWidth: 3,
      backgroundColor: 'rgba(15, 23, 42, 0.10)',
      pointBackgroundColor: '#0f172a',
      pointBorderColor: '#f8fafc',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.38,
      fill: true,
      cubicInterpolationMode: 'monotone',
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        padding: 12,
        borderColor: 'rgba(148, 163, 184, 0.18)',
        borderWidth: 1,
        displayColors: false,
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.18)', drawBorder: false },
        border: { dash: [5, 5] },
        ticks: { color: '#64748b', font: { size: 11 } }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', maxRotation: 0, autoSkip: true, font: { size: 11 } }
      }
    }
  };

  return (
    <div className="dashboard-shell consumer-dashboard">
      <div className="luxury-hero card">
        <div className="hero-topline">
          <span className="range-pill">Live Feed</span>
          <span className="status-line"><span className="pulse-dot" /> Grid stable</span>
        </div>
        <div className="hero-grid">
          <div>
            <p className="eyebrow">Home Energy Intelligence</p>
            <h2>Smart consumption, refined for clarity.</h2>
          </div>
          <div className="mini-metric-row">
            <div className="mini-stat">
              <span>Load</span>
              <strong>{data.power.toFixed(1)} W</strong>
            </div>
            <div className="mini-stat">
              <span>Voltage</span>
              <strong>{data.voltage.toFixed(1)} V</strong>
            </div>
            <div className="mini-stat">
              <span>Usage</span>
              <strong>{data.energy_kwh.toFixed(3)} kWh</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="kpi-grid luxury-kpi-grid">
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
          value={data.history[0]?.verified_by_blockchain || data.history[0]?.verification_status === 'VALID' ? "Verified" : "Pending..."} 
          label="Blockchain Anchored" 
          icon={<Shield size={24} />} 
          variant={data.history[0]?.verified_by_blockchain || data.history[0]?.verification_status === 'VALID' ? "success" : "warning"}
        />
      </div>

      <div className="analytics-grid">
        <div className="card analytic-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Consumption Trend</p>
              <h3>Power Consumption Graph</h3>
            </div>
            <div className="dot-legend">
              <span><i className="dot accent" /> Real-time wattage</span>
            </div>
          </div>
          <div style={{ height: '320px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="stacked-panel">
          <div className="card insight-panel">
            <h3>Current Meter Stats</h3>
            <div className="meter-list">
              <div className="meter-stat">
                <p>Mains Voltage</p>
                <h4>{data.voltage.toFixed(1)} V</h4>
              </div>
              <div className="meter-stat">
                <p>Load Current</p>
                <h4>{data.current.toFixed(2)} A</h4>
              </div>
              <div className="meter-stat">
                <p>Last Sync</p>
                <h4>{new Date().toLocaleTimeString()}</h4>
              </div>
            </div>
          </div>

          <div className="card insight-panel">
            <h3>Usage Summary</h3>
            <ul className="summary-list">
              <li><span>Peak demand</span><strong>{data.power > 0 ? `${data.power.toFixed(1)} W` : '—'}</strong></li>
              <li><span>Smart tariff</span><strong>Off-peak optimized</strong></li>
              <li><span>Efficiency</span><strong>96.4%</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
