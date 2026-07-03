/**
 * ExploreTherapistsScreen — two modes decided by whether the patient already has
 * an assigned therapist (GET /doctors/my):
 *   • Has one  → read-only "My Therapist" details (no request, no editing).
 *   • Has none → browse the directory, open a therapist, and ask them to take you
 *                on (POST /doctors/{id}/request).
 * Handles loading, empty, load errors, request success, and the backend guard
 * rails (already linked / already have a pending request).
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Check, Heart } from 'lucide-react';

import { ApiError } from '../api/client';
import {
  getMyDoctor,
  listDoctors,
  removeMyDoctor,
  requestDoctor,
  type DoctorListItem,
} from '../api/doctors';
import { useApp } from '../store/AppStore';
import './explore.css';

function Avatar({ doctor, size }: { doctor: DoctorListItem; size: 'sm' | 'lg' }): JSX.Element {
  const initials = `${doctor.first_name[0] ?? ''}${doctor.last_name[0] ?? ''}`.toUpperCase();
  const cls = `exp-avatar exp-avatar--${size}`;
  if (doctor.photo_url) {
    return <img className={cls} src={doctor.photo_url} alt={`${doctor.first_name} ${doctor.last_name}`} />;
  }
  return (
    <span className={cls} aria-hidden="true">
      {initials || '🩺'}
    </span>
  );
}

const fullName = (d: DoctorListItem): string => `Dr. ${d.first_name} ${d.last_name}`;

/** Detail body, reused for both the read-only assigned view and the request view. */
function DoctorDetail({
  doctor,
  action,
}: {
  doctor: DoctorListItem;
  action?: JSX.Element; // ask button / sent / error — omitted in read-only mode
}): JSX.Element {
  return (
    <div className="exp-detail">
      <Avatar doctor={doctor} size="lg" />
      <h2 className="exp-detail__name">{fullName(doctor)}</h2>
      <p className="exp-detail__qual">
        <BadgeCheck size={16} aria-hidden="true" /> {doctor.qualification}
      </p>
      <h3 className="exp-detail__label">About</h3>
      <p className="exp-detail__bio">{doctor.bio}</p>
      {action}
    </div>
  );
}

export function ExploreTherapistsScreen(): JSX.Element {
  const { state, navigate, setHasDoctor } = useApp();

  const [checking, setChecking] = useState(true);
  const [myDoctor, setMyDoctor] = useState<DoctorListItem | null>(null);

  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [selected, setSelected] = useState<DoctorListItem | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [sent, setSent] = useState(false);

  const [showRemove, setShowRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const loadDirectory = (): void => {
    setLoading(true);
    listDoctors()
      .then((p) => setDoctors(p.items))
      .catch((e) =>
        setLoadError(e instanceof ApiError ? e.message : 'Could not load therapists. Please try again.'),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // "Explore Therapists" → browse the directory directly (no /doctors/my).
    if (state.therapistView === 'explore') {
      setChecking(false);
      loadDirectory();
      return;
    }
    // "My Therapist" → assigned? read-only view; otherwise browse the directory.
    getMyDoctor()
      .then((d) => {
        setChecking(false);
        if (d) {
          setMyDoctor(d);
          setHasDoctor(true); // keep the app's flag in sync with the backend
        } else {
          setHasDoctor(false);
          loadDirectory();
        }
      })
      .catch(() => {
        setChecking(false);
        loadDirectory(); // if the check fails, fall back to browsing
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = (d: DoctorListItem): void => {
    setSelected(d);
    setRequestError('');
    setSent(false);
  };

  const ask = async (): Promise<void> => {
    if (!selected) return;
    setRequestError('');
    setRequesting(true);
    try {
      await requestDoctor(selected.doctor_id);
      setSent(true);
    } catch (e) {
      setRequestError(e instanceof ApiError ? e.message : 'Could not send the request. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  const doRemove = async (): Promise<void> => {
    setRemoveError('');
    setRemoving(true);
    try {
      await removeMyDoctor();
      setShowRemove(false);
      setMyDoctor(null);
      setHasDoctor(false);
      loadDirectory(); // now unlinked → let them browse for a new one
    } catch (e) {
      setRemoveError(e instanceof ApiError ? e.message : 'Could not remove. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  // Back: from a selected doctor → the list; otherwise → home.
  const back = (): void => {
    if (selected && !myDoctor) setSelected(null);
    else navigate('home');
  };

  const title = myDoctor ? 'My Therapist' : selected ? 'Therapist' : 'Explore Therapists';

  return (
    <div className="exp-screen">
      <header className="exp-topbar">
        <button className="exp-back" onClick={back} aria-label="Back">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="exp-title">{title}</h1>
      </header>

      <main className="exp-main">
        {checking && <p className="exp-msg">Loading…</p>}

        {/* Assigned therapist — read-only, with a remove option. */}
        {!checking && myDoctor && (
          <DoctorDetail
            doctor={myDoctor}
            action={
              <>
                <div className="exp-sent" role="status">
                  <Heart size={18} aria-hidden="true" /> This is your therapist.
                </div>
                {removeError && <p className="exp-error" role="alert">{removeError}</p>}
                <button type="button" className="exp-remove" onClick={() => setShowRemove(true)}>
                  Remove therapist
                </button>
              </>
            }
          />
        )}

        {/* Browsing — a selected doctor's detail + request action. */}
        {!checking && !myDoctor && selected && (
          <DoctorDetail
            doctor={selected}
            action={
              <>
                {requestError && <p className="exp-error" role="alert">{requestError}</p>}
                {sent ? (
                  <div className="exp-sent" role="status">
                    <Check size={20} aria-hidden="true" /> Request sent! {fullName(selected)} will review it soon.
                  </div>
                ) : (
                  <button type="button" className="exp-ask" onClick={ask} disabled={requesting}>
                    {requesting ? 'Sending…' : `Ask ${fullName(selected)} to be my therapist`}
                  </button>
                )}
              </>
            }
          />
        )}

        {/* Browsing — the directory list. */}
        {!checking && !myDoctor && !selected && (
          <>
            {loading && <p className="exp-msg">Finding therapists…</p>}
            {!loading && loadError && <p className="exp-error" role="alert">{loadError}</p>}
            {!loading && !loadError && doctors.length === 0 && (
              <p className="exp-msg">No therapists are available right now. Please check back later.</p>
            )}
            <div className="exp-list">
              {doctors.map((d) => (
                <button key={d.doctor_id} type="button" className="exp-card" onClick={() => openDetail(d)}>
                  <Avatar doctor={d} size="sm" />
                  <span className="exp-card__body">
                    <span className="exp-card__name">{fullName(d)}</span>
                    <span className="exp-card__qual">{d.qualification}</span>
                    <span className="exp-card__bio">{d.bio}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </main>

      {showRemove && myDoctor && (
        <div className="exp-modal" role="dialog" aria-modal="true">
          <div className="exp-modal__card">
            <h2 className="exp-modal__title">Remove your therapist?</h2>
            <p className="exp-modal__body">
              You&apos;ll be unlinked from <strong>{fullName(myDoctor)}</strong>. You can explore and
              choose a new therapist anytime.
            </p>
            <button type="button" className="exp-modal__confirm" onClick={doRemove} disabled={removing}>
              {removing ? 'Removing…' : 'Yes, remove'}
            </button>
            <button type="button" className="exp-modal__cancel" onClick={() => setShowRemove(false)}>
              Keep therapist
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
