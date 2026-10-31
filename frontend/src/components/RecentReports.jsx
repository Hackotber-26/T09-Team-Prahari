import { recentReports } from '../data/sample'

const sevColor = { Low: '#94A3B8', Medium: '#F59E0B', High: '#EF4444', Critical: '#EF4444' }

export default function RecentReports() {
  return (
    <div className="card">
      <h2 className="card-title">Recent Reports</h2>
      <ul className="report-list">
        {recentReports.map((r) => (
          <li key={r.id} className="report-item">
            <div>
              <div className="report-location">{r.location}</div>
              <div className="report-meta">{r.type} · {r.time}</div>
            </div>
            <span className="sev-badge" style={{ color: sevColor[r.severity], borderColor: sevColor[r.severity] }}>
              {r.severity}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
