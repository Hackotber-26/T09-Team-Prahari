import { Bell } from 'lucide-react'

const titles = {
  dashboard: { title: 'Dashboard', sub: 'Road-safety command center' },
  report: { title: 'Report Incident', sub: 'Submit a near-miss report' },
  reports: { title: 'Reports', sub: 'Near-miss incident reports' },
  hotspots: { title: 'Hotspots', sub: 'Geographical risk clusters' },
  about: { title: 'About', sub: 'NearMiss Atlas platform' },
}

export default function Navbar({ page }) {
  const t = Object.prototype.hasOwnProperty.call(titles, page) ? titles[page] : titles.dashboard
  return (
    <header className="navbar">
      <div>
        <h1 className="navbar-title">{t.title}</h1>
        <p className="navbar-sub">{t.sub}</p>
      </div>
      <button className="icon-btn" aria-label="Notifications">
        <Bell size={20} />
      </button>
    </header>
  )
}
