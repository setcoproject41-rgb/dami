import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';

type User = {
  id: string;
  telegram_id: string;
  full_name: string;
  is_admin: boolean;
  is_approved: boolean;
};

export const AdminUserManagement: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const isMaster = user?.telegram_id === '81358099';

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, telegram_id, full_name, is_admin, is_approved');
    if (error) console.error('Error fetching users', error);
    else setUsers(data as User[]);
    setLoading(false);
  };

  useEffect(() => {
    if (user && (user.is_admin || isMaster)) fetchUsers();
  }, [user]);

  const toggleApprove = async (uid: string, current: boolean) => {
    const { error } = await supabase.from('users').update({ is_approved: !current }).eq('id', uid);
    if (error) console.error('Approve error', error);
    else fetchUsers();
  };

  const toggleAdmin = async (uid: string, current: boolean) => {
    const { error } = await supabase.from('users').update({ is_admin: !current }).eq('id', uid);
    if (error) console.error('Admin toggle error', error);
    else fetchUsers();
  };

  if (authLoading || loading) return <div className="spinner" />;
  if (!user || !(user.is_admin || isMaster)) return <div>Access denied.</div>;

  return (
    <div className="admin-users" style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Manajemen Pengguna</h2>
      <table className="user-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--surface)' }}>
            <th style={{ padding: '8px' }}>Telegram ID</th>
            <th style={{ padding: '8px' }}>Nama</th>
            <th style={{ padding: '8px' }}>Disetujui</th>
            <th style={{ padding: '8px' }}>Admin</th>
            <th style={{ padding: '8px' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px' }}>{u.telegram_id}</td>
              <td style={{ padding: '8px' }}>{u.full_name}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{u.is_approved ? '✅' : '❌'}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{u.is_admin ? '✅' : '❌'}</td>
              <td style={{ padding: '8px' }}>
                {!u.is_approved && (
                  <button
                    onClick={() => toggleApprove(u.id, u.is_approved)}
                    style={{ marginRight: '8px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px' }}
                  >
                    Approve
                  </button>
                )}
                {isMaster && (
                  <button
                    onClick={() => toggleAdmin(u.id, u.is_admin)}
                    style={{ background: u.is_admin ? '#e53e3e' : '#38a169', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px' }}
                  >
                    {u.is_admin ? 'Revoke Admin' : 'Make Admin'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
