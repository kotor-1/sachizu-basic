import { useState } from 'react';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { CMJFlow } from './components/CMJFlow';
import { RJFlow } from './components/RJFlow';
import { SprintFlow } from './components/SprintFlow';
import { SquatFlow } from './components/SquatFlow';

type CurrentScreen = 'home' | 'cmj' | 'rj' | 'sprint' | 'squat';

export function App() {
  const [screen, setScreen] = useState<CurrentScreen>('home');

  const getTitle = () => {
    switch (screen) {
      case 'cmj':
        return 'CMJ';
      case 'rj':
        return 'RJ';
      case 'sprint':
        return '10m SPRINT';
      case 'squat':
        return 'SQUAT';
      default:
        return 'SACHIZU BASIC';
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 flex flex-col font-sans selection:bg-zinc-900 selection:text-white">
      <Header
        title={getTitle()}
        showBack={screen !== 'home'}
        onBack={() => setScreen('home')}
      />

      <main className="flex-1 pb-8">
        {screen === 'home' && (
          <HomeScreen
            onSelectCMJ={() => setScreen('cmj')}
            onSelectRJ={() => setScreen('rj')}
            onSelectSprint={() => setScreen('sprint')}
            onSelectSquat={() => setScreen('squat')}
          />
        )}
        {screen === 'cmj' && <CMJFlow />}
        {screen === 'rj' && <RJFlow />}
        {screen === 'sprint' && <SprintFlow />}
        {screen === 'squat' && <SquatFlow />}
      </main>
    </div>
  );
}

export default App;
