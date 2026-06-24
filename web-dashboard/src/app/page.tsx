"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { AddProjectModal } from '@/components/AddProjectModal';
import { EditProjectModal } from '@/components/EditProjectModal';

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
  created_by?: string;
  created_at?: string;
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
  if (designator.startsWith('PU-')) {
    return { target: 10, uom: 'pcs' };
  } else if (designator.startsWith('BC-') || designator.startsWith('DD-')) {
    return { target: 1000, uom: 'meter' };
  }
  return { target: 1, uom: 'Lot' };
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [wbsData, setWbsData] = useState<WbsRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<WbsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [generatingDocx, setGeneratingDocx] = useState(false);

  const isAdmin = !!user && (user.is_admin || user.telegram_id === '81358099');

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
        if (data && data.length > 0) setSelectedProject(data[0]);
        else setLoading(false);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  // Fetch progress when selectedProject changes
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
        const TASK_CATEGORIES = [
          "BC-TR (GALIAN) / BORING MANUAL / ROJOK (DD-BM)",
          "PEMASANGAN SUBDUCT / HDPE / PIPA",
          "PEMBUATAN & PEMASANGAN HANDHOLE",
          "PENARIKKAN KABEL FEEDER",
          "PENARIKKAN KABEL DISTRIBUSI",
          "PEMASANGAN TIANG 7m / 9m",
          "PEMASANGAN ODC",
          "PEMASANGAN ODP",
          "PEMASANGAN DAN TERMINASI OTB",
          "PEMASANGAN CLOSURE",
          "PEMASANGAN AKSESORIS",
          "TERMINASI ODC",
          "TERMINASI ODP",
          "TERMINASI CLOSURE",
          "PEMASANGAN IKR/IKG",
          "INSTALASI FTM",
          "INSTALASI JUMPER FTM (OLT-FEEDER)"
        ];
        const wbs: WbsRow[] = [];
        TASK_CATEGORIES.forEach((folder) => {
          const folderReports = (reports || []).filter(r => r.kategori === folder);
          if (folderReports.length === 0) return;
          wbs.push({
            id: `folder-${folder}`,
            activity: folder,
            volume: 0,
            uom: "",
            target: 0,
            progress: 0,
            a_start: "-",
            a_finish: "-",
            isHeader: true,
            evidence: []
          });
          const designators = Array.from(new Set(folderReports.map(r => r.sub_kategori)));
          let totalProgress = 0;
          let childCount = 0;
          let minFolder: Date | null = null;
          let maxFolder: Date | null = null;
          designators.forEach((desig) => {
            const desigReports = folderReports.filter(r => r.sub_kategori === desig);
            const accum = desigReports.reduce((s, r) => s + Number(r.volume_input || 0), 0);
            const { target, uom } = getTargetAndUom(desig);
            const progress = Math.min(100, Math.round((accum / target) * 100));
            let minDate: Date | null = null;
            let maxDate: Date | null = null;
            if (desigReports.length) {
              const times = desigReports.map(r => new Date(r.reported_at).getTime());
              minDate = new Date(Math.min(...times));
              maxDate = new Date(Math.max(...times));
              if (!minFolder || minDate < minFolder) minFolder = minDate;
              if (!maxFolder || maxDate > maxFolder) maxFolder = maxDate;
            }
            const fmt = (d: Date | null) => {
              if (!d || isNaN(d.getTime())) return "-";
              return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
            };
            const evidence: { file_id: string; message_id: number | null }[] = [];
            desigReports.forEach(r => { if (Array.isArray(r.evidence_files)) evidence.push(...r.evidence_files); });
            wbs.push({
              id: `desig-${folder}-${desig}`,
              activity: desig,
              volume: accum,
              uom,
              target,
              progress,
              a_start: fmt(minDate),
              a_finish: progress >= 100 ? fmt(maxDate) : "-",
              isHeader: false,
              evidence
            });
            totalProgress += progress;
            childCount++;
          });
          const idx = wbs.findIndex(r => r.id === `folder-${folder}`);
          if (idx !== -1 && childCount > 0) {
            wbs[idx].progress = Math.round(totalProgress / childCount);
            const fmt = (d: Date | null) => {
              if (!d || isNaN(d.getTime())) return "-";
              return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
            };
            wbs[idx].a_start = fmt(minFolder);
            if (wbs[idx].progress >= 100) wbs[idx].a_finish = fmt(maxFolder);
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

  const overallProgress = (() => {
    const headers = wbsData.filter(r => r.isHeader && r.progress > 0);
    return headers.length ? Math.round(headers.reduce((s, r) => s + r.progress, 0) / headers.length) : 0;
  })();

  const refreshProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    setProjects(data || []);
    if (data && data.length) setSelectedProject(data[0]);
  };

  const handleProjectUpdate = async (updated: Project) => {
    if (!user) return;
    const { id, created_at, created_by, ...updateData } = updated as any;
    const { error } = await supabase.from('projects').update(updateData).eq('id', id);
    if (!error) await refreshProjects();
    else console.error('Error updating project', error);
  };

  const handleDownloadDocx = async () => {
    if (!selectedProject || !selectedRow || selectedRow.evidence.length === 0) return;
    setGeneratingDocx(true);
    try {
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, ImageRun, WidthType, AlignmentType, TextRun, BorderStyle } = await import("docx");

      const fetchImageBuffer = async (fileId: string): Promise<ArrayBuffer | null> => {
        try {
          const res = await fetch(`/api/evident-image?file_id=${fileId}`);
          if (!res.ok) return null;
          return await res.arrayBuffer();
        } catch (err) {
          console.error("Error fetching image buffer:", err);
          return null;
        }
      };

      const infoRows = [
        ["Proyek", selectedProject.proyek],
        ["No Kontrak", selectedProject.no_kontrak],
        ["Nomor PO", selectedProject.nomor_po],
        ["Lokasi", selectedProject.area_lokasi],
        ["Site Operation", selectedProject.site_operation],
        ["Pelaksana", selectedProject.pelaksana]
      ].map(([label, val]) => {
        return new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
              width: { size: 30, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: ":" })] })],
              width: { size: 5, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: val || "-" })] })],
              width: { size: 65, type: WidthType.PERCENTAGE },
            }),
          ],
        });
      });

      const infoTable = new Table({
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
        },
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: infoRows,
      });

      const titleTable = new Table({
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
        },
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `"${selectedRow.activity.toUpperCase()}"`,
                        bold: true,
                        underline: {},
                        size: 32, // 16pt
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
        ],
      });

      const docChildren: any[] = [
        titleTable,
        infoTable,
        new Paragraph({ text: "", spacing: { before: 150, after: 150 } }),
      ];

      const evidence = selectedRow.evidence;

      for (let i = 0; i < evidence.length; i += 2) {
        const cells: any[] = [];

        // Column 1: Image 1
        const photo1 = evidence[i];
        const buffer1 = await fetchImageBuffer(photo1.file_id);
        if (buffer1) {
          cells.push(new TableCell({
            children: [
              new Paragraph({
                children: [
                  new ImageRun({
                    data: new Uint8Array(buffer1),
                    type: "jpg",
                    transformation: { width: 241, height: 328 },
                  })
                ],
                alignment: AlignmentType.CENTER,
              })
            ],
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
            },
            margins: {
              top: 120,
              bottom: 120,
              left: 120,
              right: 120,
            }
          }));
        }

        // Column 2: Spacer Column (4% width, no borders)
        cells.push(new TableCell({
          children: [new Paragraph("")],
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          }
        }));

        // Column 3: Image 2
        if (i + 1 < evidence.length) {
          const photo2 = evidence[i + 1];
          const buffer2 = await fetchImageBuffer(photo2.file_id);
          if (buffer2) {
            cells.push(new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: new Uint8Array(buffer2),
                      type: "jpg",
                      transformation: { width: 241, height: 328 },
                    })
                  ],
                  alignment: AlignmentType.CENTER,
                })
              ],
              width: { size: 48, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
                bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
                left: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
                right: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
              },
              margins: {
                top: 120,
                bottom: 120,
                left: 120,
                right: 120,
              }
            }));
          }
        } else {
          // Empty cell on the right to preserve 3-column structure, NO borders
          cells.push(new TableCell({
            children: [new Paragraph("")],
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            }
          }));
        }

        const rowTable = new Table({
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: cells })
          ],
        });

        docChildren.push(rowTable);

        // Add spacing paragraph after the row table, except for the last row
        if (i + 2 < evidence.length) {
          docChildren.push(new Paragraph({ text: "", spacing: { before: 100, after: 100 } }));
        }
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: docChildren,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_${selectedProject.proyek}_${selectedRow.activity}.docx`.replace(/\s+/g, '_');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating docx:", err);
      alert("Gagal mengunduh dokumen Word.");
    } finally {
      setGeneratingDocx(false);
    }
  };

  if (authLoading) return <div className="spinner" />;

  if (!user) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>🔐 Silakan Login</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Masuk dengan Telegram ID Anda untuk mengakses dashboard.</p>
          <a href="/login" style={{ background: 'var(--accent)', color: 'white', padding: '10px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">📊 Project Hub</div>
        <div style={{ padding: '16px 20px 8px 20px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Daftar Proyek</div>
        {isAdmin && (
          <button onClick={() => setShowAddModal(true)} className="add-project-btn" style={{ margin: '0 20px 12px', padding: '6px 12px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Tambah Proyek</button>
        )}
        {projects.length === 0 ? (
          <div style={{ padding: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Belum ada proyek aktif.</div>
        ) : (
          <ul className="sidebar-project-list">
            {projects.map(proj => (
              <li key={proj.id}
                className={`project-item ${selectedProject?.id === proj.id ? 'active' : ''}`}
                onClick={() => setSelectedProject(proj)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span className="project-title">{proj.proyek}</span>
                  <span className="project-mitra">{proj.nama_mitra}</span>
                </div>
                {isAdmin && (
                  <button onClick={(e) => { e.stopPropagation(); setEditProject(proj); }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '1rem' }}>✏️</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-navbar">
          <div className="nav-links">
            <a href="/">Dashboard</a>
            <a href="#">Laporan Kerja</a>
            <a href="#">Informasi Kontrak</a>
            {isAdmin && <a href="/admin">Manajemen User</a>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>👤 {user.full_name}</span>
            <button onClick={async () => {
              const { logout } = await import('@/app/context/AuthContext').then(m => ({ logout: null as unknown as () => void }));
            }} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>
              <a href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Logout</a>
            </button>
          </div>
        </header>

        <div className="content-area">
          {loading && wbsData.length === 0 ? (
            <div className="spinner" />
          ) : !selectedProject ? (
            <div className="empty-state" style={{ marginTop: '40px' }}>
              <h3>👋 Selamat Datang di Project Hub Dashboard</h3>
              <p style={{ marginTop: '8px' }}>Gunakan Telegram Bot Anda untuk melakukan registrasi user baru dan mendaftarkan proyek kerja pertama Anda.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '20px', background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '8px', color: 'var(--text-primary)' }}>🏗️ Proyek: {selectedProject.proyek}</h2>
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
                  <span style={{ fontWeight: '600', color: 'var(--accent)' }}>Progress Kumulatif Aktual: {overallProgress}%</span>
                  <span style={{ fontSize: '0.85rem' }}>Target Rencana: 100.00%</span>
                </div>
              </div>

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
                      <tr><td colSpan={7} className="empty-state">Belum ada laporan progress masuk untuk proyek ini.</td></tr>
                    ) : (
                      wbsData.map(row => {
                        const isSelected = selectedRow?.id === row.id;
                        const hasEvidence = !row.isHeader && row.evidence.length > 0;
                        return (
                          <tr key={row.id}
                            className={`${row.isHeader ? 'header-row' : 'clickable-row'} ${isSelected ? 'active-row' : ''}`}
                            onClick={() => { if (!row.isHeader) setSelectedRow(row); }}>
                            <td style={{ paddingLeft: row.isHeader ? '16px' : '36px' }}>
                              {row.isHeader ? `📁 ${row.activity}` : `📄 ${row.activity}`}
                              {hasEvidence && (
                                <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>📸 {row.evidence.length}</span>
                              )}
                            </td>
                            <td className="center">{row.isHeader ? '-' : row.volume}</td>
                            <td className="center">{row.isHeader ? '-' : row.uom}</td>
                            <td className="center">{row.isHeader ? '-' : row.target}</td>
                            <td>
                              <div style={{ marginBottom: '2px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{row.progress}%</span>
                              </div>
                              <div className="progress-wrapper"><div className="progress-fill" style={{ width: `${row.progress}%` }} /></div>
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
                <div className="photo-panel-header">🖼️ Bukti Dokumentasi (Evident)</div>
                {!selectedRow ? (
                  <div className="empty-state">Pilih baris pekerjaan di tabel untuk menampilkan foto.</div>
                ) : selectedRow.evidence.length === 0 ? (
                  <div className="empty-state">Pekerjaan <b>{selectedRow.activity}</b> belum memiliki bukti foto.</div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Bukti foto untuk: <b>{selectedRow.activity}</b> ({selectedRow.evidence.length})
                      </span>
                      <button onClick={handleDownloadDocx} disabled={generatingDocx} style={{
                        padding: '6px 12px',
                        background: 'var(--accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {generatingDocx ? '⏳ Membuat Word...' : '📝 Unduh Word (.docx)'}
                      </button>
                    </div>
                    <div className="photo-grid">
                      {selectedRow.evidence.map((photo, i) => (
                        <div key={i} className="photo-card"><img src={`/api/evident-image?file_id=${photo.file_id}`} alt={`Evident ${i + 1}`} loading="lazy" /></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {editProject && (
                <EditProjectModal isOpen={!!editProject} onClose={() => setEditProject(null)} project={editProject} onProjectUpdated={handleProjectUpdate} />
              )}
            </>
          )}
        </div>
      </main>

      {isAdmin && (
        <AddProjectModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onProjectAdded={refreshProjects} />
      )}
    </div>
  );
}
