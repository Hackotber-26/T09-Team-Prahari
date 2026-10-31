
import { useEffect, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getReportCoordinates } from '../utils/reportGeo'
import { formatSeverity } from '../utils/reportDisplay'

const priorityColors = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#22c55e',
  Unclassified: '#3b82f6',
}

function MapBounds({ locations }) {
  const map = useMap()

  useEffect(() => {
    if (!locations.length) return

    const bounds = L.latLngBounds(
      locations.map((location) => [
        location.latitude,
        location.longitude,
      ])
    )

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }, [locations, map])

  return null
}

export default function MapView({ reports = [], hotspots = [] }) {
  const clusteredHotspots = useMemo(
    () => hotspots.filter((hotspot) => !hotspot.is_noise),
    [hotspots],
  )
  const boundsLocations = useMemo(
    () => [
      ...reports.map(getReportCoordinates).filter(Boolean),
      ...hotspots.map(({ latitude, longitude }) => ({ latitude, longitude })),
    ],
    [hotspots, reports],
  )

  const defaultCenter = [12.9716, 77.5946]

  const center = boundsLocations.length
    ? [boundsLocations[0].latitude, boundsLocations[0].longitude]
    : defaultCenter

  return (
    <div className="map-wrapper">
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#38bdf8' }} />
          Report
        </div>
        {Object.entries(priorityColors)
          .filter(([priority]) => priority !== 'Unclassified')
          .map(([priority, color]) => (
            <div className="legend-item" key={priority}>
              <span
                className="legend-dot"
                style={{ backgroundColor: color }}
              />
              {priority}
            </div>
          ))}
      </div>

      {!reports.length && (
        <p className="map-empty" role="status">
          No reports with valid locations yet. Add a report to see it on the map.
        </p>
      )}
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        className="incident-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBounds locations={boundsLocations} />

        {clusteredHotspots.map((hotspot) => {
          const color = priorityColors[hotspot.risk_classification] || priorityColors.Unclassified
          const associatedReports = reports.filter((report) =>
            hotspot.report_ids.includes(report.id)
          )

          return (
            <CircleMarker
              key={`hotspot-${hotspot.cluster_id}`}
              center={[hotspot.latitude, hotspot.longitude]}
              radius={Math.min(10 + hotspot.report_count, 20)}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.35,
                weight: 2,
              }}
            >
              <Popup>
                <div className="map-popup">
                  <h3>
                    {associatedReports[0]?.location ||
                      associatedReports[0]?.locationName ||
                      'Reported location'}
                  </h3>
                  <p><strong>Reports:</strong> {hotspot.report_count}</p>
                  <p><strong>Risk:</strong> {hotspot.risk_classification} · {hotspot.risk_score}/100</p>
                  <p><strong>Average severity:</strong> {hotspot.average_severity.toFixed(1)}/5</p>
                  <p><strong>Incident types:</strong></p>
                  <ul>
                    {[...new Set(associatedReports.map((report) =>
                      report.incidentType || report.type || 'Other'
                    ))].map((type) => <li key={type}>{type}</li>)}
                  </ul>
                  <p><strong>Report IDs:</strong> {hotspot.report_ids.join(', ')}</p>
                  <p><strong>Coordinates:</strong> {hotspot.latitude.toFixed(5)}, {hotspot.longitude.toFixed(5)}</p>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

        {reports.map((report) => {
          const point = getReportCoordinates(report)
          const coordinates = point ? [point.latitude, point.longitude] : null
          const reportHotspot = hotspots.find((item) => item.report_ids.includes(report.id))
          if (!coordinates) return null

          return (
            <CircleMarker
              key={`report-${report.id}`}
              center={coordinates}
              radius={4}
              pathOptions={{
                color: '#0b1220',
                fillColor: '#38bdf8',
                fillOpacity: 1,
                weight: 2,
              }}
            >
              <Popup>
                <div className="map-popup">
                  <h3>{report.location || report.locationName || 'Near-miss report'}</h3>
                  <p><strong>Type:</strong> {report.incidentType || report.type || 'Other'}</p>
                  <p><strong>Severity:</strong> {formatSeverity(report.severityLevel || report.severity)}</p>
                  <p><strong>Risk class:</strong> {reportHotspot?.is_noise
                    ? `${reportHotspot.risk_classification} · isolated`
                    : reportHotspot?.risk_classification || 'Not clustered'}</p>
                  {report.description && <p>{report.description}</p>}
                  {report.attachments?.length > 0 && (
                    <div className="map-popup-evidence">
                      <strong>Evidence files ({report.attachments.length})</strong>
                      {report.attachments.map((attachment) => (
                        <a
                          href={attachment.url}
                          key={attachment.id}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {attachment.name}
                        </a>
                      ))}
                    </div>
                  )}
                  <p><strong>Coordinates:</strong> {coordinates[0].toFixed(5)}, {coordinates[1].toFixed(5)}</p>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
