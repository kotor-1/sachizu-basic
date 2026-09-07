import { useState } from 'react';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { CMJFlow } from './components/CMJFlow';
import { RJFlow } from './components/RJFlow';
import { SprintFlow } from './components/SprintFlow';
import { SquatFlow } from './components/SquatFlow';
import { ConsultationPage } from './components/ConsultationPage';
import { OnlinePersonalPage } from './components/OnlinePersonalPage';
import { goBack, useRoute } from './router';

type CurrentScreen = 'home' | 'cmj' | 'rj' | 'sprint' | 'squat';

export function App() {
  const [screen, setScreen] = useState<CurrentScreen>('home');
  const route = useRoute();

  const isPage = route.kind === 'page';

  const getTitle = () => {
    if (route.kind === 'page') {
      return route.page === 'consultation' ? '無料相談' : 'オンラインパーソナル';
    }
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

  const getRightLabel = () => {
    if (route.kind === 'page') {
      return route.page === 'consultation' ? 'CONSULTATION' : 'PERSONAL';
    }
    return 'MEASUREMENT';
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 flex flex-col font-sans selection:bg-zinc-900 selection:text-white">
      <Header
        title={getTitle()}
        rightLabel={getRightLabel()}
        showBack={isPage || screen !== 'home'}
        onBack={isPage ? goBack : () => setScreen('home')}
      />

      <main className="flex-1 pb-8">
        {/*
          測定画面は URL を持たず state で管理する従来構成のまま。
          相談ページ表示中もアンマウントせず hidden で隠すことで、
          測定結果を表示したままページを見に行き、戻って続けられる。
        */}
        <div hidden={isPage}>
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
        </div>

        {route.kind === 'page' && route.page === 'consultation' && <ConsultationPage />}
        {route.kind === 'page' && route.page === 'online-personal' && <OnlinePersonalPage />}
      </main>
    </div>
  );
}

export default App;
