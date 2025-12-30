import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { FourFactors } from './components/FourFactors';
import { ScoutingReport } from './components/ScoutingReport';
import { MomentumTracker } from './components/MomentumTracker';
import { PlayerComparison } from './components/PlayerComparison';
import { CoachAssistant } from './components/CoachAssistant';
import { Reports } from './components/Reports';
import { StatsInput } from './components/StatsInput';
import { View } from './types';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { GameProvider, useGame } from './context/GameContext';
import { ExplainerProvider } from './components/Explainer';

const NAV_ITEMS = [
  { view: View.DASHBOARD, icon: 'dashboard', label: 'nav.dashboard' },
  { view: View.FOUR_FACTORS, icon: 'analytics', label: 'nav.factors' },
  { view: View.INPUT_STATS, icon: 'edit_note', label: 'nav.input' },
  { view: View.REPORTS, icon: 'description', label: 'nav.reports' },
  { view: View.MOMENTUM, icon: 'query_stats', label: 'nav.flow' },
  { view: View.COMPARISON, icon: 'compare_arrows', label: 'nav.compare' },
];

const AppContent: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  const { language, setLanguage, t } = useLanguage();
  const { homeStats } = useGame();

  const renderContent = () => {
    switch (activeView) {
      case View.DASHBOARD: return <Dashboard />;
      case View.FOUR_FACTORS: return <FourFactors />;
      case View.SCOUTING: return <ScoutingReport />;
      case View.MOMENTUM: return <MomentumTracker />;
      case View.COMPARISON: return <PlayerComparison />;
      case View.REPORTS: return <Reports />;
      case View.AI_COACH: return <CoachAssistant />;
      case View.INPUT_STATS: return <StatsInput />;
      default: return <Dashboard />;
    }
  };

  const getTitle = () => {
    switch (activeView) {
      case View.DASHBOARD: return t('dash.title');
      case View.FOUR_FACTORS: return t('factors.title');
      case View.SCOUTING: return t('scout.title');
      case View.MOMENTUM: return t('mom.title');
      case View.COMPARISON: return t('comp.title');
      case View.REPORTS: return t('rep.title');
      case View.AI_COACH: return t('ai.title');
      case View.INPUT_STATS: return t('input.title');
      default: return 'BasketIQ';
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'es' ? 'en' : 'es');
  };

  return (
    <div className="min-h-screen bg-background-dark font-display text-white flex flex-col md:flex-row overflow-hidden relative">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-dark border-r border-gray-800 z-50 shrink-0">
         <div className="p-6 border-b border-gray-800">
            <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl">sports_basketball</span>
              BasketIQ<span className="text-white">Pro</span>
            </h1>
            
            {/* Team Logo Section */}
            <div className="mt-6 flex items-center gap-3 bg-background-dark/40 p-3 rounded-xl border border-gray-700/50 group hover:border-primary/30 transition-colors">
               <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-all">
                  <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">shield</span>
               </div>
               <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Active Team</p>
                  <p className="text-sm font-bold text-white leading-none truncate">{homeStats.name || 'Set Team Name'}</p>
               </div>
            </div>
         </div>
         <nav className="flex-1 px-3 py-6 flex flex-col gap-2 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
               <button 
                 key={item.view}
                 onClick={() => setActiveView(item.view)}
                 className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                   activeView === item.view 
                     ? 'bg-primary/10 text-primary font-bold' 
                     : 'text-gray-400 hover:bg-white/5 hover:text-white'
                 }`}
               >
                 <span className={`material-symbols-outlined ${activeView === item.view ? 'fill-current' : ''}`}>{item.icon}</span>
                 <span className="text-sm">{t(item.label)}</span>
               </button>
            ))}
         </nav>
         <div className="p-4 border-t border-gray-800">
            <button onClick={toggleLanguage} className="flex w-full items-center justify-center gap-2 rounded-lg bg-background-dark px-4 py-2 text-sm font-bold border border-gray-700 hover:bg-gray-800 transition-colors">
              <span className="material-symbols-outlined text-lg">language</span>
              {language === 'es' ? 'Español' : 'English'}
            </button>
         </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Mobile Top Bar */}
        <header className="md:hidden sticky top-0 z-50 bg-background-dark/95 backdrop-blur-md border-b border-gray-800 flex items-center justify-between p-4 shrink-0">
           <button onClick={() => setActiveView(View.DASHBOARD)} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-gray-200">arrow_back</span>
           </button>
           <h1 className="text-lg font-bold leading-tight tracking-tight">{getTitle()}</h1>
           <button onClick={toggleLanguage} className="flex h-10 items-center justify-center rounded-full bg-surface-dark px-3 text-xs font-bold border border-gray-700 hover:bg-gray-800 transition-colors">
              {language.toUpperCase()}
           </button>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-5 bg-background-dark border-b border-gray-800 shrink-0">
           <div>
              <h2 className="text-2xl font-bold">{getTitle()}</h2>
              <p className="text-sm text-gray-400">Team Analytics Dashboard</p>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-surface-dark px-3 py-1.5 rounded-full border border-gray-700">
                 <div className="size-2 bg-success rounded-full animate-pulse"></div>
                 <span className="text-xs font-mono text-gray-300">LIVE DATA</span>
              </div>
              <div className="size-10 rounded-full bg-gray-700 overflow-hidden border-2 border-primary">
                 <img src="https://ui-avatars.com/api/?name=Coach+K&background=random" alt="Profile" />
              </div>
           </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-background-dark">
          <div className="max-w-7xl mx-auto w-full h-full">
             {renderContent()}
          </div>
        </main>
      </div>

      {/* Floating Action Button for AI (Adjusted for Desktop) */}
      {activeView !== View.AI_COACH && (
        <button 
          onClick={() => setActiveView(View.AI_COACH)}
          className="absolute bottom-24 right-4 md:bottom-8 md:right-8 bg-gradient-to-r from-primary to-blue-600 text-white rounded-full p-4 shadow-lg shadow-blue-500/30 z-40 hover:scale-110 transition-transform"
        >
           <span className="material-symbols-outlined text-2xl">smart_toy</span>
        </button>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden absolute bottom-0 w-full bg-background-dark/95 backdrop-blur-lg border-t border-gray-800 pb-safe pt-2 z-50">
        <div className="flex justify-around items-center px-2 h-16">
          <NavButton 
            active={activeView === View.DASHBOARD} 
            icon="dashboard" 
            label={t('nav.dashboard')} 
            onClick={() => setActiveView(View.DASHBOARD)} 
          />
          <NavButton 
            active={activeView === View.FOUR_FACTORS} 
            icon="analytics" 
            label={t('nav.factors')}
            onClick={() => setActiveView(View.FOUR_FACTORS)} 
          />
          <NavButton 
             active={activeView === View.INPUT_STATS} 
             icon="edit_note" 
             label={t('nav.input')} 
             onClick={() => setActiveView(View.INPUT_STATS)} 
          />
          <NavButton 
            active={activeView === View.REPORTS} 
            icon="description" 
            label={t('nav.reports')} 
            onClick={() => setActiveView(View.REPORTS)} 
          />
          <NavButton 
             active={activeView === View.COMPARISON} 
             icon="compare_arrows" 
             label={t('nav.compare')} 
             onClick={() => setActiveView(View.COMPARISON)} 
          />
        </div>
        <div className="h-5 w-full"></div>
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, icon: string, label: string, onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 w-14 ${active ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}>
    <span className={`material-symbols-outlined text-[24px] ${active ? 'fill-current' : ''}`}>{icon}</span>
    <span className="text-[10px] font-medium leading-none">{label}</span>
  </button>
);

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <GameProvider>
        <ExplainerProvider>
          <AppContent />
        </ExplainerProvider>
      </GameProvider>
    </LanguageProvider>
  );
};

export default App;