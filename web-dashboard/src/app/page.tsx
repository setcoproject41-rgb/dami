"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  isMainHeader?: boolean;
  evidence: { file_id: string; message_id: number | null }[];
}

interface ChartDataPoint {
  label: string;
  value: number;
  color: string;
}

interface TimelinePoint {
  date: string;
  count: number;
}

function getTargetAndUom(designator: string) {
  if (designator.startsWith('PU-')) return { target: 10, uom: 'pcs' };
  if (designator.startsWith('BC-') || designator.startsWith('DD-')) return { target: 1000, uom: 'meter' };
  return { target: 1, uom: 'Lot' };
}

// ─────────────────────────────────────────────
// SVG BAR CHART COMPONENT
// ─────────────────────────────────────────────
function BarChart({ data, height = 180 }: { data: ChartDataPoint[]; height?: number }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = Math.max(20, Math.floor(520 / data.length) - 8);
  return (
    <svg viewBox={`0 0 560 ${height + 50}`} style={{ width: '100%', overflow: 'visible' }}>
      {/* Y-axis guide lines */}
      {[0, 25, 50, 75, 100].map(pct => {
        const y = height - (pct / 100) * height;
        return (
          <g key={pct}>
            <line x1="30" y1={y} x2="550" y2={y} stroke="#30363d" strokeWidth="1" strokeDasharray="4,4" />
            <text x="24" y={y + 4} fill="#8b949e" fontSize="9" textAnchor="end">{pct}%</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const barH = Math.max(2, (d.value / maxVal) * height);
        const x = 34 + i * (barW + 8);
        const y = height - barH;
        return (
          <g key={i}>
            <defs>
              <linearGradient id={`bg${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={d.color} stopOpacity="1" />
                <stop offset="100%" stopColor={d.color} stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <rect x={x} y={y} width={barW} height={barH} rx="4" fill={`url(#bg${i})`} />
            <text x={x + barW / 2} y={y - 5} fill={d.color} fontSize="9" textAnchor="middle" fontWeight="bold">{d.value}%</text>
            <text
              x={x + barW / 2} y={height + 16}
              fill="#8b949e" fontSize="8" textAnchor="middle"
              transform={`rotate(-30,${x + barW / 2},${height + 16})`}
            >
              {d.label.length > 12 ? d.label.slice(0, 12) + '…' : d.label}
            </text>
          </g>
        );
      })}
      {/* X axis line */}
      <line x1="30" y1={height} x2="550" y2={height} stroke="#30363d" strokeWidth="1.5" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// SVG LINE CHART COMPONENT
// ─────────────────────────────────────────────
function LineChart({ data, height = 140 }: { data: TimelinePoint[]; height?: number }) {
  if (data.length < 2) return (
    <div style={{ color: '#8b949e', fontSize: '0.8rem', padding: '20px', textAlign: 'center' }}>
      Belum cukup data untuk menampilkan trend.
    </div>
  );
  const W = 520, PAD = 30;
  const maxY = Math.max(...data.map(d => d.count), 1);
  const pts = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD),
    y: height - ((d.count / maxY) * (height - 20)) - 10,
    ...d,
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = `M${pts[0].x},${height} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},${height} Z`;
  return (
    <svg viewBox={`0 0 ${W + 10} ${height + 40}`} style={{ width: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 50, 100].map(pct => {
        const y = height - (pct / 100) * (height - 20) - 10;
        return <line key={pct} x1={PAD} y1={y} x2={W} y2={y} stroke="#30363d" strokeWidth="1" strokeDasharray="3,3" />;
      })}
      <path d={areaPath} fill="url(#lineArea)" />
      <polyline points={polyline} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#06b6d4" stroke="#0d1117" strokeWidth="1.5" />
      ))}
      {pts.filter((_, i) => i % Math.ceil(pts.length / 6) === 0 || i === pts.length - 1).map((p, i) => (
        <text key={i} x={p.x} y={height + 18} fill="#8b949e" fontSize="8" textAnchor="middle">{p.date}</text>
      ))}
      <line x1={PAD} y1={height} x2={W} y2={height} stroke="#30363d" strokeWidth="1.5" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function Home() {
  const { user, loading: authLoading } = useAuth();
  // State for project grouping by mitra (partner)
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectGroups, setProjectGroups] = useState<Record<string, Project[]>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [wbsData, setWbsData] = useState<WbsRow[]>([]);
  const [rawReports, setRawReports] = useState<any[]>([]);
  const [selectedRow, setSelectedRow] = useState<WbsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'laporan'>('dashboard');
const [isAllProjects, setIsAllProjects] = useState<boolean>(true);

  const isAdmin = !!user && (user.is_admin || user.telegram_id === '81358099');
  // Helper to toggle folder expansion
  const toggleGroup = (mitra: string) => {
    setExpandedGroups(prev => ({ ...prev, [mitra]: !prev[mitra] }));
  };

  // Fetch projects on mount
  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
  setProjects(data);
  if (!isAllProjects) setSelectedProject(data[0]);
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

// Group projects by mitra
useEffect(() => {
  const groups: Record<string, Project[]> = {};
  projects.forEach(p => {
    const key = p.nama_mitra || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  setProjectGroups(groups);
}, [projects]);

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
        let query = supabase.from('progress_reports').select('*').order('reported_at', { ascending: true });
if (activeProject) {
  query = query.eq('project_id', activeProject.id);
}
const { data: reports, error } = await query;
        if (error) throw error;
        setRawReports(reports || []);

        // Fetch activity structure from ACTIVITY.csv via API
        let activityStructure: Record<string, Record<string, any[]>> = {};
        const uomMap: Record<string, string> = {}; // point (trimmed) -> uom
        try {
          const actRes = await fetch('/api/activities');
          if (actRes.ok) {
            activityStructure = await actRes.json();
            Object.values(activityStructure).forEach((subCats: any) => {
              Object.values(subCats).forEach((points: any) => {
                if (!Array.isArray(points)) return;
                points.forEach((item: any) => {
                  if (item && typeof item === 'object' && item.point) {
                    uomMap[item.point.trim()] = (item.uom || 'Lot').trim();
                  }
                });
              });
            });
          }
        } catch (e) {
          console.warn('Failed to fetch activity structure, using fallback', e);
        }

        // Fallback UoM lookup by designator name pattern (mirrors ACTIVITY.csv)
        const getUomFallback = (designator: string): string => {
          const d = designator.toUpperCase().trim();
          if (d.startsWith('EXCAVATION') || d.startsWith('BCTR') || d.startsWith('BD-SK') ||
              d.startsWith('DD-') || d.includes('ADSS') || d.startsWith('HDPE') ||
              d.startsWith('PIPE') || d.startsWith('RP-')) return 'meter';
          if (d.startsWith('FS-OF-SM') || d.startsWith('NN-')) return 'titik';
          if (d.startsWith('NOK') || d.startsWith('LOT') || d.includes('BERKAS') ||
              d.includes('ATP') || d.includes('KML') || d.includes('BOQ') ||
              d.includes('ACAD') || d.includes('BARM') || d.includes('INVOICE') ||
              d.includes('LABEL')) return 'lot';
          if (d.startsWith('ITEM') || d.includes('PUNCHLIST')) return 'Item';
          if (d.startsWith('NP-') || d.startsWith('MH-') || d.startsWith('HH-') ||
              d.startsWith('FDT-') || d.startsWith('FAT-') || d.startsWith('JC-') ||
              d.startsWith('ACC-') || d.startsWith('OTB-') || d.includes('BASE TRAY') ||
              d.startsWith('NP-CB')) return 'pcs';
          return 'Lot';
        };

        const fmt = (d: Date | null) => {
          if (!d || isNaN(d.getTime())) return "-";
          return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        const wbs: WbsRow[] = [];

        if (Object.keys(activityStructure).length > 0) {
          Object.entries(activityStructure).forEach(([mainCat, subCats]) => {
            const mainHeaderIdx = wbs.length;
            wbs.push({
              id: `main-${mainCat}`, activity: mainCat,
              volume: 0, uom: "", target: 0, progress: 0,
              a_start: "-", a_finish: "-",
              isHeader: true, isMainHeader: true, evidence: []
            });
            let mainTotalProgress = 0, mainChildCount = 0;
            let mainMinDate: Date | null = null, mainMaxDate: Date | null = null;

            Object.entries(subCats).forEach(([subCat]) => {
              const folderReports = (reports || []).filter((r: any) => r.kategori === subCat);
              if (folderReports.length === 0) return;

              const subHeaderIdx = wbs.length;
              wbs.push({
                id: `folder-${subCat}`, activity: subCat,
                volume: 0, uom: "", target: 0, progress: 0,
                a_start: "-", a_finish: "-",
                isHeader: true, isMainHeader: false, evidence: []
              });

              const designators = Array.from(new Set(folderReports.map((r: any) => r.sub_kategori)));
              let subTotalProgress = 0, subChildCount = 0;
              let subMinDate: Date | null = null, subMaxDate: Date | null = null;

              designators.forEach((desig) => {
                const desigReports = folderReports.filter((r: any) => r.sub_kategori === desig);
                const accum = desigReports.reduce((s: number, r: any) => s + Number(r.volume_input || 0), 0);
                const uom = uomMap[desig.trim()] || desigReports[0]?.satuan || getUomFallback(desig as string);
                const { target } = getTargetAndUom(desig as string);
                const progress = Math.min(100, Math.round((accum / target) * 100));
                let minDate: Date | null = null, maxDate: Date | null = null;
                if (desigReports.length) {
                  const times = desigReports.map((r: any) => new Date(r.reported_at).getTime());
                  minDate = new Date(Math.min(...times));
                  maxDate = new Date(Math.max(...times));
                  if (!subMinDate || minDate < subMinDate) subMinDate = minDate;
                  if (!subMaxDate || maxDate > subMaxDate) subMaxDate = maxDate;
                  if (!mainMinDate || minDate < mainMinDate) mainMinDate = minDate;
                  if (!mainMaxDate || maxDate > mainMaxDate) mainMaxDate = maxDate;
                }
                const evidence: { file_id: string; message_id: number | null }[] = [];
                desigReports.forEach((r: any) => { if (Array.isArray(r.evidence_files)) evidence.push(...r.evidence_files); });
                wbs.push({
                  id: `desig-${subCat}-${desig}`, activity: desig as string,
                  volume: accum, uom, target, progress,
                  a_start: fmt(minDate),
                  a_finish: progress >= 100 ? fmt(maxDate) : "-",
                  isHeader: false, evidence
                });
                subTotalProgress += progress;
                subChildCount++;
              });

              if (subChildCount > 0) {
                wbs[subHeaderIdx].progress = Math.round(subTotalProgress / subChildCount);
                wbs[subHeaderIdx].a_start = fmt(subMinDate);
                if (wbs[subHeaderIdx].progress >= 100) wbs[subHeaderIdx].a_finish = fmt(subMaxDate);
                mainTotalProgress += wbs[subHeaderIdx].progress;
                mainChildCount++;
              }
            });

            if (mainChildCount > 0) {
              wbs[mainHeaderIdx].progress = Math.round(mainTotalProgress / mainChildCount);
              wbs[mainHeaderIdx].a_start = fmt(mainMinDate);
              if (wbs[mainHeaderIdx].progress >= 100) wbs[mainHeaderIdx].a_finish = fmt(mainMaxDate);
            }
          });
        } else {
          const TASK_CATEGORIES = Array.from(new Set((reports || []).map((r: any) => r.kategori)));
          TASK_CATEGORIES.forEach((folder) => {
            const folderReports = (reports || []).filter((r: any) => r.kategori === folder);
            if (folderReports.length === 0) return;
            const folderHeaderIdx = wbs.length;
            wbs.push({
              id: `folder-${folder}`, activity: folder as string,
              volume: 0, uom: "", target: 0, progress: 0,
              a_start: "-", a_finish: "-",
              isHeader: true, isMainHeader: true, evidence: []
            });
            const designators = Array.from(new Set(folderReports.map((r: any) => r.sub_kategori)));
            let totalProgress = 0, childCount = 0;
            let minFolder: Date | null = null, maxFolder: Date | null = null;
            designators.forEach((desig) => {
              const desigReports = folderReports.filter((r: any) => r.sub_kategori === desig);
              const accum = desigReports.reduce((s: number, r: any) => s + Number(r.volume_input || 0), 0);
              const uom = uomMap[desig.trim()] || desigReports[0]?.satuan || getUomFallback(desig as string);
              const { target } = getTargetAndUom(desig as string);
              const progress = Math.min(100, Math.round((accum / target) * 100));
              let minDate: Date | null = null, maxDate: Date | null = null;
              if (desigReports.length) {
                const times = desigReports.map((r: any) => new Date(r.reported_at).getTime());
                minDate = new Date(Math.min(...times));
                maxDate = new Date(Math.max(...times));
                if (!minFolder || minDate < minFolder) minFolder = minDate;
                if (!maxFolder || maxDate > maxFolder) maxFolder = maxDate;
              }
              const evidence: { file_id: string; message_id: number | null }[] = [];
              desigReports.forEach((r: any) => { if (Array.isArray(r.evidence_files)) evidence.push(...r.evidence_files); });
              wbs.push({
                id: `desig-${folder}-${desig}`, activity: desig as string,
                volume: accum, uom, target, progress,
                a_start: (() => { if (!minDate || isNaN(minDate.getTime())) return "-"; return minDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }); })(),
                a_finish: progress >= 100 ? (() => { if (!maxDate || isNaN(maxDate!.getTime())) return "-"; return maxDate!.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }); })() : "-",
                isHeader: false, evidence
              });
              totalProgress += progress; childCount++;
            });
            if (childCount > 0) {
              wbs[folderHeaderIdx].progress = Math.round(totalProgress / childCount);
              const fmtLocal = (d: Date | null) => { if (!d || isNaN(d.getTime())) return "-"; return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
              wbs[folderHeaderIdx].a_start = fmtLocal(minFolder);
              if (wbs[folderHeaderIdx].progress >= 100) wbs[folderHeaderIdx].a_finish = fmtLocal(maxFolder);
            }
          });
        }
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
    const mainHeaders = wbsData.filter(r => r.isMainHeader && r.progress > 0);
    return mainHeaders.length ? Math.round(mainHeaders.reduce((s, r) => s + r.progress, 0) / mainHeaders.length) : 0;
  })();

  const refreshProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    setProjects(data || []);
    if (data && data.length) setSelectedProject(data[0]);
  };
