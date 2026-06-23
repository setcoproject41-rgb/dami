import React from 'react';

export default function Home() {
  const dummyData = [
    {
      id: 1,
      activity: "1. Persiapan",
      bobot: 10,
      volume: 1,
      uom: "Lot",
      pro_percent: 50,
      isHeader: true,
    },
    {
      id: 2,
      activity: "1.1. Aanwijzing",
      bobot: 5,
      volume: 1,
      uom: "Lot",
      pro_percent: 100,
      a_start: "20/06/2026",
      a_finish: "20/06/2026",
      isHeader: false,
    },
    {
      id: 3,
      activity: "1.2. Perijinan",
      bobot: 5,
      volume: 1,
      uom: "Lot",
      pro_percent: 0,
      a_start: "-",
      a_finish: "-",
      isHeader: false,
    },
    {
      id: 4,
      activity: "2. Material Delivery",
      bobot: 20,
      volume: 1,
      uom: "Lot",
      pro_percent: 0,
      isHeader: true,
    },
    {
      id: 5,
      activity: "2.1. Material",
      bobot: 20,
      volume: 1,
      uom: "Lot",
      pro_percent: 0,
      a_start: "-",
      a_finish: "-",
      isHeader: false,
    },
    {
      id: 6,
      activity: "3. Instalasi",
      bobot: 50,
      volume: 1,
      uom: "Lot",
      pro_percent: 15,
      isHeader: true,
    },
    {
      id: 7,
      activity: "3.1. BC-TR (Galian) / Boring Manual",
      bobot: 5,
      volume: 500,
      uom: "meter",
      pro_percent: 50,
      a_start: "21/06/2026",
      a_finish: "-",
      isHeader: false,
    },
    {
      id: 8,
      activity: "3.2. Pemasangan Subduct/HDPE/Pipa",
      bobot: 5,
      volume: 500,
      uom: "meter",
      pro_percent: 0,
      a_start: "-",
      a_finish: "-",
      isHeader: false,
    },
    {
      id: 9,
      activity: "3.3. Pemasangan Tiang 7m/9m",
      bobot: 5,
      volume: 10,
      uom: "pcs",
      pro_percent: 100,
      a_start: "22/06/2026",
      a_finish: "23/06/2026",
      isHeader: false,
    },
    {
      id: 10,
      activity: "4. Finish Instalation",
      bobot: 10,
      volume: 1,
      uom: "Lot",
      pro_percent: 0,
      isHeader: true,
    },
    {
      id: 11,
      activity: "4.1. Perapihan & Labelling",
      bobot: 5,
      volume: 1,
      uom: "Lot",
      pro_percent: 0,
      a_start: "-",
      a_finish: "-",
      isHeader: false,
    },
    {
      id: 12,
      activity: "4.2. ATP",
      bobot: 5,
      volume: 1,
      uom: "Lot",
      pro_percent: 0,
      a_start: "-",
      a_finish: "-",
      isHeader: false,
    },
    {
      id: 13,
      activity: "5. Closing",
      bobot: 10,
      volume: 1,
      uom: "Lot",
      pro_percent: 0,
      isHeader: true,
    },
    {
      id: 14,
      activity: "5.1. Uji Terima",
      bobot: 5,
      volume: 1,
      uom: "Lot",
      pro_percent: 0,
      a_start: "-",
      a_finish: "-",
      isHeader: false,
    },
    {
      id: 15,
      activity: "5.2. Go Live",
      bobot: 5,
      volume: 1,
      uom: "Lot",
      pro_percent: 0,
      a_start: "-",
      a_finish: "-",
      isHeader: false,
    }
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          📊 Project Hub
        </div>
        <ul className="sidebar-menu">
          <li className="menu-item">Supply Control</li>
          <li className="menu-item">Projects on Customer</li>
          <li className="menu-item active">Construction</li>
          <li className="menu-item sub">Initiation</li>
          <li className="menu-item sub">Planning</li>
          <li className="menu-item sub active">Executing</li>
          <li className="menu-item sub">Controlling</li>
          <li className="menu-item sub">Closing</li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="nav-links">
            <a>Home</a>
            <a>Solusi</a>
            <a>Help Desk</a>
            <a>Contact Us</a>
          </div>
          <div style={{color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer'}}>LOGOUT</div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Project Dashboard: MAGELANG - TEMANGGUNG</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Progress Actual: 15.00% | Target: 100.00%</p>
          </div>

          <div className="wbs-table-container">
            <table className="wbs-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th className="center">Bobot</th>
                  <th className="center">Volume</th>
                  <th className="center">UoM</th>
                  <th>Progress Actual</th>
                  <th>A-Start</th>
                  <th>A-Finish</th>
                </tr>
              </thead>
              <tbody>
                {dummyData.map((row) => (
                  <tr key={row.id} className={row.isHeader ? "header-row" : ""}>
                    <td style={{ paddingLeft: row.isHeader ? '16px' : '32px' }}>
                      {row.activity}
                    </td>
                    <td className="center">{row.bobot}</td>
                    <td className="center">{row.volume}</td>
                    <td className="center">{row.uom}</td>
                    <td>
                      <div className="flex items-center justify-between">
                        <span className="progress-text">{row.pro_percent}%</span>
                      </div>
                      <div className="progress-wrapper">
                        <div className="progress-fill" style={{ width: `${row.pro_percent}%` }}></div>
                      </div>
                    </td>
                    <td>{row.a_start || '-'}</td>
                    <td>{row.a_finish || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
