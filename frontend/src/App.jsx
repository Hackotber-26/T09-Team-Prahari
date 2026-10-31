import { useCallback, useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import Hotspots from './pages/Hotspots'
import About from './pages/About'
import ReportIncident from './pages/ReportIncident'
import { ApiError, createReport, getHotspots, getReports } from './services/api'
import './styles/app.css'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [reports, setReports] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [loading, setLoading] = useState(true)
  const [backendError, setBackendError] = useState('')
  const [submissionNotice, setSubmissionNotice] = useState(false)

  const requestData = useCallback(async () => {
    const [nextReports, hotspotResponse] = await Promise.all([
      getReports(),
      getHotspots(),
    ])
    return { nextReports, nextHotspots: hotspotResponse.hotspots }
  }, [])

  useEffect(() => {
    let active = true
    requestData()
      .then(({ nextReports, nextHotspots }) => {
        if (!active) return
        setReports(nextReports)
        setHotspots(nextHotspots)
        setBackendError('')
      })
      .catch((error) => {
        if (active) {
          setBackendError(
            error instanceof ApiError
              ? error.message
              : 'Unable to load reports from the backend.',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [requestData])

  const loadData = useCallback(async () => {
    setLoading(true)
    setBackendError('')
    try {
      const { nextReports, nextHotspots } = await requestData()
      setReports(nextReports)
      setHotspots(nextHotspots)
    } catch (error) {
      setBackendError(
        error instanceof ApiError
          ? error.message
          : 'Unable to load reports from the backend.',
      )
    } finally {
      setLoading(false)
    }
  }, [requestData])

  useEffect(() => {
    if (!submissionNotice) return undefined
    const timeoutId = setTimeout(() => setSubmissionNotice(false), 6000)
    return () => clearTimeout(timeoutId)
  }, [submissionNotice])

  const addReport = useCallback(async (report, onUploadProgress) => {
    const savedReport = await createReport(report, report.submissionKey, onUploadProgress)
    setReports((current) => [
      savedReport,
      ...current.filter((item) => item.id !== savedReport.id),
    ])
    setSubmissionNotice(true)
    setPage('dashboard')

    try {
      const hotspotResponse = await getHotspots()
      setHotspots(hotspotResponse.hotspots)
      setBackendError('')
    } catch (error) {
      setBackendError(
        `Report ${savedReport.id} was saved, but hotspot data could not be refreshed: ${error.message}`,
      )
    }
    return savedReport
  }, [])

  const pages = {
    dashboard: (
      <Dashboard
        reports={reports}
        hotspots={hotspots}
        loading={loading}
        backendError={backendError}
        submissionNotice={submissionNotice}
      />
    ),
    reports: <Reports reports={reports} loading={loading} backendError={backendError} />,
    hotspots: <Hotspots hotspots={hotspots} reports={reports} loading={loading} backendError={backendError} />,
    about: <About />,
    report: <ReportIncident onAdd={addReport} />,
  }

  return (
    <div className="app-shell">
      <Navbar page={page} />
      <div className="app-body">
        <Sidebar active={page} onSelect={setPage} />
        <main className="app-main">
          {loading && <p className="backend-status" role="status">Loading reports and hotspot data…</p>}
          {backendError && (
            <p className="backend-status error" role="alert">
              {backendError}
              <button type="button" className="text-action" onClick={() => void loadData()}>
                Retry connection
              </button>
            </p>
          )}
          {pages[page]}
        </main>
      </div>
    </div>
  )
}
