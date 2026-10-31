const items = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'report', label: 'Report Incident' },
  { key: 'reports', label: 'Reports' },
  { key: 'hotspots', label: 'Hotspots' },
  { key: 'about', label: 'About' },
]

export default function Sidebar({ active, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo">NM</span>
        <span>NearMiss Atlas</span>
      </div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={active === item.key ? 'nav-item active' : 'nav-item'}
            aria-current={active === item.key ? 'page' : undefined}
            onClick={() => onSelect(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
