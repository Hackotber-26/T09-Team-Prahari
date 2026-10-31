
import { formatSeverity, severityClass } from '../utils/reportDisplay'

export default function RecentReports({ reports = [] }) {
  const recentReports = [...reports]
    .sort(
      (a, b) =>
        new Date(b.reportedAt || b.createdAt || 0) -
        new Date(a.reportedAt || a.createdAt || 0)
    )
    .slice(0, 5)

  return (
    <section className="recent-reports">
      <div className="panel-heading">
        <div>
          <h2>Recent Reports</h2>
          <p>Latest community-submitted incidents</p>
        </div>
      </div>

      {recentReports.length === 0 ? (
        <div className="panel-empty">
          No reports have been submitted yet.
        </div>
      ) : (
        <div className="recent-list">
          {recentReports.map((report, index) => {
            const severity = formatSeverity(
              report.priority || report.severityLevel || report.severity
            )
            const priorityClass =
              severity.toLowerCase() === 'critical'
                ? 'critical'
                : severityClass(severity)

            return (
              <article
                className="recent-report-item"
                key={report.id || report._id || index}
                style={{
                  animationDelay: `${index * 90}ms`,
                }}
              >
                <div className="recent-report-marker">
                  {index + 1}
                </div>

                <div className="recent-report-details">
                  <h3>
                    {report.location ||
                      report.locationName ||
                      'Unknown location'}
                  </h3>

                  <p>
                    {report.incidentType ||
                      report.type ||
                      'Near-miss incident'}
                  </p>
                </div>

                <span
                  className={`priority-badge priority-${priorityClass}`}
                >
                  {severity}
                </span>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
