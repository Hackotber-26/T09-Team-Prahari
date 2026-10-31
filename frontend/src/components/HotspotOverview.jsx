
export default function HotspotOverview({ reports = [], hotspots = [] }) {
  const clusters = hotspots.filter((hotspot) => !hotspot.is_noise)
  const reportById = new Map(reports.map((report) => [report.id, report]))

  return (
    <section className="hotspot-overview">
      <div className="panel-heading">
        <div>
          <h2>Hotspot Overview</h2>
          <p>Clusters grouped from reported locations</p>
        </div>
      </div>

      {clusters.length === 0 ? (
        <div className="panel-empty">
          Hotspot information will appear after reports are submitted.
        </div>
      ) : (
        <div className="hotspot-list">
          {clusters.map((hotspot, index) => {
            const firstReport = reportById.get(hotspot.report_ids[0])
            return (
            <article
              className="hotspot-item"
              key={hotspot.cluster_id}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              <div className="hotspot-rank">
                {String(index + 1).padStart(2, '0')}
              </div>

              <div className="hotspot-info">
                <h3>
                  {firstReport?.location ||
                    firstReport?.locationName ||
                    'Reported location'}
                </h3>
                <p>{hotspot.report_count} reports · Risk {hotspot.risk_score}/100</p>
              </div>

              <span className={`prio-badge ${hotspot.risk_classification.toLowerCase()}`}>
                {hotspot.risk_classification}
              </span>

              <div className="hotspot-count">
                {hotspot.report_count}
              </div>
            </article>
          )})}
        </div>
      )}
    </section>
  )
}
