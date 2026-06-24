import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';

type UserRecord = {
  telegram_id: string;
  username: string;
  nama_lengkap: string;
  status: string;
};

export const AdminUserManagement: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const isMaster = user?.telegram_id === '81358099';

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('telegram_id, username, nama_lengkap, status');
    if (error) console.error('Error fetching users', error);
    else setUsers(data as UserRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    if (user && (user.is_admin || isMaster)) fetchUsers();
  }, [user]);

  const toggleAdmin = async (tid: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ADMIN' ? 'USER' : 'ADMIN';
    const { error } = await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('telegram_id', tid);
    if (error) console.error('Admin toggle error', error);
    else fetchUsers();
  };

  const deleteUser = async (tid: string) => {
    if (!confirm(`Hapus user ${tid}?`)) return;
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('telegram_id', tid);
    if (error) console.error('Delete error', error);
    else fetchUsers();
  };

  if (authLoading) return <div className="spinner" />;
  if (!user || !(user.is_admin || isMaster)) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>⛔ Akses ditolak. Hanya admin yang bisa mengakses halaman ini.</div>;

  return (
    <div className="admin-users" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--text-primary)' }}>Manajemen Pengguna</h2>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total: {users.length} user</span>
      </div>
      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="wbs-table-container">
          <table className="wbs-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px' }}>Telegram ID</th>
                <th style={{ padding: '10px' }}>Username</th>
                <th style={{ padding: '10px' }}>Nama Lengkap</th>
                <th style={{ padding: '10px' }}>Status</th>
                {isMaster && <th style={{ padding: '10px' }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.telegram_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px' }}>{u.telegram_id}</td>
                  <td style={{ padding: '10px' }}>@{u.username || '-'}</td>
                  <td style={{ padding: '10px' }}>{u.nama_lengkap}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span style={{
                      background: u.status === 'ADMIN' ? 'var(--accent)' : 'var(--border)',
                      color: u.status === 'ADMIN' ? 'white' : 'var(--text-primary)',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}>
                      {u.status === 'ADMIN' ? '🛡️ Admin' : '👤 User'}
                    </span>
                  </td>
                  {isMaster && (
                    <td style={{ padding: '10px' }}>
                      <button
                        onClick={() => toggleAdmin(u.telegram_id, u.status)}
                        style={{
                          background: u.status === 'ADMIN' ? '#e53e3e' : '#38a169',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '5px 10px',
                          cursor: 'pointer',
                          marginRight: '8px',
                          fontSize: '0.8rem'
                        }}
                      >
                        {u.status === 'ADMIN' ? 'Revoke Admin' : 'Make Admin'}
                      </button>
                      {u.telegram_id !== '81358099' && (
                        <button
                          onClick={() => deleteUser(u.telegram_id)}
                          style={{
                            background: 'transparent',
                            color: '#e53e3e',
                            border: '1px solid #e53e3e',
                            borderRadius: '4px',
                            padding: '5px 10px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          Hapus
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
