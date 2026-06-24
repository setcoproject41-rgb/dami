"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function LoginPage() {
  const [telegramId, setTelegramId] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { login, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!telegramId.trim()) {
      setError('Masukkan Telegram ID Anda.');
      return;
    }
    try {
      await login(telegramId.trim());
      router.push('/');
    } catch (err) {
      console.error(err);
      setError('Login gagal. Pastikan ID terdaftar.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', width: '340px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px', color: 'var(--text-primary)', fontSize: '1.5rem' }}>🔐 Login</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>Masuk dengan Telegram ID Anda</p>
        <input
          type="text"
          placeholder="Masukkan Telegram ID"
          value={telegramId}
          onChange={(e) => setTelegramId(e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            marginBottom: '12px',
            boxSizing: 'border-box',
            outline: 'none'
          }}
        />
        {error && <p style={{ color: '#fc8181', fontSize: '0.85rem', marginBottom: '12px' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Memuat...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
