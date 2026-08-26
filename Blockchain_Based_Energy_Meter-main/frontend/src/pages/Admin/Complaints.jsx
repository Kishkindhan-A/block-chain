import React from 'react';
import { MessageSquare, Users, Activity, Wallet, User } from 'lucide-react';

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

export default function AdminComplaints() {
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
            <MessageSquare className="text-primary" /> Consumer Complaints System
          </h2>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Consumer Meter ID</th>
                <th>Subject</th>
                <th>Date Raised</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span style={{ fontWeight: 600 }}>TKT-991</span></td>
                <td><div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><User size={14}/> MTR012</div></td>
                <td>High Voltage fluctuation causing trip.</td>
                <td>April 12, 2026</td>
                <td style={{ textAlign: 'right' }}><span className="badge" style={{ background: '#FEE2E2', color: '#991B1B' }}>Open / High</span></td>
              </tr>
              <tr>
                <td><span style={{ fontWeight: 600 }}>TKT-988</span></td>
                <td><div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><User size={14}/> MTR001</div></td>
                <td>Billing mismatch compared to actual usage.</td>
                <td>April 11, 2026</td>
                <td style={{ textAlign: 'right' }}><span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>Under Review</span></td>
              </tr>
              <tr>
                <td><span style={{ fontWeight: 600 }}>TKT-982</span></td>
                <td><div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><User size={14}/> MTR044</div></td>
                <td>Meter display not turning on.</td>
                <td>April 10, 2026</td>
                <td style={{ textAlign: 'right' }}><span className="badge badge-success">Resolved</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
