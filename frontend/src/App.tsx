/** App — screen router + global reward toast, wrapped in the app store. */
import { useEffect } from 'react';

import { AccountScreen } from './companion/AccountScreen';
import { AssessmentScreen } from './companion/AssessmentScreen';
import { DailyCompleteScreen } from './companion/DailyCompleteScreen';
import { ExerciseScreen } from './companion/ExerciseScreen';
import { ExploreTherapistsScreen } from './companion/ExploreTherapistsScreen';
import { HomeScreen } from './companion/HomeScreen';
import { LevelCompleteScreen } from './companion/LevelCompleteScreen';
import { LoginScreen } from './companion/LoginScreen';
import { OllieScreen } from './companion/OllieScreen';
import { OnboardingCompleteScreen } from './companion/OnboardingCompleteScreen';
import { ProfileScreen } from './companion/ProfileScreen';
import { ProfileSetupScreen } from './companion/ProfileSetupScreen';
import { RepeatAfterMeScreen } from './companion/RepeatAfterMeScreen';
import { SignUpScreen } from './companion/SignUpScreen';
import { TaskCompleteScreen } from './companion/TaskCompleteScreen';
import { TherapistSetupScreen } from './companion/TherapistSetupScreen';
import { VerifyEmailScreen } from './companion/VerifyEmailScreen';
import { RewardToast } from './components/RewardToast';
import { SilentSoundToast } from './components/SilentSoundToast';
import { DoctorProfileScreen } from './doctor/DoctorProfileScreen';
import { NewRequestsScreen } from './doctor/NewRequestsScreen';
import { PatientDashboardScreen } from './doctor/PatientDashboardScreen';
import { PlansScreen } from './doctor/PlansScreen';
import { PlanTemplatesScreen } from './doctor/PlanTemplatesScreen';
import { PatientOverviewScreen } from './doctor/PatientOverviewScreen';
import { TherapyPlanScreen } from './doctor/TherapyPlanScreen';
import { EditTherapyPlanScreen } from './doctor/EditTherapyPlanScreen';
import { LandingScreen } from './landing/LandingScreen';
import { InterviewScreen } from './landing/InterviewScreen';
import { LeaderboardScreen } from './leaderboard/LeaderboardScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { AppProvider, useApp, type Screen } from './store/AppStore';
import './screens/screens.css';
import './App.css';

/** Screens that render without a bearer token: the marketing site and the whole
 *  sign-up / sign-in flow. Every other screen calls the authenticated API. */
const PUBLIC_SCREENS: ReadonlySet<Screen> = new Set<Screen>([
  'landing',
  'interview',
  // The school leaderboard is deliberately open to anyone — no login. Its API path
  // is whitelisted in client.ts (PUBLIC_PATHS) too; both are needed.
  'leaderboard',
  'login',
  'signup',
  'verifyEmail',
  'profileSetup',
  'therapistSetup',
  'onboardingComplete',
]);

/** Clinician-portal screens. They read /doctors/* , which a patient's token
 *  cannot access, so a non-doctor must never mount them. */
const DOCTOR_SCREENS: ReadonlySet<Screen> = new Set<Screen>([
  'docPatients',
  'docPatientDetail',
  'docRequests',
  'docProfile',
  'docPlans',
  'docPlanTemplates',
  'docTherapyPlan',
  'docEditTherapyPlan',
]);

function Router(): JSX.Element {
  const { state, navigate } = useApp();
  const { screen, authToken, role } = state;

  // Auth guard. Screens fetch on mount, so a signed-out screen (deep link, stale
  // tab, expired token) would otherwise fire its requests with no Authorization
  // header, take a 401, and only *then* bounce to login. Decide before rendering:
  // the guarded screen must never mount, not even for one frame.
  const signedOut = !authToken && !PUBLIC_SCREENS.has(screen);
  // Role is null only for a session persisted before roles existed — don't lock
  // a real doctor out over that; the token guard above still applies.
  const wrongRole = !signedOut && DOCTOR_SCREENS.has(screen) && role !== null && role !== 'DOCTOR';

  // Keep store + history in step with what we actually render, so Back doesn't
  // return to the screen we just refused.
  useEffect(() => {
    if (signedOut) navigate('login');
    else if (wrongRole) navigate('home');
  }, [signedOut, wrongRole, navigate]);

  if (signedOut) return <LoginScreen />;
  if (wrongRole) return <HomeScreen />;

  switch (screen) {
    case 'landing':
      return <LandingScreen />;
    case 'interview':
      return <InterviewScreen />;
    case 'leaderboard':
      return <LeaderboardScreen />;
    case 'login':
      return <LoginScreen />;
    case 'signup':
      return <SignUpScreen />;
    case 'verifyEmail':
      return <VerifyEmailScreen />;
    case 'profileSetup':
      return <ProfileSetupScreen />;
    case 'therapistSetup':
      return <TherapistSetupScreen />;
    case 'onboardingComplete':
      return <OnboardingCompleteScreen />;
    case 'repeatSelect':
      return <RepeatAfterMeScreen />;
    case 'assessment':
      return <AssessmentScreen />;
    case 'summary':
      return <SummaryScreen />;
    case 'companion':
      // Talk with Ollie runs the live conversation; the other four run the shared
      // single-shot exercise flow (/v1/exercises/{game}).
      return state.currentGame === 'TALK_WITH_OLLIE' ? <OllieScreen /> : <ExerciseScreen />;
    case 'levelComplete':
      return <LevelCompleteScreen />;
    case 'dailyComplete':
      return <DailyCompleteScreen />;
    case 'taskComplete':
      return <TaskCompleteScreen />;
    case 'account':
      return <AccountScreen />;
    case 'explore':
      return <ExploreTherapistsScreen />;
    case 'profile':
      return <ProfileScreen />;
    case 'docPatients':
      return <PatientDashboardScreen />;
    case 'docPatientDetail':
      return <PatientOverviewScreen />;
    case 'docRequests':
      return <NewRequestsScreen />;
    case 'docProfile':
      return <DoctorProfileScreen />;
    case 'docPlans':
      return <PlansScreen />;
    case 'docPlanTemplates':
      return <PlanTemplatesScreen />;
    case 'docTherapyPlan':
      return <TherapyPlanScreen />;
    case 'docEditTherapyPlan':
      return <EditTherapyPlanScreen />;
    case 'home':
    default:
      return <HomeScreen />;
  }
}

export default function App(): JSX.Element {
  return (
    <AppProvider>
      <div className="app-shell">
        <Router />
        <RewardToast />
        <SilentSoundToast />
      </div>
    </AppProvider>
  );
}
