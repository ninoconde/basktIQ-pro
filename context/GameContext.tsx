import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { TeamStats, PlayEvent, GameContextType } from '../types';

const defaultStats: TeamStats = {
  name: 'Team',
  pts: 0,
  fg: 0,
  fga: 0,
  tp: 0,
  tpa: 0,
  ft: 0,
  fta: 0,
  orb: 0,
  drb: 0,
  ast: 0,
  tov: 0
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [homeStats, setHomeStats] = useState<TeamStats>({ ...defaultStats, name: 'Home' });
  const [awayStats, setAwayStats] = useState<TeamStats>({ ...defaultStats, name: 'Away' });
  const [events, setEvents] = useState<PlayEvent[]>([]);
  
  const [pdfFiles, setPdfFiles] = useState<{ boxscore: string | null; pbp: string | null }>({
    boxscore: null,
    pbp: null
  });

  const updateHomeStats = (stats: Partial<TeamStats>) => {
    setHomeStats(prev => ({ ...prev, ...stats }));
  };

  const updateAwayStats = (stats: Partial<TeamStats>) => {
    setAwayStats(prev => ({ ...prev, ...stats }));
  };

  const addEvent = (event: PlayEvent) => {
    // Determine score impact
    let currentDiff = 0;
    if (events.length > 0 && events[0].scoreDiff !== undefined) {
      currentDiff = events[0].scoreDiff;
    }
    
    // Sort events by time (descending usually for logs) or insert at top
    setEvents(prev => [event, ...prev]);
  };

  const resetGame = () => {
    setHomeStats({ ...defaultStats, name: 'Home' });
    setAwayStats({ ...defaultStats, name: 'Away' });
    setEvents([]);
    setPdfFiles({ boxscore: null, pbp: null });
  };

  const setPdfFile = (type: 'boxscore' | 'pbp', data: string | null) => {
    setPdfFiles(prev => ({ ...prev, [type]: data }));
  };

  // derived calculations
  const derivedMetrics = useMemo(() => {
    const calculateFactors = (team: TeamStats, opp: TeamStats) => {
      const efg = team.fga > 0 ? (team.fg + 0.5 * team.tp) / team.fga : 0;
      const tov = (team.fga + 0.44 * team.fta + team.tov) > 0 
        ? team.tov / (team.fga + 0.44 * team.fta + team.tov) 
        : 0;
      const orb = (team.orb + opp.drb) > 0 ? team.orb / (team.orb + opp.drb) : 0;
      const ftr = team.fga > 0 ? team.ft / team.fga : 0;
      
      return { efg, tov, orb, ftr };
    };

    // Extract players from PBP
    const players = Array.from(new Set(events.map(e => e.player).filter(p => !!p))) as string[];

    return {
      homeFactors: calculateFactors(homeStats, awayStats),
      awayFactors: calculateFactors(awayStats, homeStats),
      players
    };
  }, [homeStats, awayStats, events]);

  return (
    <GameContext.Provider value={{
      homeStats,
      awayStats,
      events,
      updateHomeStats,
      updateAwayStats,
      addEvent,
      resetGame,
      derivedMetrics,
      pdfFiles,
      setPdfFile
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};