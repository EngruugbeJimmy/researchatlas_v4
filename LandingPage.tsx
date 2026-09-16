import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  CircleUserRound,
  FileCheck2,
  FileText,
  LockKeyhole,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';
import { useState } from 'react';

const institutions = [
  'Stanford University',
  'Harvard University',
  'University of Oxford',
  'ETH Zurich',
  'University of Melbourne',
  'Imperial College London',
  'National University of Singapore',
];

const stages = [
  'Research Question',
  'Literature Review',
  'Data Collection',
  'Data QC',
  'Methodology',
  'Analysis',
  'Results',
  'Manuscript',
];

const features = [
  { icon: FileCheck2, tone: 'blue', title: 'End-to-end research workflow', text: 'Manage every stage, from project creation to publication, in one place.' },
  { icon: ShieldCheck, tone: 'green', title: 'Institutional visibility', text: 'See the full research pipeline and understand where work needs support.' },
  { icon: UsersRound, tone: 'yellow', title: 'Built for every researcher', text: 'Support institutions, departments, research groups, and individuals.' },
  { icon: BookOpen, tone: 'violet', title: 'Publication support', text: 'Find the right journals, build manuscripts, and track submissions.' },
  { icon: Sparkles, tone: 'red', title: 'Powered by trusted data', text: 'Work with OpenAlex, Crossref, and Google Docs when you need them.' },
  { icon: LockKeyhole, tone: 'mint', title: 'Enterprise-grade security', text: 'Workspace boundaries, audit trails, and role-aware access by design.' },
];

