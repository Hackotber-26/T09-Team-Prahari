
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Database,
  Eye,
  Layers3,
  MapPin,
  Radar,
  ShieldCheck,
  Target,
  Users,
  Route,
  CheckCircle2,
} from "lucide-react";

const highlights = [
  {
    icon: AlertTriangle,
    title: "Unseen Road Risks",
    description:
      "Near-miss incidents often go unnoticed because they do not result in collisions. Yet they can reveal dangerous road conditions.",
  },
  {
    icon: Users,
    title: "Community Awareness",
    description:
      "People who travel the same roads every day can share valuable experiences that help reveal recurring safety concerns.",
  },
  {
    icon: MapPin,
    title: "Location-Based Insights",
    description:
      "Connecting incident reports to geographical locations helps identify areas that may require closer attention.",
  },
];

const workflow = [
  {
    icon: Users,
    number: "01",
    title: "Community reports",
    description:
      "Road users share near-miss experiences and the circumstances around them.",
  },
  {
    icon: MapPin,
    number: "02",
    title: "Capture coordinates",
    description:
      "Reports are collected with geographical coordinates to identify where they occurred.",
  },
  {
    icon: Radar,
    number: "03",
    title: "Group nearby reports",
    description:
      "DBSCAN groups geographically nearby reports into clusters without a preset cluster count.",
  },
  {
    icon: Target,
    number: "04",
    title: "Prioritize transparently",
    description:
      "An explainable prototype score combines normalized severity, report frequency, and evidence quality.",
  },
  {
    icon: ClipboardCheck,
    number: "05",
    title: "Support further review",
    description:
      "Users and authorities can identify locations that may need road-safety inspections.",
  },
];

