import { useMemo, useState } from 'react'
import { MapPin, ClipboardList, Paperclip, Search, Sparkles } from 'lucide-react'
import { formatRelativeTime, formatSeverity, severityClass } from '../utils/reportDisplay'
import { getSimilarReports } from '../services/api'

export default function Reports({ reports = [], loading = false }) {
  const [query, setQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('All severities')
  const [similarity, setSimilarity] = useState({})
  const sortedReports = useMemo(() => [...reports]
    .filter((report) => {
      const normalizedQuery = query.trim().toLowerCase()
      const matchesQuery =
        !normalizedQuery ||
        [report.location, report.locationName, report.type, report.description]
          .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
      const severity = formatSeverity(report.severity)
      const matchesSeverity =
        severityFilter === 'All severities' ||
        severity.toLowerCase() === severityFilter.toLowerCase()
      return matchesQuery && matchesSeverity
    })
    .sort(
    (a, b) => Number(b.reportedAt || 0) - Number(a.reportedAt || 0),
    ), [query, reports, severityFilter])

  const findSimilar = async (reportId) => {
    setSimilarity((current) => ({ ...current, [reportId]: { loading: true } }))
    try {
      const result = await getSimilarReports(reportId)
      setSimilarity((current) => ({ ...current, [reportId]: { result } }))
    } catch (error) {
      setSimilarity((current) => ({
        ...current,
        [reportId]: { error: error.message || 'Semantic analysis is unavailable.' },
      }))
    }
  }

  return (
    <section className="page reports-page">
      <div className="reports-heading">
        <div>
          <p className="reports-eyebrow">Community observations</p>
          <h1>Reports</h1>
          <p className="reports-intro">Near-miss incidents submitted for road-safety awareness.</p>
        </div>
        <span className="reports-count">{sortedReports.length} of {reports.length} reports</span>
      </div>

      {reports.length > 0 && (
        <div className="reports-toolbar">
          <label className="reports-search">
            <Search size={16} aria-hidden="true" />
            <span className="visually-hidden">Search reports</span>
            <input type="search" placeholder="Search reports by location or incident" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="reports-severity-filter">
            <span className="visually-hidden">Filter by severity</span>
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
              <option>All severities</option>
              {['Critical', 'High', 'Moderate', 'Minor', 'Low', 'Very High', 'Very Low'].map((severity) => <option key={severity}>{severity}</option>)}
            </select>
          </label>
        </div>
      )}

      {loading && reports.length === 0 ? (
        <div className="empty-state reports-empty" role="status">Loading reports…</div>
      ) : reports.length > 0 && sortedReports.length ? (
        <ul className="reports-grid">
          {sortedReports.map((report) => (
            <li className="report-card" key={report.id}>
              <div className="report-card-heading">
                <div className="report-card-title">
                  <MapPin size={17} aria-hidden="true" />
                  <h2>{report.location}</h2>
                </div>
                <span className={`sev-badge ${severityClass(report.severity)}`}>
                  {formatSeverity(report.severity)}
                </span>
              </div>
              <p className="report-card-type">{report.type}</p>
              {report.description && <p className="report-card-description">{report.description}</p>}
              {(report.attachments?.length || report.evidenceMetadata?.length || 0) > 0 && (
                <div className="report-evidence-list" aria-label="Attached evidence">
                  <Paperclip size={13} aria-hidden="true" />
                  <span>{report.attachments?.length || report.evidenceMetadata?.length} evidence file(s)</span>
                </div>
              )}
              {report.attachments?.map((attachment) => (
                <div className="report-evidence-item" key={attachment.id}>
                  {attachment.type.startsWith('image/') && (
                    <a href={attachment.url} rel="noreferrer" target="_blank">
                      <img
                        className="report-evidence-preview"
                        src={attachment.url}
                        alt={`Evidence: ${attachment.name}`}
                        loading="lazy"
                      />
                    </a>
                  )}
                  <a
                    className="report-evidence-download"
                    href={attachment.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {attachment.name} · {attachment.type}
                  </a>
                </div>
              ))}
              <button
                type="button"
                className="text-action"
                onClick={() => void findSimilar(report.id)}
                disabled={similarity[report.id]?.loading}
              >
                <Sparkles size={14} aria-hidden="true" />
                {similarity[report.id]?.loading ? 'Comparing descriptions…' : 'Find similar reports'}
              </button>
              {similarity[report.id]?.error && (
                <p className="form-message error" role="alert">{similarity[report.id].error}</p>
              )}
              {similarity[report.id]?.result && (
                <div className="semantic-results" aria-live="polite">
                  <strong>{similarity[report.id].result.matches.length} similar description(s)</strong>
                  {similarity[report.id].result.matches.map((match) => (
                    <p key={match.report_id}>
                      Report #{match.report_id} · {(match.similarity_score * 100).toFixed(1)}% · {match.description}
                    </p>
                  ))}
                  <small>{similarity[report.id].result.notice}</small>
                </div>
              )}
              <div className="report-card-footer">
                <span>{Number.isFinite(Number(report.lat)) && Number.isFinite(Number(report.lng)) ? `${Number(report.lat).toFixed(4)}, ${Number(report.lng).toFixed(4)}` : 'Location coordinates unavailable'}</span>
                <time>
                  {formatRelativeTime(report.reportedAt)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      ) : reports.length > 0 ? (
        <div className="empty-state reports-empty">
          <Search size={28} aria-hidden="true" />
          <h2>No matching reports</h2>
          <p>Adjust your search or severity filter to see other community reports.</p>
        </div>
      ) : (
        <div className="empty-state reports-empty">
          <ClipboardList size={28} aria-hidden="true" />
          <h2>No reports yet</h2>
          <p>Submit a near-miss report to start building a picture of local road-safety concerns.</p>
        </div>
      )}
    </section>
  )
}
