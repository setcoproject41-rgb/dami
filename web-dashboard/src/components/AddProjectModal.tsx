import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';

interface Project {
  nama_mitra: string;
  nama_user: string;
  proyek: string;
  no_kontrak: string;
  nomor_po: string;
  area_lokasi: string;
  site_operation: string;
  pelaksana: string;
}

export const AddProjectModal: React.FC<{ isOpen: boolean; onClose: () => void; onProjectAdded: () => void }> = ({ isOpen, onClose, onProjectAdded }) => {
  const { user } = useAuth();
  const [form, setForm] = useState<Project>({
    nama_mitra: '',
    nama_user: '',
    proyek: '',
    no_kontrak: '',
    nomor_po: '',
    area_lokasi: '',
    site_operation: '',
    pelaksana: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('projects').insert([
      {
        ...form,
        created_by: user.telegram_id
      }
    ]);
    setLoading(false);
    if (!error) {
      onProjectAdded();
      onClose();
    } else {
      console.error('Error adding project', error);
      alert('Gagal menambahkan proyek');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', width: '420px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
        <h2 style={{ marginBottom: '12px' }}>Tambah Proyek Baru</h2>
        <form onSubmit={handleSubmit}>
          {Object.entries(form).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{key.replace('_', ' ')}</label>
              <input
                type="text"
                name={key}
                value={value as string}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="button" onClick={onClose} disabled={loading} style={{ marginRight: '8px', background: 'var(--border)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '4px' }}>
              Batal
            </button>
            <button type="submit" disabled={loading} style={{ background: 'var(--accent)', color: 'white', padding: '6px 12px', borderRadius: '4px' }}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
