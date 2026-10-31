import { useState } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import Hotspots from './pages/Hotspots'
import About from './pages/About'
import ReportIncident from './pages/ReportIncident'
import { mapReports } from './data/mapSample'
import './styles/app.css'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [reports, setReports] = useState(mapReports.map((r) => ({ ...r })))

  const addReport = (report) => setReports((prev) => [...prev, { ...report, id: Date.now() }])

  const pages = {
    dashboard: <Dashboard reports={reports} />,
    reports: <Reports reports={reports} />,
    hotspots: <Hotspots />,
    about: <About />,
    report: <ReportIncident onAdd={addReport} />,
  }

  return (
    <div className="app-shell">
      <Navbar page={page} />
      <div className="app-body">
        <Sidebar active={page} onSelect={setPage} />
        <main className="app-main">{pages[page]}</main>
      </div>
    </div>
  )
}
