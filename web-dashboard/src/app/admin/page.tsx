"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { AdminUserManagement } from '@/components/AdminUserManagement';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    } else if (!loading && user && user.telegram_id !== '81358099' && !user.is_admin) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) return <div className="spinner" />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem' }}>👥 Manajemen User</h1>
          <a href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem' }}>← Kembali ke Dashboard</a>
        </div>
        <AdminUserManagement />
      </div>
    </div>
  );
}
