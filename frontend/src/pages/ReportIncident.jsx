import { useState } from 'react'
import { Send } from 'lucide-react'

const incidentTypes = ['Near collision', 'Sudden braking', 'Dangerous overtaking', 'Pedestrian conflict', 'Poor road condition', 'Other']
const sevLabels = { 1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High' }

const empty = { location: '', lat: '', lng: '', type: '', severity: '3', description: '', evidence: false }

export default function ReportIncident({ onAdd }) {
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.location.trim()) e.location = 'Location is required'
    const lat = Number(form.lat)
    const lng = Number(form.lng)
    if (form.lat === '' || isNaN(lat) || lat < -90 || lat > 90) e.lat = 'Latitude must be -90 to 90'
    if (form.lng === '' || isNaN(lng) || lng < -180 || lng > 180) e.lng = 'Longitude must be -180 to 180'
    if (!form.type) e.type = 'Incident type is required'
    const sev = Number(form.severity)
    if (isNaN(sev) || sev < 1 || sev > 5) e.severity = 'Severity must be 1-5'
    if (!form.description.trim()) e.description = 'Description is required'
    if (form.description.length > 500) e.description = 'Max 500 characters'
    return e
  }

  const submit = (ev) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    onAdd({
      location: form.location.trim(),
      lat: Number(form.lat),
      lng: Number(form.lng),
      type: form.type,
      severity: Number(form.severity),
      description: form.description.trim(),
      evidence: form.evidence,
      time: 'just now',
    })
    setForm(empty)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <section className="page">
      <h1>Report Incident</h1>
      <form className="report-form" onSubmit={submit}>
        <label>Location Name<input value={form.location} onChange={(e) => set('location', e.target.value)} />{errors.location && <span className="err">{errors.location}</span>}</label>
        <label>Latitude<input type="number" value={form.lat} onChange={(e) => set('lat', e.target.value)} />{errors.lat && <span className="err">{errors.lat}</span>}</label>
        <label>Longitude<input type="number" value={form.lng} onChange={(e) => set('lng', e.target.value)} />{errors.lng && <span className="err">{errors.lng}</span>}</label>
        <label>Incident Type
          <select value={form.type} onChange={(e) => set('type', e.target.value)}>
            <option value="">Select type</option>
            {incidentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.type && <span className="err">{errors.type}</span>}
        </label>
        <label>Severity
          <select value={form.severity} onChange={(e) => set('severity', e.target.value)}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} - {sevLabels[n]}</option>)}
          </select>
          {errors.severity && <span className="err">{errors.severity}</span>}
        </label>
        <label>Description
          <textarea value={form.description} maxLength={500} onChange={(e) => set('description', e.target.value)} />
          {errors.description && <span className="err">{errors.description}</span>}
        </label>
        <label className="checkbox"><input type="checkbox" checked={form.evidence} onChange={(e) => set('evidence', e.target.checked)} /> Evidence Available</label>
        <button type="submit" className="submit-btn"><Send size={16} /> Submit Report</button>
        {success && <div className="success">Report submitted successfully.</div>}
      </form>
    </section>
  )
}
