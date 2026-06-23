import React from 'react';

export default function Home() {
  const dummyData = [
    {
      id: 1,
      activity: "1. Preparing",
      bobot: 20,
      volume: 164,
      uom: "Lot",
      pro_percent: 100,
      isHeader: true,
    },
    {
      id: 2,
      activity: "1.1. Kick Off Meeting",
      bobot: 2,
      volume: 1,
      uom: "Lot",
      pro_percent: 100,
      a_start: "29/12/2025",
      a_finish: "29/12/2025",
      isHeader: false,
    },
    {
      id: 3,
      activity: "1.2. Survey",
      bobot: 5,
      volume: 1,
      uom: "Lot",
      pro_percent: 100,
      a_start: "29/12/2025",
      a_finish: "29/12/2025",
      isHeader: false,
    },
    {
      id: 4,
      activity: "2. Material Delivery",
      bobot: 30,
      volume: 94,
      uom: "Lot",
      pro_percent: 94,
      isHeader: true,
    },
    {
      id: 5,
      activity: "2.1. Fabrikasi Material",
      bobot: 8,
      volume: 2,
      uom: "Lot",
      pro_percent: 100,
      a_start: "09/03/2026",
      a_finish: "09/03/2026",
      isHeader: false,
    },
    {
      id: 6,
      activity: "3. Instalasi & Test Comm",
      bobot: 40,
      volume: 71,
      uom: "Lot",
      pro_percent: 71,
      isHeader: true,
    },
    {
      id: 7,
      activity: "3.1. Penggalian Tanah",
      bobot: 6,
      volume: 1,
      uom: "meter",
      pro_percent: 100,
      a_start: "01/04/2026",
      a_finish: "10/06/2026",
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
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Progress Actual: 15.00% | Target: 90.00%</p>
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
