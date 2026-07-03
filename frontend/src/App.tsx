/** App — screen router + global reward toast, wrapped in the app store. */
import { AssessmentScreen } from './companion/AssessmentScreen';
import { DailyCompleteScreen } from './companion/DailyCompleteScreen';
import { ExerciseScreen } from './companion/ExerciseScreen';
import { HomeScreen } from './companion/HomeScreen';
import { LevelCompleteScreen } from './companion/LevelCompleteScreen';
import { LoginScreen } from './companion/LoginScreen';
import { OllieScreen } from './companion/OllieScreen';
import { OnboardingCompleteScreen } from './companion/OnboardingCompleteScreen';
import { ProfileSetupScreen } from './companion/ProfileSetupScreen';
import { QuickStartScreen } from './companion/QuickStartScreen';
import { RepeatAfterMeScreen } from './companion/RepeatAfterMeScreen';
import { SignUpScreen } from './companion/SignUpScreen';
import { TherapistSetupScreen } from './companion/TherapistSetupScreen';
import { VerifyEmailScreen } from './companion/VerifyEmailScreen';
import { RewardToast } from './components/RewardToast';
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
