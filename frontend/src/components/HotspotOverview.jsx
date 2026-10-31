
import { groupReportsByProximity } from '../utils/reportGeo'

export default function HotspotOverview({ reports = [] }) {
  const hotspots = groupReportsByProximity(reports)

  return (
    <section className="hotspot-overview">
      <div className="panel-heading">
        <div>
          <h2>Hotspot Overview</h2>
          <p>Clusters grouped from reported locations</p>
        </div>
      </div>

      {hotspots.length === 0 ? (
        <div className="panel-empty">
          Hotspot information will appear after reports are submitted.
        </div>
      ) : (
        <div className="hotspot-list">
          {hotspots.map((hotspot, index) => (
            <article
              className="hotspot-item"
              key={hotspot.id}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              <div className="hotspot-rank">
                {String(index + 1).padStart(2, '0')}
              </div>

              <div className="hotspot-info">
                <h3>
                  {hotspot.reports[0].location ||
                    hotspot.reports[0].locationName ||
                    'Reported location'}
                </h3>
                <p>
                  {hotspot.reports.length}{' '}
                  {hotspot.reports.length === 1 ? 'report' : 'reports'}
                </p>
              </div>

              <span className={`prio-badge ${hotspot.priority.toLowerCase()}`}>
                {hotspot.priority}
              </span>

              <div className="hotspot-count">
                {hotspot.reports.length}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
