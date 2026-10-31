
import { mapHotspots } from '../data/mapSample'

export default function HotspotOverview() {
  const hotspots = mapHotspots

  return (
    <section className="hotspot-overview">
      <div className="panel-heading">
        <div>
          <h2>Hotspot Overview</h2>
          <p>Sample risk clusters shown on the map</p>
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
                <h3>{hotspot.name}</h3>
                <p>
                  Risk score {hotspot.score}
                </p>
              </div>

              <span className={`prio-badge ${hotspot.priority.toLowerCase()}`}>
                {hotspot.priority}
              </span>

              <div className="hotspot-count">
                {hotspot.reports}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
