/**
 * LandingScreen — public marketing front door for LanguageAI (mobile-first).
 *
 * Rendered for logged-out visitors (see AppStore: no token → 'landing'). All CTAs
 * route into the app's auth flow. The hero visual is a placeholder card marked
 * `#hero-ollie` — it will later be replaced by a three.js scene of Ollie waving.
 */
import {
  ArrowRight,
  AudioLines,
  BarChart3,
  BookOpen,
  Brain,
  CalendarClock,
  Check,
  ClipboardCheck,
  FileDown,
  FileText,
  Gamepad2,
  Heart,
  Home,
  Image as ImageIcon,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  User,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import type { JSX, ReactNode } from 'react';

import { useApp } from '../store/AppStore';
import { LegalModal } from '../legal/LegalModal';
import type { LegalKind } from '../legal/legalDocs';
import { openInterviewAs } from './InterviewScreen';
import './landing.css';

// Optional real footage of the Repeat-after-me game. Drop an mp4 in
// frontend/public/videos/ and set this to e.g. '/videos/repeat-after-me.mp4' to
// show the actual game; an empty string uses the animated CSS recreation below.
const DEMO_VIDEO_URL: string = '';

// A real in-app screenshot to show inside the phone. Drop the image in
// frontend/public/ and set this to its path, e.g. '/app-screen.png'. An empty
// string keeps the built-in CSS app mockup below.
const HERO_APP_IMAGE: string = '/app-home.png';

// Screenshot for the "For families" phone showcase. Defaults to the home screen;
// drop a game screen in frontend/public/ and point this at it for variety.
const FAMILIES_APP_IMAGE: string = '/app-games.png';

const NAV_LINKS = [
  { label: 'Product', href: '#how' },
  { label: 'For Families', href: '#families' },
  { label: 'For Clinicians', href: '#clinicians' },
];

const GAMES: { icon: ReactNode; title: string; desc: string }[] = [
  {
    icon: <MessageCircle size={22} />,
    title: 'Talk with Ollie',
    desc: 'A friendly back and forth chat with Ollie turns everyday conversation into gentle, encouraging fluency practice.',
  },
  {
    icon: <BookOpen size={22} />,
    title: 'Read It Loud',
    desc: 'Practice reading with gentle pacing prompts, playful rewards and clear fluency feedback.',
  },
  {
    icon: <AudioLines size={22} />,
    title: 'Repeat After Me',
    desc: "Children echo Ollie's words and sounds while LanguageAI tracks per sound mastery.",
  },
  {
    icon: <Heart size={22} />,
    title: 'Story Teller',
    desc: 'Prompted stories turn spontaneous speech into rich, clinically useful practice recordings.',
  },
  {
    icon: <ImageIcon size={22} />,
    title: 'Picture Talk',
    desc: 'Describe friendly scenes, practice target words and build confidence in natural speech.',
  },
];

const CLIN_PILLS: { icon: ReactNode; label: string }[] = [
  { icon: <Users size={18} />, label: 'Patient monitoring' },
  { icon: <Brain size={18} />, label: 'AI disfluency analysis' },
  { icon: <ClipboardCheck size={18} />, label: 'Therapy plans' },
  { icon: <Target size={18} />, label: 'Weekly goals' },
  { icon: <BarChart3 size={18} />, label: 'Progress trends' },
  { icon: <FileDown size={18} />, label: 'PDF reports' },
];

const STEPS: { n: number; green?: boolean; title: string; desc: string }[] = [
  { n: 1, title: 'Practice', desc: 'A child plays a short game, reads aloud, describes a picture or chats with Ollie.' },
  { n: 2, title: 'Analyze', desc: 'AI transcribes speech, detects blocks, prolongations and repetitions, then scores fluency.' },
  { n: 3, title: 'Review', desc: 'Therapists track trends, adjust goals and share progress reports families can understand.' },
];

const AI_FEATURES: { icon: ReactNode; text: string }[] = [
  { icon: <FileText size={20} />, text: 'Automatic transcription highlights practice words and target sounds.' },
  { icon: <AudioLines size={20} />, text: 'Detects repetitions, prolongations and blocks from each recording.' },
  { icon: <BarChart3 size={20} />, text: 'Scores fluency and tracks change over time, not just completion.' },
];

const QUOTES: { text: string; who: string; green?: boolean }[] = [
  {
    text: 'LanguageAI gives me the kind of home practice data I’ve always wanted: clear trends, meaningful disfluency markers and progress families can understand.',
    who: 'Anonymous Speech language pathologist',
  },
  {
    text: 'My child asks to practice with Ollie. It feels less like homework and more like a game we can celebrate together.',
    who: 'Anonymous Parent',
    green: true,
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is LanguageAI a replacement for therapy?',
    a: 'No. LanguageAI supports home practice and gives SLPs better session data but it is designed to complement care from a qualified clinician.',
  },
  {
    q: 'How does the AI measure fluency?',
    a: 'Each recording is analyzed for transcription, words per minute, fluency score and disfluency markers like blocks, prolongations and repetitions.',
  },
  {
    q: 'Is my child’s data private?',
    a: 'Privacy is central to the product. Practice recordings and reports are handled with a clinical use mindset and clear family controls.',
  },
  {
    q: 'What ages is it for?',
    a: 'LanguageAI is designed for children who benefit from guided speech practice. Clinicians can tailor goals and activities to the child’s needs.',
  },
];

export function LandingScreen(): JSX.Element {
  const { state, navigate } = useApp();
  // Legal + consent docs (Terms & Privacy) opened from the footer.
  const [legal, setLegal] = useState<LegalKind | null>(null);
  // Already signed in? Continue straight into the app; otherwise into auth
  // (logged-out "Try Now" → login, which then leads into the game).
  const enter = (): void =>
    state.authToken ? navigate(state.role === 'DOCTOR' ? 'docPatients' : 'home') : navigate('login');
  // "Try Now" opens the app in a NEW tab via the ?screen= deep-link, leaving the
  // landing page open. Same destination logic as `enter`: logged-out → login,
  // signed-in → home/dashboard.
  const openTryNow = (): void => {
    const screen = state.authToken ? (state.role === 'DOCTOR' ? 'docPatients' : 'home') : 'login';
    window.open(`?screen=${screen}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="lp">
      {/* ---- Nav ---- */}
      <header className="lp-nav">
        <div className="lp-container lp-nav__inner">
          <a className="lp-brand" href="#top">LanguageAI</a>
          <nav className="lp-nav__links">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href}>{l.label}</a>
            ))}
          </nav>
          <div className="lp-nav__actions">
            <button type="button" className="lp-btn lp-btn--ghost" onClick={enter}>Sign in</button>
            <button type="button" className="lp-btn lp-btn--primary" onClick={openTryNow}>Try Now !</button>
          </div>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="lp-hero" id="top">
        <div className="lp-container lp-hero__inner">
          <div className="lp-hero__text">
            <span className="lp-badge"><Sparkles size={16} /> AI powered practice built with SLPs</span>
            <h1 className="lp-h1">Speech practice kids love, insight therapists trust.</h1>
            <p className="lp-lead">
              LanguageAI turns daily fluency practice into playful games with Ollie the otter, while every
              recording becomes objective clinical insight for SLPs.
            </p>
            <div className="lp-hero__cta">
              <button type="button" className="lp-btn lp-btn--primary lp-btn--lg" onClick={enter}>
                Start free <ArrowRight size={18} />
              </button>
              <button type="button" className="lp-btn lp-btn--outline lp-btn--lg" onClick={enter}>
                For Clinicians
              </button>
            </div>
            <ul className="lp-checks">
              {['Fluency scoring', 'Disfluency detection', 'SLP ready reports'].map((c) => (
                <li key={c}><Check size={16} /> {c}</li>
              ))}
            </ul>
          </div>

          {/* Hero visual: an animated "Repeat-after-me" demo — Ollie waves hello,
              says a word, listens, then celebrates, on a loop. Set DEMO_VIDEO_URL
              to swap in a real screen recording of the game. */}
          <div className="lp-hero__visual" id="hero-ollie" aria-hidden="true">
            {DEMO_VIDEO_URL ? (
              <video className="lp-demo__video" src={DEMO_VIDEO_URL} autoPlay loop muted playsInline />
            ) : (
              <div className="lp-phone">
                <div className="lp-phone__screen">
                  {HERO_APP_IMAGE && <img className="lp-phone__shot" src={HERO_APP_IMAGE} alt="" />}
                  <div className="lp-phone__status">
                    <span>9:41</span>
                    <span className="lp-phone__stat-r">
                      <span className="lp-phone__bars"><i /><i /><i /><i /></span>
                      <span className="lp-phone__batt" />
                    </span>
                  </div>
                  <div className="lp-phone__head">
                    <b>Hi, Ollie! 👋</b>
                    <small>Let’s practice today</small>
                  </div>
                  <div className="lp-phone__body">
                    <div className="lp-phone__card">
                      <span className="lp-phone__eyebrow">Repeat after me</span>
                      <span className="lp-phone__ollie">•ᴥ•</span>
                      <p className="lp-phone__say">Say: “rabbit” 🐰</p>
                      <span className="lp-wave"><i /><i /><i /><i /><i /></span>
                      <span className="lp-phone__great">Great try! · 87%</span>
                    </div>
                  </div>
                  <div className="lp-phone__tabs">
                    <span className="is-active"><Home size={15} />Home</span>
                    <span><Gamepad2 size={15} />Practice</span>
                    <span><BarChart3 size={15} />Progress</span>
                    <span><User size={15} />Profile</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---- Trust strip ---- */}
      <div className="lp-container">
        <div className="lp-trust">
          {['Built with SLPs', '5 practice games', 'AI measured fluency', 'Clinician ready reports'].map((t) => (
            <span key={t} className="lp-trust__item">{t}</span>
          ))}
        </div>
      </div>

      {/* ---- Problem ---- */}
      <section className="lp-section">
        <div className="lp-container">
          <p className="lp-eyebrow">Home practice, finally measurable</p>
          <h2 className="lp-h2">The hardest part of speech therapy happens between sessions.</h2>
          <p className="lp-sub">
            LanguageAI keeps children engaged at home and gives clinicians the objective practice data they
            need to personalize care.
          </p>
          <div className="lp-grid lp-grid--2 lp-problem">
            <article className="lp-card">
              <div className="lp-problem__head">
                <span className="lp-icon lp-icon--soft"><CalendarClock size={22} /></span>
                <h3 className="lp-h3">Practice is easy to skip</h3>
              </div>
              <p className="lp-p">
                Families want to help but worksheets feel repetitive, children lose motivation and SLPs
                often receive only a vague sense of what happened at home.
              </p>
            </article>
            <article className="lp-card lp-card--violet">
              <div className="lp-problem__head">
                <span className="lp-icon lp-icon--on-violet"><Gamepad2 size={22} /></span>
                <h3 className="lp-h3">Play creates consistency</h3>
              </div>
              <p className="lp-p lp-p--on-violet">
                Ollie guides short, playful sessions while AI turns each recording into fluency scores,
                disfluency patterns, words per minute and sound level progress.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ---- For Families / games ---- */}
      <section className="lp-section" id="families">
        <div className="lp-container">
          <p className="lp-eyebrow lp-eyebrow--green">For families</p>
          <h2 className="lp-h2 lp-center">Five practice games that feel like playtime.</h2>
          <p className="lp-sub lp-center">
            Short, cheerful activities help children build fluency and articulation confidence with instant
            encouragement from Ollie.
          </p>
          <div className="lp-families">
            <div className="lp-phone lp-phone--showcase">
              <div className="lp-phone__screen">
                <img className="lp-phone__shot" src={FAMILIES_APP_IMAGE} alt="The LanguageAI app on a phone" />
              </div>
            </div>
            <div className="lp-games">
              {GAMES.map((g) => (
                <article key={g.title} className="lp-card lp-game">
                  <span className="lp-icon lp-icon--soft">{g.icon}</span>
                  <div className="lp-game__text">
                    <h3 className="lp-h3">{g.title}</h3>
                    <p className="lp-p">{g.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- For Clinicians ---- */}
      <section className="lp-section" id="clinicians">
        <div className="lp-container lp-split">
          <div className="lp-split__text">
            <p className="lp-eyebrow">For SLPs and clinics</p>
            <h2 className="lp-h2">Clinical grade insight without extra admin.</h2>
            <p className="lp-sub">
              Monitor patients, build treatment plans, review AI speech analysis and export progress reports
              from one clean dashboard.
            </p>
            <div className="lp-pills">
              {CLIN_PILLS.map((p) => (
                <span key={p.label} className="lp-pill"><span className="lp-pill__i">{p.icon}</span>{p.label}</span>
              ))}
            </div>
          </div>
          {/* Dashboard mockup */}
          <div className="lp-dash" aria-hidden="true">
            <div className="lp-dash__head">
              <b>Patient dashboard</b>
              <span className="lp-dash__tag">AI analyzed</span>
            </div>
            <div className="lp-dash__stats">
              <span className="lp-dash__stat"><small>Fluency</small><b>87%</b></span>
              <span className="lp-dash__stat"><small>WPM</small><b>78</b></span>
              <span className="lp-dash__stat"><small>Blocks</small><b className="lp-ok">↓12%</b></span>
            </div>
            <div className="lp-dash__chart">
              {[34, 52, 46, 78, 92].map((h, i) => (
                <span key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className="lp-section lp-section--tint" id="how">
        <div className="lp-container">
          <p className="lp-eyebrow lp-center">How it works</p>
          <h2 className="lp-h2 lp-center">From playful practice to actionable progress.</h2>
          <div className="lp-grid lp-grid--3 lp-steps">
            {STEPS.map((s) => (
              <article key={s.n} className="lp-card lp-step">
                <div className="lp-step__head">
                  <span className="lp-step__n">{s.n}</span>
                  <h3 className="lp-h3">{s.title}</h3>
                </div>
                <p className="lp-p">{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---- AI section ---- */}
      <section className="lp-section">
        <div className="lp-container lp-split lp-split--ai">
          <div className="lp-card lp-card--violet lp-ai">
            <div className="lp-ai__head">
              <span className="lp-icon lp-icon--on-violet"><Brain size={24} /></span>
              <h2 className="lp-h2 lp-h2--on-violet">AI that translates practice into clinical signal.</h2>
            </div>
            <p className="lp-p lp-p--on-violet">
              LanguageAI combines automatic transcription, disfluency detection, fluency scoring,
              words per minute tracking and per sound mastery into a simple review workflow built for clinical use.
            </p>
            <div className="lp-pills lp-pills--on-violet">
              <span className="lp-pill lp-pill--glass"><ShieldCheck size={16} /> Privacy first</span>
              <span className="lp-pill lp-pill--glass"><Stethoscope size={16} /> Built for clinical use</span>
            </div>
          </div>
          <div className="lp-ai__rows">
            {AI_FEATURES.map((f, i) => (
              <div key={i} className="lp-ai__row">
                <span className="lp-icon lp-icon--soft">{f.icon}</span>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Testimonials ---- */}
      <section className="lp-section lp-section--tint">
        <div className="lp-container">
          <h2 className="lp-h2 lp-center">Warm support for families.<br />Better evidence for clinicians.</h2>
          <div className="lp-grid lp-grid--2 lp-quotes">
            {QUOTES.map((q, i) => (
              <blockquote key={i} className="lp-card lp-quote">
                <p>“{q.text}”</p>
                <cite className={q.green ? 'lp-quote__who lp-quote__who--green' : 'lp-quote__who'}>{q.who}</cite>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA band ---- */}
      <section className="lp-section" id="pricing">
        <div className="lp-container lp-grid lp-grid--2 lp-cta">
          <div className="lp-card lp-card--violet lp-cta__card">
            <h3 className="lp-cta__title">Start your child’s fluency journey</h3>
            <button type="button" className="lp-btn lp-btn--white" onClick={enter}>Start free</button>
          </div>
          <div className="lp-card lp-card--violet lp-cta__card">
            <h3 className="lp-cta__title">Bring LanguageAI to your clinic</h3>
            <button type="button" className="lp-btn lp-btn--white" onClick={openTryNow}>Try Now !</button>
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="lp-section">
        <div className="lp-container lp-faq">
          <p className="lp-eyebrow lp-center">Questions families and SLPs ask</p>
          <h2 className="lp-h2 lp-center">Frequently asked questions</h2>
          <div className="lp-faq__list">
            {FAQS.map((f) => (
              <div key={f.q} className="lp-card lp-faq__item">
                <h3 className="lp-h3">{f.q}</h3>
                <p className="lp-p">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer__inner">
          <div className="lp-footer__brand">
            <span className="lp-brand lp-brand--light">LanguageAI</span>
            <p>Clinical Excellence in Speech Therapy.</p>
          </div>
          <div className="lp-footer__cols">
            <div>
              <b>Product</b>
              <a href="#families">For Families</a>
              <a href="#clinicians">For Clinicians</a>
            </div>
            <div>
              <b>Company</b>
              <a href="#top">About</a>
              <a
                href="#interview"
                onClick={(e) => {
                  e.preventDefault();
                  openInterviewAs('parent');
                  navigate('interview');
                }}
              >
                Interview consent (families)
              </a>
              <a
                href="#interview"
                onClick={(e) => {
                  e.preventDefault();
                  openInterviewAs('slp');
                  navigate('interview');
                }}
              >
                Interview consent (SLPs)
              </a>
              <a href="#privacy" onClick={(e) => { e.preventDefault(); setLegal('privacy'); }}>Privacy</a>
              <a href="#terms" onClick={(e) => { e.preventDefault(); setLegal('terms'); }}>Terms &amp; Consent</a>
            </div>
            <div>
              <b>Contact</b>
              <a href="mailto:hello@languageai.com">hello@languageai.com</a>
              <a href="#top">Book a Demo</a>
            </div>
          </div>
        </div>
        <div className="lp-container lp-footer__bottom">
          <span>© 2026 LanguageAI</span>
          <span>Warm practice. Objective progress.</span>
        </div>
      </footer>
      {legal && <LegalModal audience="user" kind={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}
