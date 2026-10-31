import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'

const incidentTypes = [
  'Near collision',
  'Sudden braking',
  'Dangerous overtaking',
  'Pedestrian conflict',
  'Poor road condition',
  'Other',
]
const severityLabels = { 1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High' }
const initialForm = { location: '', lat: '', lng: '', type: '', severity: '3', description: '', evidence: false }

function validateForm(form) {
  const errors = {}
  const lat = Number(form.lat)
  const lng = Number(form.lng)
  const severity = Number(form.severity)

  if (!form.location.trim()) errors.location = 'Location is required.'
  if (form.lat === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.lat = 'Enter a latitude between -90 and 90.'
  }
  if (form.lng === '' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.lng = 'Enter a longitude between -180 and 180.'
  }
  if (!form.type) errors.type = 'Select an incident type.'
  if (!Number.isInteger(severity) || severity < 1 || severity > 5) {
    errors.severity = 'Select a severity from 1 to 5.'
  }
  if (!form.description.trim()) errors.description = 'Description is required.'
  if (form.description.length > 500) errors.description = 'Description must be 500 characters or fewer.'

  return errors
}

export default function ReportIncident({ onAdd }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)
  const [submissionError, setSubmissionError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submissionInProgress = useRef(false)

  useEffect(() => {
    if (!success) return undefined
    const timeoutId = setTimeout(() => setSuccess(false), 4000)
    return () => clearTimeout(timeoutId)
  }, [success])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    setSuccess(false)
    setSubmissionError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submissionInProgress.current) return

    const validationErrors = validateForm(form)
    setErrors(validationErrors)
    setSuccess(false)
    setSubmissionError('')
    if (Object.keys(validationErrors).length) return

    submissionInProgress.current = true
    setSubmitting(true)

    try {
      if (typeof onAdd !== 'function') {
        throw new Error('Report submission is unavailable. Please try again.')
      }

      await onAdd({
        location: form.location.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        type: form.type,
        severity: Number(form.severity),
        description: form.description.trim(),
        evidence: form.evidence,
        reportedAt: Date.now(),
      })
      setForm(initialForm)
      setSuccess(true)
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Unable to submit the report. Please try again.')
    } finally {
      submissionInProgress.current = false
      setSubmitting(false)
    }
  }

  return (
    <section className="page incident-page">
      <div className="incident-heading">
        <p className="incident-eyebrow">Help make road risks visible</p>
        <h1>Report Incident</h1>
        <p>Share a near-miss observation. Accurate location details help show where it happened.</p>
      </div>

      <form className="report-form" onSubmit={submit} noValidate>
        <label htmlFor="report-location">
          Location name
          <input
            id="report-location"
            autoComplete="street-address"
            value={form.location}
            aria-invalid={Boolean(errors.location)}
            aria-describedby={errors.location ? 'report-location-error' : undefined}
            onChange={(event) => updateField('location', event.target.value)}
          />
          {errors.location && <span className="err" id="report-location-error">{errors.location}</span>}
        </label>

        <div className="coordinate-fields">
          <label htmlFor="report-latitude">
            Latitude
            <input
              id="report-latitude"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="e.g. 12.9716"
              value={form.lat}
              aria-invalid={Boolean(errors.lat)}
              aria-describedby={errors.lat ? 'report-latitude-error' : undefined}
              onChange={(event) => updateField('lat', event.target.value)}
            />
            {errors.lat && <span className="err" id="report-latitude-error">{errors.lat}</span>}
          </label>
          <label htmlFor="report-longitude">
            Longitude
            <input
              id="report-longitude"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="e.g. 77.5946"
              value={form.lng}
              aria-invalid={Boolean(errors.lng)}
              aria-describedby={errors.lng ? 'report-longitude-error' : undefined}
              onChange={(event) => updateField('lng', event.target.value)}
            />
            {errors.lng && <span className="err" id="report-longitude-error">{errors.lng}</span>}
          </label>
        </div>

        <div className="incident-select-fields">
          <label htmlFor="report-type">
            Incident type
            <select
              id="report-type"
              value={form.type}
              aria-invalid={Boolean(errors.type)}
              aria-describedby={errors.type ? 'report-type-error' : undefined}
              onChange={(event) => updateField('type', event.target.value)}
            >
              <option value="">Select type</option>
              {incidentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            {errors.type && <span className="err" id="report-type-error">{errors.type}</span>}
          </label>

          <label htmlFor="report-severity">
            Severity
            <select
              id="report-severity"
              value={form.severity}
              aria-invalid={Boolean(errors.severity)}
              aria-describedby={errors.severity ? 'report-severity-error' : undefined}
              onChange={(event) => updateField('severity', event.target.value)}
            >
              {[1, 2, 3, 4, 5].map((level) => (
                <option key={level} value={level}>{level} - {severityLabels[level]}</option>
              ))}
            </select>
            {errors.severity && <span className="err" id="report-severity-error">{errors.severity}</span>}
          </label>
        </div>

        <label htmlFor="report-description">
          Description
          <textarea
            id="report-description"
            value={form.description}
            maxLength={500}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'report-description-error' : 'report-description-count'}
            onChange={(event) => updateField('description', event.target.value)}
          />
          <span className="form-hint" id="report-description-count">{form.description.length}/500 characters</span>
          {errors.description && <span className="err" id="report-description-error">{errors.description}</span>}
        </label>

        <label className="checkbox" htmlFor="report-evidence">
          <input
            id="report-evidence"
            type="checkbox"
            checked={form.evidence}
            onChange={(event) => updateField('evidence', event.target.checked)}
          />
          Supporting evidence is available
        </label>

        <button type="submit" className="submit-btn" disabled={submitting}>
          <Send size={16} aria-hidden="true" />
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
        {success && <div className="form-message success" role="status">Report submitted successfully.</div>}
        {submissionError && <div className="form-message error" role="alert">{submissionError}</div>}
      </form>
    </section>
  )
}
