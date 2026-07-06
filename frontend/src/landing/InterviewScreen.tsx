/**
 * InterviewScreen — public research consent + interview questionnaire (mobile-first).
 *
 * Linked from the landing page (footer). Branches Part A / Part B on the
 * "communication challenges?" answer. No backend: responses stay on the page
 * until the user copies or downloads them (privacy-friendly for interviews).
 */
import { useRef, useState, type JSX } from 'react';
import { ArrowLeft } from 'lucide-react';

import { useApp } from '../store/AppStore';
import './interview.css';

type YN = 'yes' | 'no' | null;

export function InterviewScreen(): JSX.Element {
  const { navigate } = useApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const [challenge, setChallenge] = useState<YN>(null);
  const [appUse, setAppUse] = useState<YN>(null);
  const [therapist, setTherapist] = useState<YN>(null);
  const [msg, setMsg] = useState('');

  const flash = (t: string): void => {
    setMsg(t);
    window.setTimeout(() => setMsg(''), 2500);
  };

  const collect = (): string => {
    const root = rootRef.current;
    if (!root) return '';
    const lines: string[] = ['LanguageAI — Interview responses', `Generated: ${new Date().toLocaleString()}`, ''];
    const agree = (root.querySelector('#cf-agree') as HTMLInputElement | null)?.checked ? 'Yes' : 'No';
    const rec = (root.querySelector('#cf-rec') as HTMLInputElement | null)?.checked ? 'Yes' : 'No';
    lines.push(`Consent to take part: ${agree}`, `OK to audio-record: ${rec}`, '');

    root.querySelectorAll('.cf-card').forEach((card) => {
      const heading = card.querySelector('.cf-h')?.textContent ?? '';
      const block: string[] = [];
      card.querySelectorAll<HTMLElement>('.cf-q[data-q]').forEach((q) => {
        const label = q.getAttribute('data-q') ?? '';
        const parts: string[] = [];
        q.querySelectorAll<HTMLInputElement>('input, textarea, select').forEach((inp) => {
          if (inp.type === 'radio' || inp.type === 'checkbox') {
            if (inp.checked) parts.push(inp.value);
          } else if (inp.value && inp.value.trim()) {
            parts.push(inp.value.trim());
          }
        });
        if (parts.length) block.push(`  • ${label}\n      ${parts.join(' | ')}`);
      });
      if (block.length && heading) lines.push(`— ${heading} —`, ...block, '');
    });
    return lines.join('\n').replace(/\n{3,}/g, '\n\n');
  };

  const copy = (): void => {
    const text = collect();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => flash('Copied ✓'), () => flash('Press Cmd/Ctrl+C'));
    } else {
      flash('Copy not supported');
    }
  };

  const download = (): void => {
    const blob = new Blob([collect()], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'languageai-interview.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    flash('Downloaded ✓');
  };

  return (
    <div className="cf" ref={rootRef}>
      <div className="cf-wrap">
        <button type="button" className="cf-back" onClick={() => navigate('landing')}>
          <ArrowLeft size={18} /> Back to home
        </button>

        <header>
          <span className="cf-brand">LanguageAI</span>
          <h1 className="cf-title">Family &amp; clinician interview — consent and questions</h1>
          <p className="cf-sub">
            LanguageAI is a gentle, AI-guided speech-practice companion for children, with clinical
            insight for speech-language pathologists. We&apos;d love to learn from your experience to build
            something genuinely helpful.
          </p>
        </header>

        {/* ---- Consent ---- */}
        <section className="cf-card cf-card--consent" aria-labelledby="cf-consent-h">
          <div>
            <p className="cf-eyebrow cf-eyebrow--good">Before we begin</p>
            <h2 className="cf-h" id="cf-consent-h">Your consent</h2>
          </div>
          <ul className="cf-list">
            <li>Taking part is completely <strong>voluntary</strong>. You can skip any question or stop at any time.</li>
            <li>This is a conversation for <strong>product research</strong> — not a clinical assessment or medical advice.</li>
            <li>You don&apos;t need to share identifying or medical details about your child. General experiences help most.</li>
            <li>Your responses are kept <strong>confidential</strong> and used only — de-identified — to improve the product.</li>
            <li>Estimated time: about <strong>10–15 minutes</strong>.</li>
          </ul>

          <label className="cf-choice cf-choice--wide">
            <input type="checkbox" id="cf-rec" />
            I&apos;m okay with this interview being <strong>&nbsp;audio-recorded&nbsp;</strong> for note-taking (optional).
          </label>

          <hr className="cf-divider" />

          <div className="cf-grid2">
            <fieldset className="cf-q" data-q="Participant">
              <legend className="cf-q-label">I am a…</legend>
              <div className="cf-choices">
                <label className="cf-choice"><input type="radio" name="participant" value="Parent / Guardian" /> Parent / Guardian</label>
                <label className="cf-choice"><input type="radio" name="participant" value="Clinician (SLP)" /> Clinician (SLP)</label>
                <label className="cf-choice"><input type="radio" name="participant" value="Other" /> Other</label>
              </div>
            </fieldset>
            <div className="cf-q" data-q="Name or initials">
              <label className="cf-q-label" htmlFor="cf-name">Name or initials</label>
              <input className="cf-field" id="cf-name" type="text" autoComplete="off" placeholder="e.g. A. Roy" />
            </div>
          </div>

          <div className="cf-grid2">
            <div className="cf-q" data-q="Date">
              <label className="cf-q-label" htmlFor="cf-date">Date</label>
              <input className="cf-field" id="cf-date" type="date" />
            </div>
          </div>

          <label className="cf-choice cf-choice--good cf-choice--wide">
            <input type="checkbox" id="cf-agree" />
            I have read and understood the above, and I <strong>&nbsp;agree to take part.</strong>
          </label>
        </section>

        {/* ---- Screening ---- */}
        <section className="cf-card" aria-labelledby="cf-screen-h">
          <div>
            <p className="cf-eyebrow">Section 1</p>
            <h2 className="cf-h" id="cf-screen-h">Getting to know you</h2>
          </div>

          <div className="cf-q" data-q="What is your child's age?">
            <label className="cf-q-label" htmlFor="cf-age">What is your child&apos;s age?</label>
            <span className="cf-hint">Clinicians: feel free to answer for a typical child you support.</span>
            <input className="cf-field" id="cf-age" type="text" inputMode="numeric" placeholder="e.g. 6 years" />
          </div>

          <fieldset className="cf-q" data-q="How important are good communication skills for a child's future?">
            <legend className="cf-q-label">How important do you think good communication skills are for a child&apos;s future?</legend>
            <div className="cf-choices">
              {['1 – Not important', '2', '3', '4', '5 – Very important'].map((v, i) => (
                <label key={v} className="cf-choice"><input type="radio" name="importance" value={v} /> {i === 0 ? '1' : i === 4 ? '5' : v}</label>
              ))}
            </div>
            <span className="cf-hint">1 = not important · 5 = very important</span>
          </fieldset>

          <fieldset className="cf-q" data-q="Are there communication challenges your child faces regularly?">
            <legend className="cf-q-label">Are there any communication challenges your child faces regularly?</legend>
            <div className="cf-choices">
              <label className="cf-choice"><input type="radio" name="challenges" value="Yes" onChange={() => setChallenge('yes')} /> Yes</label>
              <label className="cf-choice"><input type="radio" name="challenges" value="No" onChange={() => setChallenge('no')} /> No</label>
            </div>
          </fieldset>
        </section>

        {/* ---- Part A (Yes) ---- */}
        {challenge === 'yes' && (
          <section className="cf-card cf-card--branch" aria-labelledby="cf-partA-h">
            <div>
              <p className="cf-eyebrow">Part A · if there are challenges</p>
              <h2 className="cf-h" id="cf-partA-h">Understanding the challenges</h2>
            </div>

            <fieldset className="cf-q" data-q="Does your child face any type of speech impediment?">
              <legend className="cf-q-label">Does your child face any type of speech impediment?</legend>
              <span className="cf-hint">e.g. a stutter, a lisp, or maybe they use a lot of filler words.</span>
              <div className="cf-choices">
                {['Stutter', 'Lisp', 'Filler words', 'Not sure'].map((v) => (
                  <label key={v} className="cf-choice"><input type="checkbox" name="impediment" value={v} /> {v}</label>
                ))}
              </div>
              <input className="cf-field" type="text" placeholder="Anything else? (optional)" />
            </fieldset>

            <div className="cf-q" data-q="Main challenges while speaking">
              <label className="cf-q-label" htmlFor="cf-amain">What are the main challenges your child faces while speaking?</label>
              <span className="cf-hint">e.g. pronunciation, fluency, confidence.</span>
              <textarea className="cf-field" id="cf-amain" />
            </div>

            <fieldset className="cf-q" data-q="How often does this affect your child?">
              <legend className="cf-q-label">How often does this affect your child?</legend>
              <div className="cf-choices">
                {['Daily', 'Weekly', 'Occasionally', 'Rarely'].map((v) => (
                  <label key={v} className="cf-choice"><input type="radio" name="a_freq" value={v} /> {v}</label>
                ))}
              </div>
            </fieldset>

            <fieldset className="cf-q" data-q="Situations where the child struggles most">
              <legend className="cf-q-label">In which situations does your child struggle the most?</legend>
              <div className="cf-choices">
                {['School', 'Home', 'With strangers', 'Public speaking'].map((v) => (
                  <label key={v} className="cf-choice"><input type="checkbox" name="a_situations" value={v} /> {v}</label>
                ))}
              </div>
              <input className="cf-field" type="text" placeholder="Other situations? (optional)" />
            </fieldset>

            <div className="cf-q" data-q="Steps taken so far to support speech development">
              <label className="cf-q-label" htmlFor="cf-asteps">What steps have you taken so far to support your child&apos;s speech development?</label>
              <span className="cf-hint">e.g. home practice, online resources, therapy.</span>
              <textarea className="cf-field" id="cf-asteps" />
            </div>

            <fieldset className="cf-q" data-q="Worked with / considering a speech therapist?">
              <legend className="cf-q-label">Has your child worked with, or are you currently considering, a speech therapist?</legend>
              <div className="cf-choices">
                <label className="cf-choice"><input type="radio" name="a_therapist" value="Yes" onChange={() => setTherapist('yes')} /> Yes</label>
                <label className="cf-choice"><input type="radio" name="a_therapist" value="No" onChange={() => setTherapist('no')} /> No</label>
              </div>
              {therapist === 'yes' && <input className="cf-field" type="text" placeholder="If yes — duration or stage" />}
            </fieldset>

            {therapist === 'no' && (
              <div className="cf-q" data-q="If not — why not?">
                <label className="cf-q-label" htmlFor="cf-awhynot">If not — why not?</label>
                <textarea className="cf-field" id="cf-awhynot" />
              </div>
            )}
          </section>
        )}

        {/* ---- Part B (No) ---- */}
        {challenge === 'no' && (
          <section className="cf-card cf-card--branch cf-card--branch-good" aria-labelledby="cf-partB-h">
            <div>
              <p className="cf-eyebrow cf-eyebrow--good">Part B · if communication is strong</p>
              <h2 className="cf-h" id="cf-partB-h">What&apos;s working well</h2>
            </div>
            <div className="cf-q" data-q="What helped your child develop strong communication?">
              <label className="cf-q-label" htmlFor="cf-bhelped">What helped your child develop strong communication?</label>
              <textarea className="cf-field" id="cf-bhelped" />
            </div>
            <div className="cf-q" data-q="Any habits, routines, or environments?">
              <label className="cf-q-label" htmlFor="cf-bhabits">Any habits, routines, or environments?</label>
              <textarea className="cf-field" id="cf-bhabits" />
            </div>
            <div className="cf-q" data-q="How often do they practice speaking?">
              <label className="cf-q-label" htmlFor="cf-bpractice">How often do they practice speaking (reading, conversations, etc.)?</label>
              <input className="cf-field" id="cf-bpractice" type="text" placeholder="e.g. daily reading before bed" />
            </div>
            <div className="cf-q" data-q="What could other parents learn from your approach?">
              <label className="cf-q-label" htmlFor="cf-blearn">What do you think other parents could learn from your approach?</label>
              <textarea className="cf-field" id="cf-blearn" />
            </div>
          </section>
        )}

        {/* ---- General ---- */}
        <section className="cf-card" aria-labelledby="cf-gen-h">
          <div>
            <p className="cf-eyebrow">Section 2 · everyone</p>
            <h2 className="cf-h" id="cf-gen-h">Apps &amp; an AI companion</h2>
          </div>

          <fieldset className="cf-q" data-q="Do you use any app to improve your child's communication?">
            <legend className="cf-q-label">Do you use any application to improve your child&apos;s communication?</legend>
            <div className="cf-choices">
              <label className="cf-choice"><input type="radio" name="app_use" value="Yes" onChange={() => setAppUse('yes')} /> Yes</label>
              <label className="cf-choice"><input type="radio" name="app_use" value="No" onChange={() => setAppUse('no')} /> No</label>
            </div>
          </fieldset>

          {appUse === 'yes' && (
            <>
              <fieldset className="cf-q" data-q="How effective is it? (1–10)">
                <legend className="cf-q-label">How effective is it? <span className="cf-hint">(optional · 1–10)</span></legend>
                <input className="cf-field cf-field--sm" type="number" min={1} max={10} step={1} placeholder="1–10" />
              </fieldset>
              <div className="cf-q" data-q="Most frustrating part of using an online application">
                <label className="cf-q-label" htmlFor="cf-frust">What is the most frustrating part of using an online application? <span className="cf-hint">(optional)</span></label>
                <textarea className="cf-field" id="cf-frust" />
              </div>
            </>
          )}

          <hr className="cf-divider" />

          <fieldset className="cf-q" data-q="Comfortable with a child interacting with a friendly AI companion?">
            <legend className="cf-q-label">Would you feel comfortable with a child interacting with a friendly AI companion — like SpongeBob, Bluey, Elmo, or Bert &amp; Ernie?</legend>
            <div className="cf-choices">
              {['Yes', 'No', 'Unsure'].map((v) => (
                <label key={v} className="cf-choice"><input type="radio" name="ai_comfort" value={v} /> {v}</label>
              ))}
            </div>
            <textarea className="cf-field" placeholder="Why, or why not?" />
          </fieldset>

          <fieldset className="cf-q" data-q="Qualities an AI companion for children should have">
            <legend className="cf-q-label">What qualities should an AI companion for children have?</legend>
            <div className="cf-choices">
              {['Friendly', 'Safe', 'Patient', 'Fun', 'Educational', 'Encouraging'].map((v) => (
                <label key={v} className="cf-choice"><input type="checkbox" name="ai_qualities" value={v} /> {v}</label>
              ))}
            </div>
            <input className="cf-field" type="text" placeholder="Any other quality? (optional)" />
          </fieldset>

          <div className="cf-q" data-q="A particular feature you'd wish it to have">
            <label className="cf-q-label" htmlFor="cf-feature">Any particular feature you would wish it to have?</label>
            <textarea className="cf-field" id="cf-feature" />
          </div>
        </section>

        {/* ---- Export ---- */}
        <div className="cf-toolbar" role="group" aria-label="Save responses">
          <button type="button" className="cf-btn cf-btn--primary" onClick={copy}>Copy responses</button>
          <button type="button" className="cf-btn cf-btn--ghost" onClick={download}>Download .txt</button>
          <span className="cf-toolbar__msg" aria-live="polite">{msg}</span>
        </div>

        <p className="cf-note">
          This is a plain-language template to support product-research interviews — not legal advice.
          If this is part of formal or academic research, please have it reviewed and route it through
          your institution&apos;s ethics process (HREC / IRB) before use. Responses stay on this page until
          you copy or download them — nothing is sent anywhere automatically.
        </p>
      </div>
    </div>
  );
}
