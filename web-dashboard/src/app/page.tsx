"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Project {
  id: string;
  nama_mitra: string;
  nama_user: string;
  proyek: string;
  no_kontrak: string;
  nomor_po: string;
  area_lokasi: string;
  site_operation: string;
  pelaksana: string;
  created_at: string;
}

interface WbsRow {
  id: string;
  activity: string;
  volume: number;
  uom: string;
  target: number;
  progress: number;
  a_start: string;
  a_finish: string;
  isHeader: boolean;
  evidence: { file_id: string; message_id: number | null }[];
}

function getTargetAndUom(designator: string) {
  if (designator.startsWith("PU-")) {
    return { target: 10, uom: "pcs" };
  } else if (designator.startsWith("BC-") || designator.startsWith("DD-")) {
    return { target: 1000, uom: "meter" };
  }
  return { target: 1, uom: "Lot" };
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [wbsData, setWbsData] = useState<WbsRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<WbsRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch projects on mount
  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setProjects(data || []);
        if (data && data.length > 0) {
          setSelectedProject(data[0]);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  // Fetch reports when selectedProject changes
  useEffect(() => {
    if (!selectedProject) {
      setWbsData([]);
      setLoading(false);
      return;
    }
    
    const activeProject = selectedProject;
    
    async function fetchProgress() {
      setLoading(true);
      setSelectedRow(null);
      try {
        const { data: reports, error } = await supabase
          .from('progress_reports')
          .select('*')
          .eq('project_id', activeProject.id)
          .order('reported_at', { ascending: true });
          
        if (error) throw error;
        
        const PREDEFINED_FOLDERS = [
          "MGL - JT.01",
          "JT.01 - JT.02",
          "JT.02 - JT.03",
          "JT.03 - JT.04",
          "JT.04 - JT.05",
          "JT.05 - JT.06",
          "JT.06 - JT.07",
          "JT.07 - JT.08",
          "JT.08 - JT.09",
          "JT.09 - TEM"
        ];
        
        const wbs: WbsRow[] = [];
        
        PREDEFINED_FOLDERS.forEach((folder) => {
          const folderReports = (reports || []).filter(r => r.kategori === folder);
          
          // 1. Add folder header row
          wbs.push({
            id: `folder-${folder}`,
            activity: folder,
            volume: 0,
            uom: "",
            target: 0,
            progress: 0, // Computed from children
            a_start: "-",
            a_finish: "-",
            isHeader: true,
            evidence: []
          });
          
          // 2. Find unique designators reported in this folder
          const designatorsInFolder = Array.from(new Set(folderReports.map(r => r.sub_kategori)));
          
          let totalFolderProgressSum = 0;
          let childCount = 0;
          let minFolderDate: Date | null = null;
          let maxFolderDate: Date | null = null;
          
          designatorsInFolder.forEach((desig) => {
            const desigReports = folderReports.filter(r => r.sub_kategori === desig);
            const accumVolume = desigReports.reduce((sum, r) => sum + Number(r.volume_input || 0), 0);
            const { target, uom } = getTargetAndUom(desig);
            const progress = Math.min(100, Math.round((accumVolume / target) * 100));
            
            // Get dates
            let minDate: Date | null = null;
            let maxDate: Date | null = null;
            
            if (desigReports.length > 0) {
              const times = desigReports.map(r => new Date(r.reported_at).getTime());
              minDate = new Date(Math.min(...times));
              maxDate = new Date(Math.max(...times));
              
              if (!minFolderDate || minDate < minFolderDate) minFolderDate = minDate;
              if (!maxFolderDate || maxDate > maxFolderDate) maxFolderDate = maxDate;
            }
            
            const formatDate = (date: Date | null) => {
              if (!date || isNaN(date.getTime())) return "-";
              return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
            };
            
            // Gather evidence
            const evidenceList: any[] = [];
            desigReports.forEach(r => {
              if (Array.isArray(r.evidence_files)) {
                evidenceList.push(...r.evidence_files);
              }
            });
            
            wbs.push({
              id: `desig-${folder}-${desig}`,
              activity: desig,
              volume: accumVolume,
              uom: uom,
              target: target,
              progress: progress,
              a_start: formatDate(minDate),
              a_finish: progress >= 100 ? formatDate(maxDate) : "-",
              isHeader: false,
              evidence: evidenceList
            });
            
            totalFolderProgressSum += progress;
            childCount++;
          });
          
          // Update folder progress and dates
          const folderIdx = wbs.findIndex(r => r.id === `folder-${folder}`);
          if (folderIdx !== -1 && childCount > 0) {
            wbs[folderIdx].progress = Math.round(totalFolderProgressSum / childCount);
            
            const formatDate = (date: Date | null) => {
              if (!date || isNaN(date.getTime())) return "-";
              return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
            };
            wbs[folderIdx].a_start = formatDate(minFolderDate);
            if (wbs[folderIdx].progress >= 100) {
              wbs[folderIdx].a_finish = formatDate(maxFolderDate);
            }
          }
        });
        
        setWbsData(wbs);
      } catch (err) {
        console.error('Error fetching progress:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProgress();
  }, [selectedProject]);

  // Compute overall project progress
  const headers = wbsData.filter(r => r.isHeader && r.progress > 0);
  const overallProgress = headers.length > 0
    ? Math.round(headers.reduce((sum, r) => sum + r.progress, 0) / headers.length)
    : 0;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          📊 Project Hub
        </div>
        <div style={{ padding: '16px 20px 8px 20px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Daftar Proyek
        </div>
        
        {projects.length === 0 ? (
          <div style={{ padding: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Belum ada proyek aktif.
          </div>
        ) : (
          <ul className="sidebar-project-list">
            {projects.map((proj) => (
              <li
                key={proj.id}
                className={`project-item ${selectedProject?.id === proj.id ? 'active' : ''}`}
                onClick={() => setSelectedProject(proj)}
              >
                <span className="project-title">{proj.proyek}</span>
                <span className="project-mitra">{proj.nama_mitra}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="nav-links">
            <a>Dashboard</a>
            <a>Laporan Kerja</a>
            <a>Informasi Kontrak</a>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            User ID: Pelaksana Lapangan
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          {loading && wbsData.length === 0 ? (
            <div className="spinner"></div>
          ) : !selectedProject ? (
            <div className="empty-state" style={{ marginTop: '40px' }}>
              <h3>👋 Selamat Datang di Project Hub Dashboard</h3>
              <p style={{ marginTop: '8px' }}>Gunakan Telegram Bot Anda untuk melakukan registrasi user baru dan mendaftarkan proyek kerja pertama Anda.</p>
            </div>
          ) : (
            <>
              {/* Project Header Info */}
              <div style={{ marginBottom: '20px', background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  🏗️ Proyek: {selectedProject.proyek}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div>🏢 <b>Mitra:</b> {selectedProject.nama_mitra}</div>
                  <div>👤 <b>User:</b> {selectedProject.nama_user}</div>
                  <div>📄 <b>No Kontrak:</b> {selectedProject.no_kontrak}</div>
                  <div>🔢 <b>No PO:</b> {selectedProject.nomor_po}</div>
                  <div>📍 <b>Lokasi:</b> {selectedProject.area_lokasi}</div>
                  <div>⚙️ <b>Site Ops:</b> {selectedProject.site_operation}</div>
                  <div>👷 <b>Pelaksana:</b> {selectedProject.pelaksana}</div>
                </div>
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: 'var(--accent)' }}>
                    Progress Kumulatif Aktual: {overallProgress}%
                  </span>
                  <span style={{ fontSize: '0.85rem' }}>Target Rencana: 100.00%</span>
                </div>
              </div>

              {/* WBS Table */}
              <div className="wbs-table-container">
                <table className="wbs-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Sektor / Designator Pekerjaan</th>
                      <th className="center" style={{ width: '10%' }}>Volume Aktual</th>
                      <th className="center" style={{ width: '10%' }}>UoM</th>
                      <th className="center" style={{ width: '10%' }}>Target</th>
                      <th style={{ width: '15%' }}>Progress</th>
                      <th style={{ width: '7.5%' }}>A-Start</th>
                      <th style={{ width: '7.5%' }}>A-Finish</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wbsData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="empty-state">
                          Belum ada laporan progress masuk untuk proyek ini.
                        </td>
                      </tr>
                    ) : (
                      wbsData.map((row) => {
                        const isSelected = selectedRow?.id === row.id;
                        const hasEvidence = !row.isHeader && row.evidence.length > 0;
                        
                        return (
                          <tr
                            key={row.id}
                            className={`${row.isHeader ? "header-row" : "clickable-row"} ${isSelected ? "active-row" : ""}`}
                            onClick={() => {
                              if (!row.isHeader) {
                                setSelectedRow(row);
                              }
                            }}
                          >
                            <td style={{ paddingLeft: row.isHeader ? '16px' : '36px' }}>
                              {row.isHeader ? `📁 ${row.activity}` : `📄 ${row.activity}`}
                              {hasEvidence && (
                                <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                  📸 {row.evidence.length}
                                </span>
                              )}
                            </td>
                            <td className="center">{row.isHeader ? "-" : row.volume}</td>
                            <td className="center">{row.isHeader ? "-" : row.uom}</td>
                            <td className="center">{row.isHeader ? "-" : row.target}</td>
                            <td>
                              <div className="flex items-center justify-between" style={{ marginBottom: '2px' }}>
                                <span className="progress-text" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{row.progress}%</span>
                              </div>
                              <div className="progress-wrapper">
                                <div className="progress-fill" style={{ width: `${row.progress}%` }}></div>
                              </div>
                            </td>
                            <td>{row.a_start}</td>
                            <td>{row.a_finish}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Photo Evidence Panel */}
              <div className="photo-panel">
                <div className="photo-panel-header">
                  🖼️ Bukti Dokumentasi (Evident)
                </div>
                
                {!selectedRow ? (
                  <div className="empty-state">
                    Pilih salah satu baris pekerjaan (designator) di tabel di atas untuk memuat bukti foto di panel ini.
                  </div>
                ) : selectedRow.evidence.length === 0 ? (
                  <div className="empty-state">
                    Pekerjaan <b>{selectedRow.activity}</b> belum memiliki bukti foto ter-upload.
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Menampilkan bukti foto untuk pekerjaan: <b>{selectedRow.activity}</b> ({selectedRow.evidence.length} foto)
                    </div>
                    <div className="photo-grid">
                      {selectedRow.evidence.map((photo, index) => (
                        <div key={index} className="photo-card">
                          <img
                            src={`/api/evident-image?file_id=${photo.file_id}`}
                            alt={`Evident photo ${index + 1}`}
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
