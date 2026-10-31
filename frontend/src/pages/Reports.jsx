export default function Reports({ reports }) {
  return (
    <section className="page">
      <h1>Reports</h1>
      <ul className="report-list">
        {(reports || []).map((r) => (
          <li key={r.id} className="report-item">
            <div>
              <div className="report-location">{r.location}</div>
              <div className="report-meta">{r.type} · sev {r.severity}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
