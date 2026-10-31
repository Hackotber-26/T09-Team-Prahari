
import { useState, useCallback, useEffect } from 'react'

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
  // Current navigation page
  const [page, setPage] = useState('dashboard')

  // Shared report data
  // Dashboard, Reports and MapView use this same state.
  const [reports, setReports] = useState(() =>
    mapReports.map((report, index) => ({
      ...report,
      id: report.id ?? index + 1,
    }))
  )
  const [submissionNotice, setSubmissionNotice] = useState(false)

  useEffect(() => {
    if (!submissionNotice) return undefined
    const timeoutId = setTimeout(() => setSubmissionNotice(false), 6000)
    return () => clearTimeout(timeoutId)
  }, [submissionNotice])

  // Add a newly submitted report
  const addReport = useCallback((report) => {
    setReports((previousReports) => {
      const nextId =
        previousReports.reduce(
          (highest, current) =>
            Math.max(highest, Number(current.id) || 0),
          0
        ) + 1

      return [
        ...previousReports,
        {
          ...report,
          id: nextId,
        },
      ]
    })

    // Navigate to dashboard after submission
    setSubmissionNotice(true)
    setPage('dashboard')
  }, [])

  // Navigation handler
  const handlePageChange = useCallback((nextPage) => {
    setPage(nextPage)
  }, [])

  // Render the selected page
  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard reports={reports} submissionNotice={submissionNotice} />

      case 'reports':
        return <Reports reports={reports} />

      case 'hotspots':
        return <Hotspots />

      case 'about':
        return <About />

      case 'report':
        return <ReportIncident onAdd={addReport} />

      default:
        return <Dashboard reports={reports} />
    }
  }

  return (
    <div className="app-shell">
      <Navbar page={page} />

      <div className="app-body">
        <Sidebar
          active={page}
          onSelect={handlePageChange}
        />

        <main className="app-main">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
