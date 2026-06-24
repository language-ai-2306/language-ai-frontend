/** App — screen router + global reward toast, wrapped in the app store. */
import { CompanionScreen } from './companion/CompanionScreen';
import { HomeScreen } from './companion/HomeScreen';
import { LoginScreen } from './companion/LoginScreen';
import { ProfilesScreen } from './companion/ProfilesScreen';
import { RewardToast } from './components/RewardToast';
import { BreathingScreen } from './screens/BreathingScreen';
import { ChatScreen } from './screens/ChatScreen';
import { ReadAloudScreen } from './screens/ReadAloudScreen';
import { RepeatScreen } from './screens/RepeatScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { AppProvider, useApp } from './store/AppStore';
import './screens/screens.css';
import './App.css';

function Router(): JSX.Element {
  const { state } = useApp();
  switch (state.screen) {
    case 'login':
      return <LoginScreen />;
    case 'profiles':
      return <ProfilesScreen />;
    case 'repeat':
      return <RepeatScreen />;
    case 'read':
      return <ReadAloudScreen />;
    case 'chat':
      return <ChatScreen />;
    case 'breathing':
      return <BreathingScreen />;
    case 'summary':
      return <SummaryScreen />;
    case 'companion':
      return <CompanionScreen />;
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
