import React, { useState } from 'react';
import { getCoachingInsight } from '../services/geminiService';
import { useLanguage } from '../context/LanguageContext';
import { useGame } from '../context/GameContext';
import { PlayEvent } from '../types';

// Helper to aggregate stats from events for the AI context
const aggregateDetailedStats = (events: PlayEvent[]) => {
  const players: Record<string, { pts: number; reb: number; ast: number; tov: number; actions: number }> = {};

  events.forEach(ev => {
    if (!ev.player) return;
    const name = ev.player;
    
    if (!players[name]) {
      players[name] = { pts: 0, reb: 0, ast: 0, tov: 0, actions: 0 };
    }
    
    players[name].actions += 1;
    const desc = ev.description.toLowerCase();

    if (ev.type === 'score') {
      let pts = 2;
      if (desc.includes('3pt') || desc.includes('three')) pts = 3;
      else if (desc.includes('free') || desc.includes('ft')) pts = 1;
      players[name].pts += pts;
    } else if (ev.type === 'tov') {
      players[name].tov += 1;
    }

    // Heuristics for Rebounds and Assists based on description text
    if (desc.includes('rebound')) players[name].reb += 1;
    if (desc.includes('assist')) players[name].ast += 1;
  });

  return Object.entries(players)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.actions - a.actions) // Sort by involvement/impact
    .slice(0, 10); // Top 10 active players
};

const formatPercentage = (made: number, attempt: number) => {
  if (attempt === 0) return '0.0%';
  return `${((made / attempt) * 100).toFixed(1)}%`;
};

export const CoachAssistant: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t, language } = useLanguage();
  const { homeStats, awayStats, derivedMetrics, events } = useGame();

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);

    // 1. Game Status
    const latestEvent = events.length > 0 ? events[0] : null;
    const timeStatus = latestEvent ? `${latestEvent.quarter} ${latestEvent.time}` : 'Pre-game / Start';

    // 2. Recent Events (Context)
    const recentPlays = events.slice(0, 8).map(e => 
      `- [${e.quarter} ${e.time}] ${e.description} (${e.player || 'Team'})`
    ).join('\n');

    // 3. Player Stats Aggregation
    const playerStats = aggregateDetailedStats(events);
    const playerStatsText = playerStats.map(p => 
      `- ${p.name}: ${p.pts} PTS, ${p.reb} REB, ${p.ast} AST, ${p.tov} TOV`
    ).join('\n');

    // 4. Detailed Team Stats
    const context = `
      GAME CONTEXT:
      ${homeStats.name} (Home) vs ${awayStats.name} (Away).
      Current Score: ${homeStats.pts} - ${awayStats.pts}.
      Game Clock: ${timeStatus}.
      
      TEAM BOX SCORE STATS:
      ${homeStats.name} (Home):
      - FG: ${homeStats.fg}/${homeStats.fga} (${formatPercentage(homeStats.fg, homeStats.fga)})
      - 3PT: ${homeStats.tp}/${homeStats.tpa} (${formatPercentage(homeStats.tp, homeStats.tpa)})
      - FT: ${homeStats.ft}/${homeStats.fta} (${formatPercentage(homeStats.ft, homeStats.fta)})
      - REB: ${homeStats.orb + homeStats.drb} (ORB: ${homeStats.orb})
      - AST: ${homeStats.ast} | TOV: ${homeStats.tov}
      
      ${awayStats.name} (Away):
      - FG: ${awayStats.fg}/${awayStats.fga} (${formatPercentage(awayStats.fg, awayStats.fga)})
      - 3PT: ${awayStats.tp}/${awayStats.tpa} (${formatPercentage(awayStats.tp, awayStats.tpa)})
      - FT: ${awayStats.ft}/${awayStats.fta} (${formatPercentage(awayStats.ft, awayStats.fta)})
      - REB: ${awayStats.orb + awayStats.drb} (ORB: ${awayStats.orb})
      - AST: ${awayStats.ast} | TOV: ${awayStats.tov}
      
      PLAYER STATISTICS (Derived from Play-by-Play):
      ${playerStatsText || "No player data available yet."}
      
      FOUR FACTORS (Advanced):
      - Home eFG%: ${(derivedMetrics.homeFactors.efg * 100).toFixed(1)}% | Away eFG%: ${(derivedMetrics.awayFactors.efg * 100).toFixed(1)}%
      - Home TOV%: ${(derivedMetrics.homeFactors.tov * 100).toFixed(1)}% | Away TOV%: ${(derivedMetrics.awayFactors.tov * 100).toFixed(1)}%
      
      RECENT PLAYS (Last 8):
      ${recentPlays || "No events recorded."}
    `;

    const result = await getCoachingInsight(context, query, language);
    setResponse(result);
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 animate-fade-in h-full">
       <div className="bg-gradient-to-r from-primary/20 to-surface-dark p-6 rounded-2xl border border-primary/30 text-center">
          <span className="material-symbols-outlined text-5xl text-primary mb-2">smart_toy</span>
          <h2 className="text-xl font-bold text-white">{t('ai.title')}</h2>
          <p className="text-sm text-gray-400">{t('ai.subtitle')}</p>
       </div>

       <div className="flex-1 flex flex-col gap-4">
          <div className="bg-surface-dark rounded-xl p-4 border border-gray-800 min-h-[200px]">
             {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                   <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-sm text-gray-400">{t('ai.analyzing')}</p>
                </div>
             ) : response ? (
                <div className="prose prose-invert prose-sm overflow-y-auto max-h-[300px] hide-scrollbar">
                   <p className="whitespace-pre-wrap">{response}</p>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                   <span className="material-symbols-outlined text-3xl">chat</span>
                   <p className="text-sm text-center">{t('ai.examples')}</p>
                </div>
             )}
          </div>

          <div className="mt-auto flex gap-2">
             <input 
               type="text" 
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               placeholder={t('ai.placeholder')}
               className="flex-1 bg-surface-dark border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
               onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
             />
             <button 
               onClick={handleAsk}
               disabled={loading}
               className="bg-primary hover:bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center justify-center disabled:opacity-50 transition-colors"
             >
               <span className="material-symbols-outlined">send</span>
             </button>
          </div>
       </div>
    </div>
  );
};