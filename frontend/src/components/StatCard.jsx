
import { useEffect, useState } from 'react'

export default function StatCard({
  label,
  value = 0,
  subtitle,
  icon: Icon,
  color = 'blue',
  delay = 0,
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let animationFrame
    let startTime

    const duration = 1000

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp

      const progress = Math.min(
        (timestamp - startTime) / duration,
        1
      )

      const eased = 1 - Math.pow(1 - progress, 3)

      setCount(Math.round(value * eased))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    const timeout = setTimeout(() => {
      animationFrame = requestAnimationFrame(animate)
    }, delay)

    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(animationFrame)
    }
  }, [value, delay])

  return (
    <article
      className={`stat-card stat-${color}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="stat-card-top">
        <div className="stat-icon">
          {Icon && <Icon size={21} strokeWidth={1.8} />}
        </div>

        <span className="stat-indicator">
          <span />
          Overview
        </span>
      </div>

      <div className="stat-content">
        <p className="stat-label">{label}</p>

        <h2 className="stat-value">{count.toLocaleString()}</h2>

        <p className="stat-subtitle">{subtitle}</p>
      </div>
    </article>
  )
}
