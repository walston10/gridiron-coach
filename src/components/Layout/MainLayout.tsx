import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

type Page = 'home' | 'playbook' | 'designer' | 'gameday' | 'roster' | 'scouting' | 'draft' | 'freeagency' | 'playviewer' | 'keyframe';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentPage,
  onNavigate,
}) => {
  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};