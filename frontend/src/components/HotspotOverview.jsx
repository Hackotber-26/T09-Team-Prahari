import { hotspots } from '../data/sample'

const prioColor = { Medium: '#F59E0B', High: '#F59E0B', Critical: '#EF4444' }

export default function HotspotOverview() {
  return (
    <div className="card">
      <h2 className="card-title">Hotspot Overview</h2>
      <ul className="hotspot-list">
        {hotspots.map((h) => (
          <li key={h.id} className="hotspot-item">
            <div>
              <div className="hotspot-location">{h.location}</div>
              <div className="hotspot-meta">{h.reports} reports · score {h.score}</div>
            </div>
            <span className="prio-badge" style={{ color: prioColor[h.priority], borderColor: prioColor[h.priority] }}>
              {h.priority}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
