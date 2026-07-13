/**
 * ExploreTherapistsScreen — driven by the patient's therapist status:
 *   • assigned → read-only "My Therapist" (with a remove option)
 *   • pending  → the requested therapist + a "request pending" note (no browsing)
 *   • none     → browse the directory, open a therapist, ask them to take you on
 * Handles loading, empty, load errors, and the backend guard rails.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Clock, Heart } from 'lucide-react';

import { ApiError } from '../api/client';
import {
  doctorDisplayName,
  doctorInitials,
  getTherapistStatus,
  listDoctors,
  removeMyDoctor,
  requestDoctor,
  type DoctorListItem,
} from '../api/doctors';
import { useApp } from '../store/AppStore';
import './explore.css';

function Avatar({ doctor, size }: { doctor: DoctorListItem; size: 'sm' | 'lg' }): JSX.Element {
  const initials = doctorInitials(doctor.first_name, doctor.last_name);
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

const fullName = (d: DoctorListItem): string => doctorDisplayName(d.first_name, d.last_name);

function DoctorDetail({ doctor, action }: { doctor: DoctorListItem; action?: JSX.Element }): JSX.Element {
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

type Status = 'loading' | 'assigned' | 'pending' | 'none';

export function ExploreTherapistsScreen(): JSX.Element {
  const { navigate, setHasDoctor } = useApp();

  const [status, setStatus] = useState<Status>('loading');
  const [doctor, setDoctor] = useState<DoctorListItem | null>(null); // assigned or pending

  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<DoctorListItem | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');

  const [showRemove, setShowRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const loadDirectory = (): void => {
    setLoading(true);
    listDoctors()
      .then((p) => setDoctors(p.items ?? []))
      .catch((e) =>
        setLoadError(e instanceof ApiError ? e.message : 'Could not load therapists. Please try again.'),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getTherapistStatus()
      .then((s) => {
        setStatus(s.state);
        setDoctor(s.doctor);
        setHasDoctor(s.state === 'assigned');
        if (s.state === 'none') loadDirectory();
      })
      .catch(() => {
        setStatus('none');
        loadDirectory();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = async (): Promise<void> => {
    if (!selected) return;
    setRequestError('');
    setRequesting(true);
    try {
      await requestDoctor(selected.doctor_id);
      setDoctor(selected); // → show the pending view for this therapist
      setSelected(null);
      setStatus('pending');
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
      setDoctor(null);
      setHasDoctor(false);
      setStatus('none');
      loadDirectory();
    } catch (e) {
      setRemoveError(e instanceof ApiError ? e.message : 'Could not remove. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  const back = (): void => {
    if (status === 'none' && selected) setSelected(null);
    else navigate('home');
  };

  const title =
    status === 'assigned'
      ? 'My Therapist'
      : status === 'pending'
        ? 'Request Pending'
        : selected
          ? 'Therapist'
          : 'Explore Therapists';

  return (
    <div className="exp-screen">
      <header className="exp-topbar">
        <button className="exp-back" onClick={back} aria-label="Back">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="exp-title">{title}</h1>
      </header>

      <main className="exp-main">
        {status === 'loading' && <p className="exp-msg">Loading…</p>}

        {/* Assigned — read-only, with remove. */}
        {status === 'assigned' && doctor && (
          <DoctorDetail
            doctor={doctor}
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

        {/* Pending — the requested therapist, awaiting approval. No browsing. */}
        {status === 'pending' && doctor && (
          <DoctorDetail
            doctor={doctor}
            action={
              <div className="exp-pending" role="status">
                <Clock size={18} aria-hidden="true" /> Your request is pending — waiting for{' '}
                {fullName(doctor)} to accept.
              </div>
            }
          />
        )}

        {/* None + a selected doctor → detail with the ask action. */}
        {status === 'none' && selected && (
          <DoctorDetail
            doctor={selected}
            action={
              <>
                {requestError && <p className="exp-error" role="alert">{requestError}</p>}
                <button type="button" className="exp-ask" onClick={ask} disabled={requesting}>
                  {requesting ? 'Sending…' : `Ask ${fullName(selected)} to be my therapist`}
                </button>
              </>
            }
          />
        )}

        {/* None + no selection → the directory list. */}
        {status === 'none' && !selected && (
          <>
            {loading && <p className="exp-msg">Finding therapists…</p>}
            {!loading && loadError && <p className="exp-error" role="alert">{loadError}</p>}
            {!loading && !loadError && doctors.length === 0 && (
              <p className="exp-msg">No therapists are available right now. Please check back later.</p>
            )}
            <div className="exp-list">
              {doctors.map((d) => (
                <button
                  key={d.doctor_id}
                  type="button"
                  className="exp-card"
                  onClick={() => {
                    setSelected(d);
                    setRequestError('');
                  }}
                >
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

      {showRemove && doctor && (
        <div className="exp-modal" role="dialog" aria-modal="true">
          <div className="exp-modal__card">
            <h2 className="exp-modal__title">Remove your therapist?</h2>
            <p className="exp-modal__body">
              You&apos;ll be unlinked from <strong>{fullName(doctor)}</strong>. You can explore and
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
