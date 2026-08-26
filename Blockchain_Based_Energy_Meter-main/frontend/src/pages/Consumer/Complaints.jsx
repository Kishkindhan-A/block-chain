import React, { useState } from 'react';
import { MessageCircle, FileText, CheckCircle, Clock } from 'lucide-react';

export default function ComplaintModule({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ type: '', desc: '' });

  const complaints = [
    { id: 'CMP_001', type: 'High Bill', date: 'March 20, 2026', status: 'Pending' },
    { id: 'CMP_992', type: 'Meter Display Issue', date: 'Feb 12, 2026', status: 'Resolved' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Complaint registered successfully! Reference ID: CMP_002');
    setShowForm(false);
  };

  return (
    <div className="animate-up">
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Clock className="text-primary" /> Track Complaints</h2>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Raise New'}
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Issue Type</th>
                  <th>Date Filed</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.id}>
                    <td><span style={{ fontWeight: 700 }}>{c.id}</span></td>
                    <td>{c.type}</td>
                    <td>{c.date}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`badge ${c.status === 'Resolved' ? 'badge-success' : 'badge-pending'}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showForm ? (
          <div className="card animate-up" style={{ alignSelf: 'start' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
              <FileText className="text-primary" /> Register Complaint
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Issue Category</label>
                <select 
                  value={formData.type} 
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })} 
                  required
                >
                  <option value="">-- Choose Category --</option>
                  <option value="No Power">No Power Supply</option>
                  <option value="Meter Issue">Meter Display/Wiring Issue</option>
                  <option value="High Bill">High Billing Error</option>
                  <option value="Other">Other Query</option>
                </select>
              </div>
              <div className="form-group">
                <label>Describe your problem</label>
                <textarea 
                  rows="4" 
                  placeholder="Tell us more about the issue..." 
                  value={formData.desc} 
                  onChange={(e) => setFormData({ ...formData, desc: e.target.value })} 
                  required
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Submit Complaint</button>
            </form>
          </div>
        ) : (
          <div className="card" style={{ background: 'var(--primary)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
            <MessageCircle size={64} style={{ opacity: 0.3, marginBottom: '20px' }} />
            <h2 style={{ color: 'white' }}>Quick Support</h2>
            <p style={{ color: '#B2BEC3', marginTop: '10px' }}>Need help? Our team is available 24/7 for emergency power restoration queries.</p>
            <button className="btn btn-accent" style={{ marginTop: '20px' }}>Contact Hotline</button>
          </div>
        )}
      </div>
    </div>
  );
}
