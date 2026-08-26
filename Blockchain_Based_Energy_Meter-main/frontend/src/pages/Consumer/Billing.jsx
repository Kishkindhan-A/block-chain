import React, { useState, useEffect } from 'react';
import { CreditCard, History, TrendingDown, Receipt, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { getBilling, createOrder, verifyPayment, getPaymentHistory } from '../../services/api';

export default function BillingModule({ user }) {
  const [bill, setBill] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user.meterId]);

  const fetchData = async () => {
    try {
      const [billRes, historyRes] = await Promise.all([
        getBilling(user.meterId),
        getPaymentHistory(user.meterId)
      ]);
      setBill(billRes.data);
      setHistory(historyRes.data.payments || []);
      setLoading(false);
    } catch (err) {
      console.error('Data fetch error:', err.message);
      setLoading(false);
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!bill || bill.total_bill <= 0) return;
    
    setPaying(true);
    try {
      // 1. Create order on backend
      const orderRes = await createOrder({
        meterId: user.meterId,
        amount: bill.total_bill,
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
      });

      if (!orderRes.data.success) throw new Error('Order creation failed');

      const { order_id, amount, currency, key } = orderRes.data;

      // 2. Load Razorpay script
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        alert('Razorpay SDK failed to load. Check your internet connection.');
        setPaying(false);
        return;
      }

      // 3. Open Razorpay Checkout
      const options = {
        key: key,
        amount: amount,
        currency: currency,
        name: 'Enargy Smart Meter',
        description: `Electricity Bill Payment - ${user.meterId}`,
        image: 'https://cdn-icons-png.flaticon.com/512/3104/3104845.png',
        order_id: order_id,
        handler: async (response) => {
          try {
            // 4. Verify payment on backend
            const verifyRes = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data.success) {
              alert('Payment Successful!');
              fetchData(); // Refresh bill and history
            }
          } catch (err) {
            console.error('Verification error:', err);
            alert('Payment verification failed.');
          }
        },
        prefill: {
          name: user.name || 'Consumer',
          email: user.email || 'consumer@enargy.com',
          contact: '9999999999'
        },
        theme: {
          color: '#3b82f6'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error('Payment error:', err);
      alert('Could not initiate payment. Check console for details.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
      <Loader2 className="animate-spin text-primary" size={40} />
    </div>
  );

  return (
    <div className="animate-up">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        {/* Left Column: Current Bill */}
        <div className="card">
          <h2 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt className="text-primary" /> Current Bill
          </h2>
          <div style={{ background: 'var(--bg-light)', padding: '24px', borderRadius: '12px', textAlign: 'center', marginBottom: '24px' }}>
            <p className="kpi-label">Total Amount Due</p>
            <h1 style={{ fontSize: '2.5rem', margin: '10px 0', color: 'var(--primary)' }}>₹{bill.total_bill.toFixed(2)}</h1>
            <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
              Period: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
            onClick={handlePayment}
            disabled={paying || bill.total_bill <= 0}
          >
            {paying ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
            {paying ? 'Processing...' : 'Pay Now via Razorpay'}
          </button>
          
          <div style={{ marginTop: '30px' }}>
            <h4 style={{ marginBottom: '15px' }}>Bill Breakdown</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bill.breakdown.map((slab, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{slab.slab} ({slab.units}U)</span>
                  <span style={{ fontWeight: 600 }}>₹{slab.cost.toFixed(2)}</span>
                </div>
              ))}
              <hr style={{ border: 'none', borderTop: '1px solid #eee' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Total Amount</span>
                <span style={{ color: 'var(--accent)' }}>₹{bill.total_bill.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payment History */}
        <div className="card">
          <h2 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History className="text-primary" /> Payment History
          </h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Date</th>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? history.map((pay, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{pay.razorpay_payment_id || pay.razorpay_order_id}</td>
                    <td>{new Date(pay.created_at).toLocaleDateString()}</td>
                    <td>{pay.bill_month}</td>
                    <td>₹{pay.amount}</td>
                    <td>
                      <span className={`badge ${pay.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                        {pay.status === 'paid' ? <CheckCircle size={12} /> : <Loader2 className="animate-spin" size={12} />}
                        {pay.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
