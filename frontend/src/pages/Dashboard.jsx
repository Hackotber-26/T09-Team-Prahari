
import StatCard from '../components/StatCard'
import MapView from '../components/MapView'
import RecentReports from '../components/RecentReports'
import HotspotOverview from '../components/HotspotOverview'
import { isToday } from '../utils/reportDisplay'
import { getReportCoordinates, groupReportsByProximity } from '../utils/reportGeo'
import {
  FileText,
  MapPin,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react'

export default function Dashboard({ reports = [], submissionNotice = false }) {
  const validReports = Array.isArray(reports) ? reports : []

  const validCoordinates = validReports.filter((report) =>
    getReportCoordinates(report)
  )
  const hotspots = groupReportsByProximity(validCoordinates)
  const highPriorityCount = hotspots.filter((hotspot) =>
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
      value: hotspots.length,
      subtitle: 'Clusters from reported locations',
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

      {submissionNotice && (
        <div className="dashboard-submission-notice" role="status">
          <strong>Report received.</strong> It has been added to the dashboard and map.
        </div>
      )}

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
          <HotspotOverview reports={validCoordinates} />
        </div>
      </section>
    </div>
  )
}
