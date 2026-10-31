import { useMemo, useState } from 'react'
import { MapPin, Search, ShieldAlert, Target } from 'lucide-react'
import { mapHotspots } from '../data/mapSample'

const filters = ['All priorities', 'High', 'Medium', 'Low']

export default function Hotspots() {
  const [query, setQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('All priorities')
  const [selectedId, setSelectedId] = useState(mapHotspots[0]?.id)

  const filteredHotspots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return mapHotspots.filter((hotspot) => {
      const matchesPriority = priorityFilter === 'All priorities' || hotspot.priority === priorityFilter
      const matchesQuery =
        !normalizedQuery ||
        hotspot.name.toLowerCase().includes(normalizedQuery) ||
        hotspot.action.toLowerCase().includes(normalizedQuery)

      return matchesPriority && matchesQuery
    })
  }, [priorityFilter, query])

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
          <span>{mapHotspots.length} monitored zones</span>
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
            <span>Risk zones</span>
            <span>{filteredHotspots.length} results</span>
          </div>

          {filteredHotspots.length > 0 ? (
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
            <p className="hotspot-detail-description">Near-miss activity cluster</p>

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
              <p>{selectedHotspot.action}</p>
            </div>
          </aside>
        )}
      </div>
    </section>
  )
}
