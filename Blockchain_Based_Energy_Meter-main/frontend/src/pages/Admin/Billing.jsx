import React, { useState, useEffect } from 'react';
import { Receipt, Users, Activity, Wallet, MessageSquare, Calendar, ChevronRight, RefreshCcw } from 'lucide-react';
import axios from 'axios';

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

export default function AdminBilling() {
  const [formData, setFormData] = useState({
    meter_id: '',
    start_date: '',
    end_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [fetching, setFetching] = useState(false);

  // Fetch all payments for the admin table
  const fetchPayments = async () => {
    setFetching(true);
    try {
      const response = await axios.get('/api/payments');
      setPayments(response.data.payments);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleGenerateBill = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post('/api/billing/generate', formData);
      setResult(response.data.data);
      // Refresh the table to show the new bill
      fetchPayments();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate bill');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case 'paid': return <span className="badge badge-success">Paid</span>;
      case 'pending': return <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>Pending</span>;
      case 'failed': return <span className="badge" style={{ background: '#FEE2E2', color: '#991B1B' }}>Failed</span>;
      default: return <span className="badge badge-pending">{status}</span>;
    }
  };

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
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Calendar className="text-primary" /> Generate Electricity Bill
        </h2>
        
        <form onSubmit={handleGenerateBill} style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px',
          alignItems: 'end'
        }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Consumer Meter ID</label>
            <input 
              type="text" 
              placeholder="e.g., MTR001" 
              required 
              value={formData.meter_id}
              onChange={(e) => setFormData({...formData, meter_id: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Start Date</label>
            <input 
              type="date" 
              required 
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>End Date</label>
            <input 
              type="date" 
              required 
              value={formData.end_date}
              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ height: '48px' }}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Bill'}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', fontSize: '0.9rem' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="animate-up" style={{ marginTop: '30px', padding: '25px', background: '#F8F9FA', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ color: 'var(--primary)', marginBottom: '5px' }}>Bill Generated Successfully</h3>
                <p style={{ color: 'var(--text-muted)' }}>Period: {result.period}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-success">READY</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
              <div style={{ padding: '15px', background: 'white', borderRadius: '8px', border: '1px solid #F1F2F6' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Consumptions</p>
                <h2 style={{ margin: '10px 0' }}>{result.consumed_kwh} <span style={{ fontSize: '1rem', fontWeight: 500 }}>kWh</span></h2>
              </div>
              <div style={{ padding: '15px', background: 'white', borderRadius: '8px', border: '1px solid #F1F2F6' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount Due</p>
                <h2 style={{ margin: '10px 0', color: 'var(--success)' }}>₹{result.total_bill}</h2>
              </div>
            </div>

            <div>
              <p style={{ fontWeight: 600, marginBottom: '10px', fontSize: '0.9rem' }}>Charge Breakdown:</p>
              <div className="table-container" style={{ boxShadow: 'none', border: '1px solid #F1F2F6' }}>
                <table style={{ fontSize: '0.85rem' }}>
                  <thead style={{ background: '#F9FAFB' }}>
                    <tr>
                      <th>Slab</th>
                      <th>Units</th>
                      <th>Rate</th>
                      <th style={{ textAlign: 'right' }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.breakdown.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.slab}</td>
                        <td>{item.units} kWh</td>
                        <td>₹{item.rate}/kWh</td>
                        <td style={{ textAlign: 'right' }}>₹{item.cost.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#F9FAFB', fontWeight: 700 }}>
                      <td colSpan="3">Total Amount</td>
                      <td style={{ textAlign: 'right' }}>₹{result.total_bill}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt className="text-primary" /> Authority Billing Details
          </h2>
          <button 
            className="btn btn-primary" 
            onClick={fetchPayments}
            disabled={fetching}
          >
            <RefreshCcw size={18} className={fetching ? 'animate-spin' : ''} />
            {fetching ? 'Refreshing...' : 'Refresh Records'}
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Consumer Meter ID</th>
                <th>Period / Month</th>
                <th>Amount Due</th>
                <th>Date Generated</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.length > 0 ? (
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <td><span style={{ fontWeight: 600 }}>INV-{2600 + payment.id}</span></td>
                    <td>{payment.meter_id}</td>
                    <td>{payment.bill_month}</td>
                    <td style={{ fontWeight: 600 }}>₹{payment.amount}</td>
                    <td>{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>{getStatusBadge(payment.status)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {fetching ? 'Fetching latest records...' : 'No billing records found.'}
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
