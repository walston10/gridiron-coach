import { useState } from 'react';
import { useGameStore } from './stores/gameStore';
import { useDraftStore } from './stores/draftStore';
import { MainLayout } from './components/Layout/MainLayout';
import { DeskPage } from './components/Desk';
import { PlayDesigner } from './components/PlayDesigner/PlayDesigner';
import { PlaybookPage } from './components/Playbook/PlaybookPage';
import { GameDayPage } from './components/GameDay/GameDayPage';
import { FranchiseDashboard } from './components/Franchise/FranchiseDashboard';
import { ScoutingCenter } from './components/Scouting/ScoutingCenter';
import { DraftPage } from './components/Draft/DraftPage';
import { FreeAgencyPage } from './components/FreeAgency/FreeAgencyPage';
import { StartScreen, FranchiseIntro, GMNameInput } from './components/intro';
import { FantasyDraft } from './components/Draft/FantasyDraft';

type Page = 'home' | 'playbook' | 'designer' | 'gameday' | 'roster' | 'scouting' | 'draft' | 'freeagency';

function App() {
  const { gamePhase, teams, userTeamId, ownerType, setPhase, initializeGame, setDraftedRoster } = useGameStore();
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const userTeam = teams.find(t => t.info.id === userTeamId);

  // Intro flow - render based on gamePhase
  switch (gamePhase) {
    case 'start':
      return <StartScreen />;
    case 'intro':
      return <FranchiseIntro />;
    case 'nameInput':
      return <GMNameInput />;
    case 'draft':
      return (
        <FantasyDraft
          onComplete={() => {
            // Get draft results and save them for the card game
            const draftResults = useDraftStore.getState().getDraftResults();
            if (draftResults) {
              setDraftedRoster(draftResults.roster, draftResults.deck);
            }
            // Initialize game (generates AI team rosters)
            initializeGame(3);
            setPhase('desk');
          }}
        />
      );
    case 'desk':
      // Continue to main game
      break;
  }

  // Home page uses the full-screen desk view (no sidebar)
  if (currentPage === 'home') {
    return (
      <DeskPage
        teamName={userTeam?.info.name || 'Moles'}
        ownerId={ownerType}
        onStartGame={() => setCurrentPage('gameday')}
        onGameOver={(reason) => {
          console.log('Game over:', reason);
          // TODO: Handle game over state
        }}
      />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'designer': return <PlayDesigner />;
      case 'playbook': return <PlaybookPage />;
      case 'gameday': return <GameDayPage onNavigate={(page) => setCurrentPage(page as Page)} />;
      case 'roster': return <FranchiseDashboard />;
      case 'scouting': return <ScoutingCenter />;
      case 'draft': return <DraftPage />;
      case 'freeagency': return <FreeAgencyPage />;
      default: return null;
    }
  };

  return (
    <MainLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </MainLayout>
  );
}

export default App;
