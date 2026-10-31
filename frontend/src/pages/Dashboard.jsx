
import StatCard from '../components/StatCard'
import MapView from '../components/MapView'
import RecentReports from '../components/RecentReports'
import HotspotOverview from '../components/HotspotOverview'
import { isToday } from '../utils/reportDisplay'
import { mapHotspots } from '../data/mapSample'
import {
  FileText,
  MapPin,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react'

export default function Dashboard({ reports = [] }) {
  const validReports = Array.isArray(reports) ? reports : []

  const validCoordinates = validReports.filter((report) => {
    const lat = Number(report.lat)
    const lng = Number(report.lng)

    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    )
  })

  const highPriorityCount = mapHotspots.filter((hotspot) =>
    ['High', 'Critical'].includes(hotspot.priority)
  ).length

  const cards = [
    {
      label: 'Total Reports',
      value: validReports.length,
      subtitle: 'Community-submitted incidents',
      icon: FileText,
      color: 'blue',
    },
    {
      label: 'Active Hotspots',
      value: mapHotspots.length,
      subtitle: 'Sample risk clusters',
      icon: MapPin,
      color: 'purple',
    },
    {
      label: 'High Priority Areas',
      value: highPriorityCount,
      subtitle: 'High and critical clusters',
      icon: AlertTriangle,
      color: 'red',
    },
    {
      label: 'Reports Today',
      value: validReports.filter((report) =>
        isToday(report.reportedAt || report.createdAt)
      ).length,
      subtitle: 'Reports submitted today',
      icon: CalendarDays,
      color: 'green',
    },
  ]

  return (
    <div className="dashboard">
      <section className="dashboard-heading">
        <div>
          <span className="dashboard-eyebrow">
            <span className="status-dot" />
            DASHBOARD OVERVIEW
          </span>

          <h1 className="dashboard-title">
            Road Safety <span>Command Center</span>
          </h1>

          <p className="dashboard-description">
            Monitor reported near-misses, identify emerging hotspots,
            and support safer road decisions.
          </p>
        </div>
      </section>

      <section className="stat-grid">
        {cards.map((card, index) => (
          <StatCard
            key={card.label}
            {...card}
            delay={index * 100}
          />
        ))}
      </section>

      <section className="dashboard-map-section">
        <div className="dashboard-section-heading">
          <div>
            <h2>Incident Map</h2>
            <p>
              Geographic overview of submitted near-miss reports.
            </p>
          </div>

          <span className="map-count">
            {validCoordinates.length} mapped reports
          </span>
        </div>

        <MapView reports={validCoordinates} />
      </section>

      <section className="dashboard-bottom">
        <div className="dashboard-panel">
          <RecentReports reports={validReports} />
        </div>

        <div className="dashboard-panel">
          <HotspotOverview />
        </div>
      </section>
    </div>
  )
}
