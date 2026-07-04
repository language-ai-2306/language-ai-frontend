/** App — screen router + global reward toast, wrapped in the app store. */
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
import { QuickStartScreen } from './companion/QuickStartScreen';
import { RepeatAfterMeScreen } from './companion/RepeatAfterMeScreen';
import { SignUpScreen } from './companion/SignUpScreen';
import { TaskCompleteScreen } from './companion/TaskCompleteScreen';
import { TherapistSetupScreen } from './companion/TherapistSetupScreen';
import { VerifyEmailScreen } from './companion/VerifyEmailScreen';
import { RewardToast } from './components/RewardToast';
import { DoctorProfileScreen } from './doctor/DoctorProfileScreen';
import { NewRequestsScreen } from './doctor/NewRequestsScreen';
import { PatientDashboardScreen } from './doctor/PatientDashboardScreen';
import { PlansScreen } from './doctor/PlansScreen';
import { PlanTemplatesScreen } from './doctor/PlanTemplatesScreen';
import { PatientOverviewScreen } from './doctor/PatientOverviewScreen';
import { TherapyPlanScreen } from './doctor/TherapyPlanScreen';
import { EditTherapyPlanScreen } from './doctor/EditTherapyPlanScreen';
import { BreathingScreen } from './screens/BreathingScreen';
import { ChatScreen } from './screens/ChatScreen';
import { ReadAloudScreen } from './screens/ReadAloudScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { AppProvider, useApp } from './store/AppStore';
import './screens/screens.css';
import './App.css';

function Router(): JSX.Element {
  const { state } = useApp();
  switch (state.screen) {
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
    case 'quickStart':
      return <QuickStartScreen />;
    case 'repeatSelect':
      return <RepeatAfterMeScreen />;
    case 'assessment':
      return <AssessmentScreen />;
    case 'read':
      return <ReadAloudScreen />;
    case 'chat':
      return <ChatScreen />;
    case 'breathing':
      return <BreathingScreen />;
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
      </div>
    </AppProvider>
  );
}
