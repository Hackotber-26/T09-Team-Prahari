import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { mapHotspots } from '../data/mapSample'

const reportIcon = L.divIcon({
  className: 'report-marker',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#38BDF8;border:2px solid #fff;"></div>',
  iconSize: [14, 14],
})

const hotspotColor = { High: '#EF4444', Medium: '#F59E0B', Low: '#22C55E' }

export default function MapView({ reports }) {
  const list = reports || []
  return (
    <div className="map-wrap">
      <MapContainer center={[12.9716, 77.5946]} zoom={12} style={{ height: '420px', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {list.map((r) => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={reportIcon}>
            <Popup>
              <strong>{r.location}</strong><br />
              Type: {r.type}<br />
              Severity: {r.severity}<br />
              {r.description}
            </Popup>
          </Marker>
        ))}
        {mapHotspots.map((h) => (
          <Circle
            key={h.id}
            center={[h.lat, h.lng]}
            radius={400}
            pathOptions={{ color: hotspotColor[h.priority], fillColor: hotspotColor[h.priority], fillOpacity: 0.35 }}
          >
            <Popup>
              <strong>{h.name}</strong><br />
              Reports: {h.reports}<br />
              Risk score: {h.score}<br />
              Priority: {h.priority}<br />
              Action: {h.action}
            </Popup>
          </Circle>
        ))}
      </MapContainer>
      <div className="map-legend">
        <span><i style={{ background: '#38BDF8' }} /> Report</span>
        <span><i style={{ background: '#EF4444' }} /> High</span>
        <span><i style={{ background: '#F59E0B' }} /> Medium</span>
        <span><i style={{ background: '#22C55E' }} /> Low</span>
      </div>
    </div>
  )
}
