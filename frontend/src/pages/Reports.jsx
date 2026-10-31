import { MapPin, ClipboardList } from 'lucide-react'
import { formatRelativeTime, formatSeverity, severityClass } from '../utils/reportDisplay'

export default function Reports({ reports = [] }) {
  const sortedReports = [...reports].sort(
    (a, b) => Number(b.reportedAt || 0) - Number(a.reportedAt || 0),
  )

  return (
    <section className="page reports-page">
      <div className="reports-heading">
        <div>
          <p className="reports-eyebrow">Community observations</p>
          <h1>Reports</h1>
          <p className="reports-intro">Near-miss incidents submitted for road-safety awareness.</p>
        </div>
        <span className="reports-count">{reports.length} {reports.length === 1 ? 'report' : 'reports'}</span>
      </div>

      {sortedReports.length ? (
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
              <div className="report-card-footer">
                <span>{Number(report.lat).toFixed(4)}, {Number(report.lng).toFixed(4)}</span>
                <time>
                  {formatRelativeTime(report.reportedAt)}
                </time>
              </div>
            </li>
          ))}
        </ul>
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
