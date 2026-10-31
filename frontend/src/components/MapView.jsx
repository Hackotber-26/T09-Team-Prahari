
import { useEffect, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { mapHotspots } from '../data/mapSample'

function getCoordinates(report) {
  const latitude = Number(report.latitude ?? report.lat)
  const longitude = Number(report.longitude ?? report.lng)

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null
  }

  return [latitude, longitude]
}

function getPriority(reports) {
  const priorities = reports.map((report) => {
    const priority = String(
      report.priority || report.severityLevel || report.severity || ''
    ).toLowerCase()

    if (priority === 'critical' || priority === 'very high') return 4
    if (priority === 'high') return 3
    if (priority === 'medium' || priority === 'moderate') return 2
    if (priority === 'low') return 1

    const severity = Number(report.severity)

    if (severity >= 5) return 4
    if (severity >= 4) return 3
    if (severity >= 3) return 2
    if (severity > 0) return 1

    return 0
  })

  const highest = Math.max(...priorities)

  if (highest === 4) return 'Critical'
  if (highest === 3) return 'High'
  if (highest === 2) return 'Medium'
  if (highest === 1) return 'Low'

  return 'Unclassified'
}

const priorityColors = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#22c55e',
  Unclassified: '#3b82f6',
}

function groupReports(reports) {
  const groups = []

  reports.forEach((report) => {
    const coordinates = getCoordinates(report)

    if (!coordinates) return

    const [latitude, longitude] = coordinates

    // Group reports within approximately 100 metres.
    const existingGroup = groups.find((group) => {
      const latDifference = Math.abs(group.latitude - latitude)
      const lngDifference = Math.abs(group.longitude - longitude)

      return (
        latDifference <= 0.001 &&
        lngDifference <= 0.001
      )
    })

    if (existingGroup) {
      existingGroup.reports.push(report)

      const total = existingGroup.reports.length

      existingGroup.latitude =
        existingGroup.reports.reduce(
          (sum, item) =>
            sum + getCoordinates(item)[0],
          0
        ) / total

      existingGroup.longitude =
        existingGroup.reports.reduce(
          (sum, item) =>
            sum + getCoordinates(item)[1],
          0
        ) / total
    } else {
      groups.push({
        latitude,
        longitude,
        reports: [report],
      })
    }
  })

  return groups.map((group, index) => ({
    ...group,
    id: index + 1,
    priority: getPriority(group.reports),
  }))
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
    () => groupReports(reports),
    [reports]
  )
  const boundsLocations = useMemo(
    () => [
      ...hotspots,
      ...mapHotspots.map((hotspot) => ({
        latitude: hotspot.lat,
        longitude: hotspot.lng,
      })),
    ],
    [hotspots],
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

      {!hotspots.length && (
        <p className="map-empty" role="status">
          No report markers yet. Sample hotspot zones are still shown.
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

        {mapHotspots.map((hotspot) => {
          const color = priorityColors[hotspot.priority]

          return (
            <Circle
              key={`sample-hotspot-${hotspot.id}`}
              center={[hotspot.lat, hotspot.lng]}
              radius={400}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.12,
                weight: 2,
              }}
            >
              <Popup>
                <div className="map-popup">
                  <h3>{hotspot.name}</h3>
                  <p><strong>Reports:</strong> {hotspot.reports}</p>
                  <p><strong>Risk score:</strong> {hotspot.score}</p>
                  <p><strong>Priority:</strong> {hotspot.priority}</p>
                  <p><strong>Recommendation:</strong> {hotspot.action}</p>
                </div>
              </Popup>
            </Circle>
          )
        })}

        {hotspots.map((hotspot) => {
          const color = priorityColors[hotspot.priority]

          return (
            <CircleMarker
              key={`report-cluster-${hotspot.id}`}
              center={[hotspot.latitude, hotspot.longitude]}
              radius={Math.min(9 + hotspot.reports.length * 2, 20)}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.65,
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
          const coordinates = getCoordinates(report)
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
                  <p><strong>Severity:</strong> {report.severityLevel || report.severity || 'Unspecified'}</p>
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
