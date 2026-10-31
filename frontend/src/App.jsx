import { useState } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import Hotspots from './pages/Hotspots'
import About from './pages/About'
import './styles/app.css'

export default function App() {
  const [page, setPage] = useState('dashboard')
  return (
    <div className="app-shell">
      <Navbar page={page} />
      <div className="app-body">
        <Sidebar active={page} onSelect={setPage} />
        <main className="app-main">
          {page === 'dashboard' && <Dashboard />}
          {page === 'reports' && <Reports />}
          {page === 'hotspots' && <Hotspots />}
          {page === 'about' && <About />}
        </main>
      </div>
    </div>
  )
}