export default function LandingPage({ onGetStarted, onSignIn }: { onGetStarted: () => void; onSignIn: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="ResearchAtlas home">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>ResearchAtlas</span>
        </a>
        <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
          <a href="#platform">Product <ChevronDown size={13} /></a>
          <a href="#workflow">Solutions <ChevronDown size={13} /></a>
          <a href="#library">Resources <ChevronDown size={13} /></a>
          <a href="#pricing">Pricing</a>
          <div className="mobile-nav-actions">
            <button className="sign-in" onClick={onSignIn}>Sign in</button>
            <button className="button button-small button-solid" onClick={onGetStarted}>Get started <ArrowRight size={14} /></button>
          </div>
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="Search"><Search size={17} /></button>
          <span className="header-divider" />
          <button className="sign-in" onClick={onSignIn}>Sign in</button>
          <button className="button button-small button-solid" onClick={onGetStarted}>Get started <ArrowRight size={14} /></button>
        </div>
        <button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <p className="eyebrow">Research lifecycle platform</p>
            <h1>From idea to<br /><span className="rainbow-text">publication</span></h1>
            <p className="hero-text">ResearchAtlas helps researchers and universities manage the entire research lifecycle, from project creation and supervision to manuscript development, journal matching, submission and publication.</p>
            <div className="hero-actions">
              <button className="button button-solid" onClick={onGetStarted}>Get started free <ArrowRight size={16} /></button>
              <a className="button button-outline" href="#platform">Explore the platform</a>
            </div>
            <div className="hero-proof">
              <span><FileText size={17} /> Better research outcomes</span>
              <span><BarChart3 size={17} /> Greater visibility</span>
              <span><UsersRound size={17} /> Stronger collaboration</span>
              <span><ShieldCheck size={17} /> Trusted by institutions</span>
            </div>
          </div>
          <div className="hero-visual" aria-label="Research project and publication pipeline preview">
            <div className="orb orb-yellow" /><div className="orb orb-blue" /><div className="orb orb-green" />
            <div className="paper-stack">
              <div className="paper paper-back" /><div className="paper paper-main"><span className="paper-kicker">Research Article</span><h3>Groundwater and Surface Water<br />Interaction in Coastal Systems</h3><div className="paper-rule" /><p>Abstract</p><div className="paper-lines"><i /><i /><i /><i /><i /></div></div>
            </div>
            <div className="check-card"><strong><FileCheck2 size={14} /> Manuscript</strong>{['Project completed', 'Data available', 'Analysis completed', 'Results documented', 'Manuscript draft', 'Supervisor approval'].map((item, index) => <span className={index < 5 ? 'is-done' : ''} key={item}><Check size={12} /> {item}</span>)}<small><BookOpen size={12} /> Open in Google Docs</small></div>
            <div className="pipeline-card"><div className="mock-card-head"><strong>Publication Pipeline</strong><span><CircleUserRound size={13} /><ArrowUpRight size={13} /></span></div><div className="pipeline-stats"><div><b>08</b><small>Research stages</small></div><div><b>01</b><small>Lifecycle</small></div><div><b>∞</b><small>Research outputs</small></div></div><div className="pipeline-line"><span>Draft</span><i /><span>Review</span><i /><span>Journal</span><i /><span className="active">Published</span></div><div className="match-row"><span>Research workflow</span><b>Structured</b></div><div className="match-row"><span>Journal metadata</span><b>Verified</b></div></div>
            <p className="hero-quote">"ResearchAtlas gives our researchers the structure they need, and our leadership the visibility we've never had before."<strong>Vice-Chancellor, Global University</strong></p>
          </div>
        </section>

        <section className="institution-strip" aria-label="Institutions using ResearchAtlas">
          <div className="section-wrap strip-inner"><p className="eyebrow">Trusted by world-leading institutions</p><div className="marquee-window"><div className="marquee-track">{[...institutions, ...institutions].map((institution, index) => <div className="institution" key={`${institution}-${index}`}><span className="institution-seal">{index % 3 === 0 ? '✦' : index % 3 === 1 ? '◇' : '✺'}</span><span>{institution}</span></div>)}</div></div></div>
        </section>

        <section className="platform-section section-wrap" id="platform">
          <div className="section-intro"><p className="eyebrow">Why ResearchAtlas</p><h2>Built for research.<br /><em>Designed for institutions.</em></h2><p>ResearchAtlas combines powerful research management with institutional oversight, giving universities the visibility and control they need to support world-class research.</p><a className="text-link" href="#workflow">See how it works <ArrowRight size={15} /></a></div>
          <div className="feature-grid">{features.map(({ icon: Icon, tone, title, text }) => <article className="feature" key={title}><span className={`feature-icon ${tone}`}><Icon size={19} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className="workflow-section" id="workflow"><div className="section-wrap workflow-wrap"><div className="section-intro"><p className="eyebrow">The research lifecycle</p><h2>A complete journey<br />from research to publication.</h2><p>More than a tool, ResearchAtlas connects your research, people and publications in one seamless platform.</p><a className="text-link" href="#get-started">Explore the full workflow <ArrowRight size={15} /></a></div><div className="workflow-visual"><div className="stage-line">{stages.map((stage, index) => <div className="stage" key={stage}><span className={`stage-number stage-${index + 1}`}>{String(index + 1).padStart(2, '0')}</span><small>{stage}</small></div>)}</div><div className="artifact-row"><div className="artifact notes"><span>Knowledge Library</span><b>End-to-end Research</b><i /><i /><i /><i /></div><div className="artifact map"><span>Project data</span><div className="map-node node-a" /><div className="map-node node-b" /><div className="map-node node-c" /></div><div className="artifact journal"><span>Journal Matching</span><b>Nature Geoscience <strong>92%</strong></b><b>Environmental Research Letters <strong>87%</strong></b><b>Water Resources Research <strong>81%</strong></b></div></div></div></div></section>

        <section className="audience-section section-wrap" id="library"><div><p className="eyebrow">For every researcher. In every institution.</p><h2>Real research.<br /><em>Real impact.</em></h2><p>Whether you're a PhD student, a researcher, a supervisor or an institution, ResearchAtlas adapts to your needs, helping you turn research into published work.</p><div className="audience-cards"><div><CircleUserRound size={20} /><b>Individual researchers</b><span>Manage your projects, write manuscripts, and publish.</span></div><div><UsersRound size={20} /><b>Supervisors</b><span>Review, guide and support your researchers.</span></div><div><FileCheck2 size={20} /><b>Institutions</b><span>See your research pipeline, measure impact, make decisions.</span></div></div></div><div className="impact-card"><div className="impact-image"><div className="building-shape" /><div className="sun-shape" /></div><blockquote>"ResearchAtlas has transformed how we manage and measure research at our university."<cite>Research Office, Global University</cite></blockquote><div className="impact-rule"><i /><i /><i /></div></div></section>

        <section className="final-cta" id="get-started"><div className="cta-shape shape-one" /><div className="cta-shape shape-two" /><div className="section-wrap cta-inner"><div><p className="eyebrow">Start your research journey</p><h2>Join the institutions shaping<br />the future of research.</h2><p>Start your free account or book a demo to see how ResearchAtlas can work for your institution.</p></div><div className="cta-actions"><button className="button button-solid" onClick={onGetStarted}>Get started free <ArrowRight size={16} /></button><button className="button button-outline" onClick={onGetStarted}>Book a demo</button></div><ul><li><Check size={14} /> World-class research</li><li><Check size={14} /> Better collaboration</li><li><Check size={14} /> Greater impact</li></ul></div></section>
      </main>
      <footer className="footer"><div className="section-wrap"><a className="brand" href="#top"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>ResearchAtlas</span></a><span>Research infrastructure for the work that matters.</span><span>© 2026 ResearchAtlas</span></div></footer>
    </div>
  );
}
