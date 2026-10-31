
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
import { getReportCoordinates, groupReportsByProximity } from '../utils/reportGeo'
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

export default function MapView({ reports = [] }) {
  const hotspots = useMemo(
    () => groupReportsByProximity(reports),
    [reports]
  )
  const boundsLocations = useMemo(
    () => hotspots.map(({ latitude, longitude }) => ({ latitude, longitude })),
    [hotspots]
  )

  const defaultCenter = [20, 0]

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

      {!hotspots.length && (
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

        {hotspots.map((hotspot) => {
          const color = priorityColors[hotspot.priority] || priorityColors.Unclassified

          return (
            <CircleMarker
              key={hotspot.id}
              center={[hotspot.latitude, hotspot.longitude]}
              radius={Math.min(9 + hotspot.reports.length * 2, 20)}
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
                    {hotspot.reports[0].location ||
                      hotspot.reports[0].locationName ||
                      'Reported location'}
                  </h3>
                  <p><strong>Reports:</strong> {hotspot.reports.length}</p>
                  <p><strong>Priority:</strong> {hotspot.priority}</p>
                  <p><strong>Incident types:</strong></p>
                  <ul>
                    {[...new Set(hotspot.reports.map((report) =>
                      report.incidentType || report.type || 'Other'
                    ))].map((type) => <li key={type}>{type}</li>)}
                  </ul>
                  <p><strong>Coordinates:</strong> {hotspot.latitude.toFixed(5)}, {hotspot.longitude.toFixed(5)}</p>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

        {reports.map((report) => {
          const point = getReportCoordinates(report)
          const coordinates = point ? [point.latitude, point.longitude] : null
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
