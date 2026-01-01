import React, { useState } from 'react';
import { useGameStore } from './stores/gameStore';
import { MainLayout } from './components/Layout/MainLayout';
import { Dashboard } from './components/Home/Dashboard';
import { PlayDesigner } from './components/PlayDesigner/PlayDesigner';
import { PlaybookPage } from './components/Playbook/PlaybookPage';
import { GameDayPage } from './components/GameDay/GameDayPage';
import { FranchiseDashboard } from './components/Franchise/FranchiseDashboard';
import { ScoutingCenter } from './components/Scouting/ScoutingCenter';
import { DraftPage } from './components/Draft/DraftPage';
import { FreeAgencyPage } from './components/FreeAgency/FreeAgencyPage';

type Page = 'home' | 'playbook' | 'designer' | 'gameday' | 'roster' | 'scouting' | 'draft' | 'freeagency';

function App() {
  const { userTeamId, initializeGame } = useGameStore();
  const [currentPage, setCurrentPage] = useState<Page>('home');

  if (!userTeamId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-8">🏈 Gridiron Coach</h1>
          <p className="text-gray-400 mb-8">Build your dynasty. Call the shots.</p>
          <button
            onClick={() => initializeGame(3)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-bold"
          >
            Start New Franchise
          </button>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <Dashboard />;
      case 'designer': return <PlayDesigner />;
      case 'playbook': return <PlaybookPage />;
      case 'gameday': return <GameDayPage onNavigate={(page) => setCurrentPage(page as Page)} />;
      case 'roster': return <FranchiseDashboard />;
      case 'scouting': return <ScoutingCenter />;
      case 'draft': return <DraftPage />;
      case 'freeagency': return <FreeAgencyPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <MainLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </MainLayout>
  );
}

export default App;
