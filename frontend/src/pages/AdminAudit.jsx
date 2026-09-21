import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { supabase } from '../lib/supabase';

const AdminAudit = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('timestamp', { ascending: false });

        if (error) throw error;

        setLogs(data.map(log => ({
          ...log,
          timestamp: log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <AdminLayout>
      <div className="admin-page-header">
        <h1>Audit Logs</h1>
        <p>Complete history of admin and automated actions.</p>
      </div>
      <div className="admin-table-container glass-card">
        {loading ? <div style={{padding: '2rem', textAlign: 'center'}}>Loading...</div> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp (IST)</th>
                <th>Admin ID</th>
                <th>Action Taken</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{whiteSpace: 'nowrap'}}>{log.timestamp}</td>
                  <td>{log.admin_id || <span className="warning-text">System/User</span>}</td>
                  <td><strong>{log.action}</strong></td>
                  <td>
                    {log.target_type && (
                      <span className="id-badge">
                        {log.target_type} ID: {log.target_id}
                      </span>
                    )}
                  </td>
                  <td className="audit-details">
                    {log.previous_value && (
                      <div className="audit-prev">
                        <i className="fas fa-minus-circle"></i> {log.previous_value}
                      </div>
                    )}
                    {log.new_value && (
                      <div className="audit-new">
                        <i className="fas fa-plus-circle"></i> {log.new_value}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No logs found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAudit;