const principles = [
  {
    icon: Eye,
    title: "Protect privacy",
    description:
      "Handle report details and location information carefully, sharing only what is needed for road-safety review.",
  },
  {
    icon: ShieldCheck,
    title: "Verify reports",
    description:
      "Treat community submissions as signals for review, not verified facts. Confirm information before acting on it.",
  },
  {
    icon: CheckCircle2,
    title: "Prevent duplicates",
    description:
      "Repeated submissions can distort a location’s apparent activity, so duplicate prevention matters.",
  },
];

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="about-section-heading">
      <span className="about-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export default function About() {
  return (
    <article className="page about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-content">
          <span className="about-kicker">
            <Activity size={16} />
            ROAD SAFETY INTELLIGENCE
          </span>

          <h1>
            Don't Wait for
            <span> the Crash.</span>
          </h1>

          <p>
            NearMiss Atlas helps communities make near-miss reports visible
            and identify road locations that may deserve closer attention.
          </p>

          <a href="#about-solution" className="about-hero-button">
            Discover Our Mission
            <ArrowRight size={17} />
          </a>
        </div>

        <div className="about-hero-visual" aria-hidden="true">
          <div className="about-visual-ring ring-one" />
          <div className="about-visual-ring ring-two" />
          <div className="about-visual-ring ring-three" />

          <div className="about-visual-center">
            <MapPin size={38} />
          </div>

          <span className="about-visual-dot dot-one" />
          <span className="about-visual-dot dot-two" />
          <span className="about-visual-dot dot-three" />
          <span className="about-visual-dot dot-four" />
        </div>
      </section>

      {/* Problem Section */}
      <section className="about-section">
        <SectionHeading
          eyebrow="WHY WE EXIST"
          title="A close call should never be ignored."
          description="Road-safety concerns often appear long before an actual accident happens. Near-miss incidents can reveal warning signs that deserve attention."
        />

        <div className="about-highlight-grid">
          {highlights.map(({ icon: Icon, title, description }) => (
            <article className="about-highlight-card" key={title}>
              <div className="about-icon-box">
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Solution Section */}
      <section className="about-section" id="about-solution">
        <div className="about-solution-panel">
          <div className="about-solution-icon">
            <Radar size={30} />
          </div>

          <div>
            <span className="about-eyebrow">WHAT IS NEARMISS ATLAS?</span>
            <h2>Making road-safety concerns visible.</h2>
            <p>
              A near-miss may not appear in collision records, yet repeated
              close calls can signal a road-design, traffic, or visibility
              concern. Community reporting brings those observations
              together by location. The prototype helps surface patterns for
              discussion and potential inspection; it does not automatically
              detect every incident or determine that a road is unsafe.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="about-section">
        <SectionHeading
          eyebrow="OUR APPROACH"
          title="From community reports to road-safety insights."
          description="A simple process that transforms individual experiences into a clearer understanding of potential road hazards."
        />

        <div className="about-workflow-grid">
          {workflow.map(({ icon: Icon, number, title, description }) => (
            <article className="about-workflow-card" key={number}>
              <div className="about-workflow-top">
                <span className="about-step-number">{number}</span>
                <div className="about-icon-box">
                  <Icon size={21} />
                </div>
              </div>

              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Methodology */}
      <section className="about-section">
        <SectionHeading
          eyebrow="PROTOTYPE METHODOLOGY"
          title="A score that can be explained."
          description="Hotspot priority is an experimental way to organize reports for further review, using three normalized factors."
        />
        <div className="about-method-panel">
          <p className="about-formula">R = 100 × (0.40 × S + 0.35 × F + 0.25 × C)</p>
          <div className="about-method-factors">
            <p><strong>S · 40% — Normalized severity:</strong> how serious the reported incidents are on a common scale.</p>
            <p><strong>F · 35% — Normalized frequency:</strong> how often near-miss reports are associated with a location.</p>
            <p><strong>C · 25% — Supporting evidence quality:</strong> whether reports include evidence that can help review an incident.</p>
          </div>
          <p className="about-method-caveat">
            This experimental prioritization score is not a probability of an accident and has
            not been scientifically validated. DBSCAN groups nearby reports; the prototype
            relies on submitted reports and cannot automatically detect every near-miss.
          </p>
        </div>
      </section>

      {/* Technology */}
      <section className="about-section">
        <SectionHeading
          eyebrow="PROJECT TECHNOLOGY"
          title="A frontend prototype in active development."
          description="The frontend currently uses sample data. The backend is being developed separately and is not integrated."
        />
        <div className="about-technology-grid">
          <article className="about-technology-card">
            <div className="about-technology-title"><Layers3 size={20} /><h3>Frontend</h3></div>
            <ul>
              {['React 19', 'Vite 8', 'JavaScript', 'CSS', 'Leaflet', 'React-Leaflet', 'Axios', 'Lucide React'].map((technology) => (
                <li key={technology}>{technology}</li>
              ))}
            </ul>
            <p>Axios is included for future API integration; backend connectivity is not complete.</p>
          </article>
          <article className="about-technology-card">
            <div className="about-technology-title"><Database size={20} /><h3>Backend</h3></div>
            <p>FastAPI is being developed separately by a teammate in another branch.</p>
            <span className="about-development-status">In development · not integrated</span>
          </article>
        </div>
      </section>

      {/* Vision Section */}
      <section className="about-vision">
        <div className="about-vision-icon">
          <Route size={27} />
        </div>

        <span className="about-eyebrow">OUR VISION</span>

        <h2>
          Building a future where road safety starts
          <span> before an accident happens.</span>
        </h2>

        <p>
          We envision safer roads through collective awareness,
          meaningful insights and proactive attention to potential
          road hazards.
        </p>
      </section>

      {/* Principles Section */}
      <section className="about-section">
        <SectionHeading
          eyebrow="WHAT GUIDES US"
          title="Built around responsible road safety."
          description="We believe useful road-safety insights should be transparent, responsible and focused on meaningful outcomes."
        />

        <div className="about-principles-grid">
          {principles.map(({ icon: Icon, title, description }) => (
            <article className="about-principle-card" key={title}>
              <Icon size={23} />
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Limitations and Future Scope */}
      <section className="about-section about-final-section">
        <div className="about-future-panel">
          <div className="about-future-heading">
            <div className="about-icon-box">
              <Activity size={22} />
            </div>
            <div>
              <span className="about-eyebrow">LOOKING AHEAD</span>
              <h2>Moving towards safer roads.</h2>
            </div>
          </div>

          <p>
            Future development could explore verified traffic and road-condition
            data, stronger report review and duplicate-prevention processes, and
            responsible ways for road-safety authorities to use hotspot insights
            when considering inspections.
          </p>

          <p className="about-disclaimer">
            Hotspot scores are experimental prioritization signals, not accident
            probabilities, and have not been scientifically validated. Community
            reports and identified hotspots require verification and professional
            review. The prototype cannot automatically detect every near-miss or
            replace official road-safety assessments.
          </p>
        </div>
      </section>

      {/* Closing */}
      <footer className="about-closing">
        <h2>NearMiss Atlas</h2>
        <p>
          A near-miss is not just an accident that didn't happen.
          <br />
          It is a warning that deserves attention.
        </p>
        <span>DON'T WAIT FOR THE CRASH.</span>
      </footer>
    </article>
  );
}
