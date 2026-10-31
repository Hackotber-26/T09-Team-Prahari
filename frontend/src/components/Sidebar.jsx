const items = [
  { key: 'dashboard', label: 'Dashboard' },
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
      {items.map((item) => (
        <button
          key={item.key}
          className={active === item.key ? 'nav-item active' : 'nav-item'}
          onClick={() => onSelect(item.key)}
        >
          {item.label}
        </button>
      ))}
    </aside>
  )
}
