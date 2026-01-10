import { useState } from 'react';
import { useGameStore } from './stores/gameStore';
import { useDraftStore } from './stores/draftStore';
import { useSeasonStore } from './stores/seasonStore';
import { useLeagueStore } from './stores/leagueStore';
import { MainLayout } from './components/Layout/MainLayout';
import { WeeklyDashboard } from './components/Management/WeeklyDashboard';
import { PlayDesigner } from './components/PlayDesigner/PlayDesigner';
import { PlaybookPage } from './components/Playbook/PlaybookPage';
import { CardGameController } from './components/Game/CardGameController';
import { FranchiseDashboard } from './components/Franchise/FranchiseDashboard';
import { ScoutingCenter } from './components/Scouting/ScoutingCenter';
import { DraftPage } from './components/Draft/DraftPage';
import { FreeAgencyPage } from './components/FreeAgency/FreeAgencyPage';
import { StartScreen, FranchiseIntro, GMNameInput } from './components/intro';
import { FantasyDraft } from './components/Draft/FantasyDraft';
import { DEFAULT_TEAMS } from './data/defaultTeams';

type Page = 'home' | 'playbook' | 'designer' | 'gameday' | 'roster' | 'scouting' | 'draft' | 'freeagency';

function App() {
  const { gamePhase, userTeamId, setPhase, initializeGame, setDraftedRoster } = useGameStore();
  const { season, initializeSeason, getCurrentUserGame } = useSeasonStore();
  const { initializeSeason: initializeLeague } = useLeagueStore();
  const [currentPage, setCurrentPage] = useState<Page>('home');

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

            // Initialize season with schedule
            const leagueTeams = DEFAULT_TEAMS.map((t, idx) => ({
              id: t.info.id,
              name: t.info.name,
              city: t.info.city,
              abbreviation: t.info.abbreviation,
              colors: { primary: t.info.primaryColor, secondary: t.info.secondaryColor },
              isUserTeam: idx === 3,
              rivalryTeams: [],
              prestige: t.info.prestige,
            }));
            initializeSeason(DEFAULT_TEAMS[3].info.id, leagueTeams);

            // Initialize the league standings system (7 AI teams + 1 user)
            initializeLeague(DEFAULT_TEAMS[3].info.id);

            setPhase('desk');
          }}
        />
      );
    case 'desk':
      // Continue to main game
      break;
  }

  // Home page uses the weekly dashboard (card game hub)
  if (currentPage === 'home') {
    const currentGame = getCurrentUserGame();
    const opponent = currentGame
      ? DEFAULT_TEAMS.find(t =>
          t.info.id === (currentGame.homeTeamId === userTeamId ? currentGame.awayTeamId : currentGame.homeTeamId)
        )
      : null;
    const userStanding = season?.standings.find(s => s.teamId === userTeamId);

    return (
      <WeeklyDashboard
        opponentName={opponent?.info.name || 'TBD'}
        opponentRecord={opponent ? '0-0' : ''}
        gameDate={`Week ${season?.currentWeek || 1}`}
        playerRecord={userStanding ? `${userStanding.wins}-${userStanding.losses}` : '0-0'}
        onPlayGame={() => setCurrentPage('gameday')}
      />
    );
  }

  // Game day is full-screen without sidebar
  if (currentPage === 'gameday') {
    return <CardGameController onBack={() => setCurrentPage('home')} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'designer': return <PlayDesigner />;
      case 'playbook': return <PlaybookPage />;
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
