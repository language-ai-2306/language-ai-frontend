/** App — screen router + global reward toast, wrapped in the app store. */
import { RewardToast } from './components/RewardToast';
import { BreathingScreen } from './screens/BreathingScreen';
import { ChatScreen } from './screens/ChatScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ReadAloudScreen } from './screens/ReadAloudScreen';
import { RepeatScreen } from './screens/RepeatScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { AppProvider, useApp } from './store/AppStore';
import './screens/screens.css';
import './App.css';

function Router(): JSX.Element {
  const { state } = useApp();
  switch (state.screen) {
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
