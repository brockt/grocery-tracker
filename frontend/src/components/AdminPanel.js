import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../axiosConfig';
import { toast } from 'react-toastify';

function AdminPanel() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStores: 0,
    totalItems: 0,
    totalPackaging: 0,
    totalMeasurements: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersRes, storesRes, itemsRes, packagingRes, measurementsRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/stores'),
        api.get('/api/admin/items'),
        api.get('/api/admin/packaging'),
        api.get('/api/admin/measurements')
      ]);

      setStats({
        totalUsers: usersRes.data.length,
        totalStores: storesRes.data.length,
        totalItems: itemsRes.data.length,
        totalPackaging: packagingRes.data.length,
        totalMeasurements: measurementsRes.data.length
      });
    } catch (error) {
      toast.error('Failed to load admin data');
    }
  };

  return (
    <div className="admin-panel">
      <h2>Admin Dashboard</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-number">{stats.totalUsers}</p>
        </div>
        <div className="stat-card">
          <h3>Stores</h3>
          <p className="stat-number">{stats.totalStores}</p>
        </div>
        <div className="stat-card">
          <h3>Items</h3>
          <p className="stat-number">{stats.totalItems}</p>
        </div>
        <div className="stat-card">
          <h3>Packaging Types</h3>
          <p className="stat-number">{stats.totalPackaging}</p>
        </div>
        <div className="stat-card">
          <h3>Measurements</h3>
          <p className="stat-number">{stats.totalMeasurements}</p>
        </div>
      </div>

      <div className="admin-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          <Link to="/admin-options" className="action-card">
            <span className="action-icon">🏪</span>
            <div>
              <h4>Manage Reference Data</h4>
              <p>Add, edit, or remove stores, items, packaging types, and measurement units</p>
            </div>
          </Link>
          <Link to="/users" className="action-card">
            <span className="action-icon">👥</span>
            <div>
              <h4>User Management</h4>
              <p>Create and manage user accounts, set admin privileges</p>
            </div>
          </Link>
          <Link to="/purchases" className="action-card">
            <span className="action-icon">🛒</span>
            <div>
              <h4>Purchase Entry</h4>
              <p>Enter and track grocery purchases</p>
            </div>
          </Link>
          <Link to="/reports" className="action-card">
            <span className="action-icon">📊</span>
            <div>
              <h4>Reports & Analytics</h4>
              <p>View price history, store comparisons, and spending trends</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="admin-section">
        <h3>System Information</h3>
        <table className="info-table">
          <tbody>
            <tr>
              <td>Database</td>
              <td>PostgreSQL 15</td>
            </tr>
            <tr>
              <td>Backend</td>
              <td>Flask REST API</td>
            </tr>
            <tr>
              <td>Frontend</td>
              <td>React 18</td>
            </tr>
            <tr>
              <td>Authentication</td>
              <td>JWT Tokens (24h expiry)</td>
            </tr>
            <tr>
              <td>Charts</td>
              <td>Recharts</td>
            </tr>
            <tr>
              <td>Deployment</td>
              <td>Docker Compose</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminPanel;