const handleProjectDelete = async (proj: Project) => {
  if (!user) return;
  if (!window.confirm(`Apakah Anda yakin ingin menghapus proyek ${proj.proyek}?`)) return;
  const { error } = await supabase.from('projects').delete().eq('id', proj.id);
  if (error) {
    console.error('Error deleting project', error);
  } else {
    await refreshProjects();
    if (selectedProject?.id === proj.id) setSelectedProject(null);
  }
};

  const handleProjectUpdate = async (updated: Project) => {
    if (!user) return;
    const { id, created_at, created_by, ...updateData } = updated as any;
    const { error } = await supabase.from('projects').update(updateData).eq('id', id);
    if (!error) await refreshProjects();
    else console.error('Error updating project', error);
  };

  // ─── Analytics derived data ───
  const chartBarData: ChartDataPoint[] = wbsData
    .filter(r => r.isMainHeader)
    .map((r, i) => ({
      label: r.activity,
      value: r.progress,
      color: ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'][i % 6],
    }));

  const timelineData: TimelinePoint[] = (() => {
    const counts: Record<string, number> = {};
    rawReports.forEach(r => {
      const d = new Date(r.reported_at);
      const key = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  })();

  const totalEvidenceCount = rawReports.reduce((s, r) => s + (Array.isArray(r.evidence_files) ? r.evidence_files.length : 0), 0);
  const activeSubCategories = new Set(rawReports.map(r => r.kategori)).size;

  // ─── DOCX download ───
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
        } catch { return null; }
      };
      const infoRows = [
        ["Proyek", selectedProject.proyek], ["No Kontrak", selectedProject.no_kontrak],
        ["Nomor PO", selectedProject.nomor_po], ["Lokasi", selectedProject.area_lokasi],
        ["Site Operation", selectedProject.site_operation], ["Pelaksana", selectedProject.pelaksana]
      ].map(([label, val]) => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ":" })] })], width: { size: 5, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: val || "-" })] })], width: { size: 65, type: WidthType.PERCENTAGE } }),
        ],
      }));
      const noBorder = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } };
      const infoTable = new Table({ borders: { ...noBorder, bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" } }, width: { size: 100, type: WidthType.PERCENTAGE }, rows: infoRows });
      const titleTable = new Table({
        borders: noBorder,
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
                        size: 32, // 16pt
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
              }),
            ],
          }),
        ],
      });
      const docChildren: any[] = [titleTable, infoTable, new Paragraph({ text: "", spacing: { before: 150, after: 150 } })];
      const evidence = selectedRow.evidence;
      for (let i = 0; i < evidence.length; i += 2) {
        const cells: any[] = [];
        const buf1 = await fetchImageBuffer(evidence[i].file_id);
        if (buf1) {
          const imgBorder = { top: { style: BorderStyle.SINGLE, size: 8, color: "000000" }, bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" }, left: { style: BorderStyle.SINGLE, size: 8, color: "000000" }, right: { style: BorderStyle.SINGLE, size: 8, color: "000000" } };
          const margins = { top: 120, bottom: 120, left: 120, right: 120 };
          cells.push(new TableCell({ children: [new Paragraph({ children: [new ImageRun({ data: new Uint8Array(buf1), type: "jpg", transformation: { width: 241, height: 328 } })], alignment: AlignmentType.CENTER })], width: { size: 48, type: WidthType.PERCENTAGE }, borders: imgBorder, margins }));
          cells.push(new TableCell({ children: [new Paragraph("")], width: { size: 4, type: WidthType.PERCENTAGE }, borders: noBorder }));
          if (i + 1 < evidence.length) {
            const buf2 = await fetchImageBuffer(evidence[i + 1].file_id);
            if (buf2) cells.push(new TableCell({ children: [new Paragraph({ children: [new ImageRun({ data: new Uint8Array(buf2), type: "jpg", transformation: { width: 241, height: 328 } })], alignment: AlignmentType.CENTER })], width: { size: 48, type: WidthType.PERCENTAGE }, borders: imgBorder, margins }));
          } else {
            cells.push(new TableCell({ children: [new Paragraph("")], width: { size: 48, type: WidthType.PERCENTAGE }, borders: noBorder }));
          }
          docChildren.push(new Table({ borders: noBorder, width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: cells })] }));
          if (i + 2 < evidence.length) docChildren.push(new Paragraph({ text: "", spacing: { before: 100, after: 100 } }));
        }
      }
      const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
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

  // ─── DASHBOARD ANALYTICS VIEW ───
  const DashboardView = () => (
    <div className="analytics-container">
      {/* Project header */}
      {selectedProject && (
        <div className="analytics-project-header">
          <div className="analytics-project-title">
            <span style={{ fontSize: '1.4rem' }}>🏗️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#e6edf3' }}>Proyek: {selectedProject.proyek}</div>
              <div style={{ fontSize: '0.8rem', color: '#8b949e', marginTop: '2px' }}>
                📍 {selectedProject.area_lokasi} &nbsp;|&nbsp; 👷 {selectedProject.pelaksana}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '32px', fontSize: '0.82rem', color: '#8b949e', flexWrap: 'wrap' }}>
            <div><span style={{ color: '#30363d' }}>📄</span> <b style={{ color: '#e6edf3' }}>No Kontrak:</b> {selectedProject.no_kontrak}</div>
            <div><span style={{ color: '#30363d' }}>🔢</span> <b style={{ color: '#e6edf3' }}>No PO:</b> {selectedProject.nomor_po}</div>
            <div><span style={{ color: '#30363d' }}>🏢</span> <b style={{ color: '#e6edf3' }}>Mitra:</b> {selectedProject.nama_mitra}</div>
            <div><span style={{ color: '#30363d' }}>⚙️</span> <b style={{ color: '#e6edf3' }}>Site Ops:</b> {selectedProject.site_operation}</div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="analytics-cards">
        {[
          { icon: '📊', label: 'Progress Kumulatif', value: `${overallProgress}%`, sub: 'dari target 100%', color: '#10b981' },
          { icon: '📂', label: 'Kategori Aktif', value: `${activeSubCategories}`, sub: 'sub-kategori dilaporkan', color: '#06b6d4' },
          { icon: '📋', label: 'Total Laporan', value: `${rawReports.length}`, sub: 'entri masuk', color: '#f59e0b' },
          { icon: '📸', label: 'Total Evident', value: `${totalEvidenceCount}`, sub: 'foto dokumentasi', color: '#8b5cf6' },
        ].map((card, i) => (
          <div key={i} className="analytics-card">
            <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{card.icon}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: '0.78rem', color: '#8b949e', marginTop: '4px' }}>{card.label}</div>
            <div style={{ fontSize: '0.7rem', color: '#484f58', marginTop: '2px' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="analytics-charts-row">
        {/* Bar chart */}
        <div className="analytics-chart-panel">
          <div className="analytics-chart-title">📊 Progress per Kategori Utama</div>
          {chartBarData.length === 0 ? (
            <div style={{ color: '#8b949e', fontSize: '0.85rem', padding: '40px', textAlign: 'center' }}>Belum ada data laporan.</div>
          ) : (
            <BarChart data={chartBarData} height={160} />
          )}
        </div>
        {/* Line chart */}
        <div className="analytics-chart-panel">
          <div className="analytics-chart-title">📈 Trend Laporan Harian</div>
          <LineChart data={timelineData} height={140} />
        </div>
      </div>

      {/* Summary table */}
      <div className="analytics-table-panel">
        <div className="analytics-chart-title" style={{ marginBottom: '12px' }}>📋 Ringkasan Progress per Kategori</div>
        <table className="analytics-summary-table">
          <thead>
            <tr>
              <th>Kategori Utama</th>
              <th>Sub-Kategori Aktif</th>
              <th>Total Laporan</th>
              <th>Total Evident</th>
              <th style={{ width: '220px' }}>Completion Rate</th>
            </tr>
          </thead>
          <tbody>
            {wbsData.filter(r => r.isMainHeader).map(row => {
              const subRows = wbsData.filter(r => r.isHeader && !r.isMainHeader && r.id.startsWith(`folder-`) && (() => {
                const mIdx = wbsData.findIndex(x => x.id === row.id);
                const rIdx = wbsData.findIndex(x => x.id === r.id);
                return rIdx > mIdx;
              })());
              const mainReports = rawReports.filter(r2 =>
                wbsData.filter(x => x.isHeader && !x.isMainHeader).some(sub => sub.activity === r2.kategori && wbsData.findIndex(x => x.id === `main-${row.activity}`) < wbsData.findIndex(x => x.id === `folder-${sub.activity}`))
              );
              const evidCount = mainReports.reduce((s, r2) => s + (Array.isArray(r2.evidence_files) ? r2.evidence_files.length : 0), 0);
              return (
                <tr key={row.id}>
                  <td><b style={{ color: '#10b981' }}>{row.activity}</b></td>
                  <td style={{ textAlign: 'center', color: '#e6edf3' }}>{row.progress > 0 ? wbsData.filter(x => !x.isHeader && x.id.includes(row.activity.slice(0, 8))).length : '-'}</td>
                  <td style={{ textAlign: 'center', color: '#e6edf3' }}>{rawReports.filter(r2 => wbsData.some(x => !x.isHeader && x.activity === r2.sub_kategori && wbsData.findIndex(m => m.id === row.id) < wbsData.findIndex(x2 => x2.id === `desig-${r2.kategori}-${r2.sub_kategori}`))).length || (row.progress > 0 ? rawReports.length : 0)}</td>
                  <td style={{ textAlign: 'center', color: '#e6edf3' }}>{row.progress > 0 ? totalEvidenceCount : 0}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: '#21262d', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${row.progress}%`, background: row.progress >= 100 ? '#10b981' : row.progress >= 50 ? '#f59e0b' : '#06b6d4', borderRadius: '3px', transition: 'width 0.6s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#e6edf3', minWidth: '32px', textAlign: 'right', fontWeight: 700 }}>{row.progress}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {wbsData.filter(r => r.isMainHeader).length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#8b949e', padding: '32px' }}>Belum ada laporan masuk untuk proyek ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── LAPORAN KERJA VIEW ───
  const LaporanView = () => (
    <>
      {selectedProject && (
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
      )}

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
                const isMainHdr = row.isMainHeader === true;
                const isSubHdr = row.isHeader && !isMainHdr;
                return (
                  <tr key={row.id}
                    className={`${isMainHdr ? 'main-header-row' : isSubHdr ? 'header-row' : 'clickable-row'} ${isSelected ? 'active-row' : ''}`}
                    onClick={() => { if (!row.isHeader) setSelectedRow(row); }}>
                    <td style={{ paddingLeft: isMainHdr ? '10px' : isSubHdr ? '24px' : '48px', fontWeight: isMainHdr ? '800' : isSubHdr ? '600' : '400' }}>
                      {isMainHdr ? `🗂️ ${row.activity}` : isSubHdr ? `📁 ${row.activity}` : `📄 ${row.activity}`}
                      {hasEvidence && (
                        <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>📸 {row.evidence.length}</span>
                      )}
                    </td>
                    <td className="center">{row.isHeader ? '-' : row.volume}</td>
                    <td className="center">{row.isHeader ? '-' : row.uom}</td>
                    <td className="center">{row.isHeader ? '-' : row.target}</td>
                    <td>
                      {row.isHeader && row.progress === 0 ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>-</span>
                      ) : (
                        <>
                          <div style={{ marginBottom: '2px' }}><span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{row.progress}%</span></div>
                          <div className="progress-wrapper"><div className="progress-fill" style={{ width: `${row.progress}%` }} /></div>
                        </>
                      )}
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
              <button onClick={handleDownloadDocx} disabled={generatingDocx} style={{ padding: '6px 12px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
    </>
  );

  // ─── MAIN RENDER ───
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
      {/* All Projects */}
      <li
        className={`project-item ${isAllProjects ? 'active' : ''}`}
        onClick={() => { setIsAllProjects(true); setSelectedProject(null); }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <div>
          <span className="project-title">All Projects</span>
        </div>
      </li>
      {/* Grouped by Mitra */}
      {Object.entries(projectGroups).map(([mitra, projs]) => (
        <li key={mitra}>
          <div
            className="group-header"
            onClick={() => toggleGroup(mitra)}
            style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0', color: 'var(--text-primary)', fontWeight: 600 }}>
            <span>{mitra}</span>
            <span>{expandedGroups[mitra] ? '▾' : '▸'}</span>
          </div>
          {expandedGroups[mitra] && (
            <ul className="group-project-list">
              {projs.map(p => (
                <li
                  key={p.id}
                  className={`project-item ${selectedProject?.id === p.id && !isAllProjects ? 'active' : ''}`}
                  onClick={() => { setIsAllProjects(false); setSelectedProject(p); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '12px' }}>
                  <div>
                    <span className="project-title">{p.proyek}</span>
                    <span className="project-mitra">{p.nama_mitra}</span>
                  </div>
                  {isAdmin && (
                    <> 
                      <button onClick={(e) => { e.stopPropagation(); setEditProject(p); }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '1rem' }}>✏️</button>
                      <button onClick={(e) => { e.stopPropagation(); handleProjectDelete(p); }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#f44336', fontSize: '1rem' }}>✖️</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
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
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`nav-tab-btn ${activeTab === 'dashboard' ? 'nav-tab-active' : ''}`}>
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('laporan')}
              className={`nav-tab-btn ${activeTab === 'laporan' ? 'nav-tab-active' : ''}`}>
              Laporan Kerja
            </button>
            <a href="#" style={{ pointerEvents: 'none', opacity: 0.5 }}>Informasi Kontrak</a>
            {isAdmin && <a href="/admin">Manajemen User</a>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>👤 {user.full_name}</span>
            <button style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>
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
              {activeTab === 'dashboard' ? <DashboardView /> : <LaporanView />}
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
