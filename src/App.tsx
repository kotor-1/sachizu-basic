import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { CMJFlow } from './components/CMJFlow';
import { RJFlow } from './components/RJFlow';
import { SprintFlow } from './components/SprintFlow';
import { SquatFlow } from './components/SquatFlow';
import { ConsultationPage } from './components/ConsultationPage';
import { OnlinePersonalPage } from './components/OnlinePersonalPage';
import { HelpModal } from './components/HelpModal';
import { TutorialModal } from './components/TutorialModal';
import { TutorialScreenKey } from './content/helpContent';
import { hasSeenTutorial, markTutorialSeen } from './utils/tutorialStorage';
import { goBack, useRoute } from './router';

type CurrentScreen = 'home' | 'cmj' | 'rj' | 'sprint' | 'squat';

const isTutorialScreen = (screen: CurrentScreen): screen is TutorialScreenKey =>
  screen !== 'home';

export function App() {
  const [screen, setScreen] = useState<CurrentScreen>('home');
  const [helpOpen, setHelpOpen] = useState(false);
  const [tutorialFor, setTutorialFor] = useState<TutorialScreenKey | null>(null);
  const route = useRoute();

  // 各種目（CMJ/RJ/10m/SQUAT）を初めて開いた時だけ、簡易チュートリアルを自動表示する。
  // 一度最後まで進める/スキップすると localStorage に記録し、以後は自動表示しない。
  useEffect(() => {
    if (!isTutorialScreen(screen)) return;
    if (hasSeenTutorial(screen)) return;
    setTutorialFor(screen);
  }, [screen]);

  const handleFinishTutorial = () => {
    if (tutorialFor) markTutorialSeen(tutorialFor);
    setTutorialFor(null);
  };

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
        onHelpClick={isPage ? undefined : () => setHelpOpen(true)}
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

      {!isPage && (
        <>
          <HelpModal
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
            screenKey={screen}
            onReplayTutorial={
              isTutorialScreen(screen)
                ? () => {
                    setHelpOpen(false);
                    setTutorialFor(screen);
                  }
                : undefined
            }
          />
          <TutorialModal
            open={tutorialFor !== null && tutorialFor === screen}
            screenKey={tutorialFor ?? 'cmj'}
            onFinish={handleFinishTutorial}
          />
        </>
      )}
    </div>
  );
}

export default App;
