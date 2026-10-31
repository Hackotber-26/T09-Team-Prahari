import { useMemo, useState } from 'react'
import { MapPin, Search, ShieldAlert, Target } from 'lucide-react'

const filters = ['All priorities', 'High', 'Medium', 'Low']

export default function Hotspots({ hotspots = [], reports = [], loading = false }) {
  const [query, setQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('All priorities')
  const [selectedId, setSelectedId] = useState(null)
  const reportsById = useMemo(
    () => new Map(reports.map((report) => [report.id, report])),
    [reports],
  )

  const filteredHotspots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return hotspots.map((hotspot) => {
      const associatedReport = reportsById.get(hotspot.report_ids[0])
      return {
        ...hotspot,
        id: hotspot.cluster_id,
        name: associatedReport?.location || (hotspot.is_noise ? 'Isolated report' : `Cluster ${hotspot.cluster_id + 1}`),
        priority: hotspot.risk_classification,
        reports: hotspot.report_count,
        score: hotspot.risk_score,
        lat: hotspot.latitude,
        lng: hotspot.longitude,
        action: hotspot.is_noise
          ? 'This report is isolated from other reports within the current clustering radius.'
          : 'Review the reports and consider a local road-safety assessment.',
      }
    }).filter((hotspot) => {
      const matchesPriority = priorityFilter === 'All priorities' || hotspot.priority === priorityFilter
      const matchesQuery =
        !normalizedQuery ||
        hotspot.name.toLowerCase().includes(normalizedQuery) ||
        hotspot.action.toLowerCase().includes(normalizedQuery)

      return matchesPriority && matchesQuery
    })
  }, [hotspots, reportsById, priorityFilter, query])

  const selectedHotspot =
    filteredHotspots.find((hotspot) => hotspot.id === selectedId) ?? filteredHotspots[0]

  return (
    <section className="page hotspot-page">
      <div className="hotspot-heading">
        <div>
          <p className="hotspot-eyebrow">Risk intelligence</p>
          <h1>Hotspot Explorer</h1>
          <p className="hotspot-intro">Explore reported risk clusters and their recommended actions.</p>
        </div>
        <div className="hotspot-zone-count">
          <MapPin size={17} />
          <span>{hotspots.filter((hotspot) => !hotspot.is_noise).length} monitored clusters</span>
        </div>
      </div>

      <div className="hotspot-explorer">
        <div className="hotspot-browser">
          <div className="hotspot-toolbar">
            <label className="hotspot-search">
              <Search size={17} aria-hidden="true" />
              <span className="visually-hidden">Search hotspots</span>
              <input
                type="search"
                placeholder="Search locations or actions"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="hotspot-filters" aria-label="Filter hotspots by priority">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={priorityFilter === filter ? 'hotspot-filter active' : 'hotspot-filter'}
                  aria-pressed={priorityFilter === filter}
                  onClick={() => setPriorityFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="hotspot-results-label">
            <span>Hotspots and isolated reports</span>
            <span>{filteredHotspots.length} results</span>
          </div>

          {loading && filteredHotspots.length === 0 ? (
            <div className="hotspot-empty" role="status">Loading hotspot data…</div>
          ) : filteredHotspots.length > 0 ? (
            <ul className="hotspot-explorer-list">
              {filteredHotspots.map((hotspot) => (
                <li key={hotspot.id}>
                  <button
                    type="button"
                    className={`hotspot-card${selectedHotspot?.id === hotspot.id ? ' selected' : ''}`}
                    aria-pressed={selectedHotspot?.id === hotspot.id}
                    onClick={() => setSelectedId(hotspot.id)}
                  >
                    <span className={`hotspot-priority-dot ${hotspot.priority.toLowerCase()}`} />
                    <span className="hotspot-card-content">
                      <span className="hotspot-card-title">{hotspot.name}</span>
                      <span className="hotspot-card-meta">
                        <span>{hotspot.reports} reports</span>
                        <span className="hotspot-card-separator">·</span>
                        <span>Risk score {hotspot.score}</span>
                      </span>
                    </span>
                    <span className={`hotspot-priority ${hotspot.priority.toLowerCase()}`}>
                      {hotspot.priority}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="hotspot-empty">
              <Search size={22} />
              <strong>No hotspots found</strong>
              <span>Try another search or priority filter.</span>
            </div>
          )}
        </div>

        {selectedHotspot && (
          <aside className="hotspot-detail" aria-live="polite">
            <div className="hotspot-detail-heading">
              <div className="hotspot-detail-icon">
                <Target size={19} />
              </div>
              <span className={`hotspot-priority ${selectedHotspot.priority.toLowerCase()}`}>
                {selectedHotspot.priority} priority
              </span>
            </div>

            <h2>{selectedHotspot.name}</h2>
            <p className="hotspot-detail-description">
              {selectedHotspot.is_noise ? 'This report is outside a detected cluster' : 'Near-miss activity cluster'}
            </p>

            <div className="hotspot-detail-location">
              <MapPin size={16} />
              <span>
                {selectedHotspot.lat.toFixed(4)}, {selectedHotspot.lng.toFixed(4)}
              </span>
            </div>

            <div className="hotspot-metrics">
              <div className="hotspot-metric">
                <span className="hotspot-metric-label">Reported incidents</span>
                <strong>{selectedHotspot.reports}</strong>
              </div>
              <div className="hotspot-metrics">
                <div className="hotspot-metric">
                  <span className="hotspot-metric-label">Average severity</span>
                  <strong>{selectedHotspot.average_severity.toFixed(1)} / 5</strong>
                </div>
                <div className="hotspot-metric">
                  <span className="hotspot-metric-label">Evidence available</span>
                  <strong>{Math.round(selectedHotspot.evidence_ratio * 100)}%</strong>
                </div>
              </div>
              <div className="hotspot-metric">
                <span className="hotspot-metric-label">Risk score</span>
                <strong>{selectedHotspot.score}<small> / 100</small></strong>
              </div>
            </div>

            <div className="hotspot-risk">
              <div className="hotspot-risk-label">
                <span>Risk level</span>
                <span>{selectedHotspot.score}%</span>
              </div>
              <div
                className="hotspot-risk-track"
                role="progressbar"
                aria-label="Risk score"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={selectedHotspot.score}
              >
                <span
                  className={`hotspot-risk-value ${selectedHotspot.priority.toLowerCase()}`}
                  style={{ width: `${selectedHotspot.score}%` }}
                />
              </div>
            </div>

            <div className="hotspot-recommendation">
              <div className="hotspot-recommendation-heading">
                <ShieldAlert size={17} />
                <strong>Recommended action</strong>
              </div>
              <p className="risk-disclaimer">
                Experimental prioritization score only—not a validated accident probability or official safety standard.
              </p>
              <p>{selectedHotspot.action}</p>
            </div>
          </aside>
        )}
      </div>
    </section>
  )
}
