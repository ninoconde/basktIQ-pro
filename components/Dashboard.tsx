import React from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { useGame } from '../context/GameContext';
import { InfoButton } from './Explainer';

// Mock trend data for UI visualization only (since we only have 1 game input)
const trendData = [
  { game: 'G1', off: 108, def: 112 },
  { game: 'G2', off: 115, def: 110 },
  { game: 'G3', off: 120, def: 118 },
  { game: 'G4', off: 118, def: 105 },
  { game: 'G5', off: 125, def: 108 },
  { game: 'G6', off: 112, def: 115 },
];

export const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { homeStats, awayStats } = useGame();

  // Basic Calculation for Dashboard Display
  // Assuming 100 Possessions for simplified Rating calc if no possession data
  const possessions = Math.max(1, homeStats.fga + 0.44 * homeStats.fta + homeStats.tov);
  const offRating = ((homeStats.pts / possessions) * 100).toFixed(1);
  const defRating = ((awayStats.pts / possessions) * 100).toFixed(1);
  const netRating = (parseFloat(offRating) - parseFloat(defRating)).toFixed(1);

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 md:p-8 md:pb-8 animate-fade-in">
      {/* Filters */}
      <div className="flex gap-3 overflow-x-auto hide-scrollbar">
        <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary text-white px-4 shadow-sm shadow-primary/20 text-sm font-medium hover:bg-primary/90 transition-colors">
          Current Game <span className="material-symbols-outlined text-[18px]">expand_more</span>
        </button>
      </div>

      {/* Hero KPIs - Responsive Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Net Rating */}
        <div className="col-span-12 md:col-span-4 relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-surface-dark border border-primary/30 p-5 min-h-[140px] flex flex-col justify-center group">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-7xl text-primary">analytics</span>
          </div>
          <div className="absolute top-4 right-4 z-20">
             <InfoButton title="Net Rating" contextData={`Net Rating: ${netRating}. (Difference between Off Rtg ${offRating} and Def Rtg ${defRating})`} />
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">{t('dash.netRating')}</span>
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-5xl font-bold tracking-tight text-white">{netRating}</span>
              <span className="text-xs text-gray-400">(Est.)</span>
            </div>
            <p className="text-gray-400 text-xs mt-2">{t('dash.netRatingDesc')}</p>
          </div>
        </div>

        {/* Off Rating */}
        <div className="col-span-6 md:col-span-4 flex flex-col justify-center gap-2 rounded-xl bg-surface-dark p-5 border border-gray-800 shadow-sm min-h-[140px] relative">
          <div className="flex justify-between items-start">
             <p className="text-gray-400 text-xs font-medium uppercase">{t('dash.offRating')}</p>
             <InfoButton title="Off Rating" contextData={`Offensive Rating: ${offRating}. Points scored per 100 possessions.`} />
          </div>
          <p className="text-3xl font-bold text-white">{offRating}</p>
          <div className="w-full bg-gray-700 h-2 rounded-full mt-2 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: '70%' }}></div>
          </div>
          <span className="text-xs text-gray-500 mt-1">{homeStats.pts} Pts Scored</span>
        </div>

        {/* Def Rating */}
        <div className="col-span-6 md:col-span-4 flex flex-col justify-center gap-2 rounded-xl bg-surface-dark p-5 border border-gray-800 shadow-sm min-h-[140px] relative">
          <div className="flex justify-between items-start">
             <p className="text-gray-400 text-xs font-medium uppercase">{t('dash.defRating')}</p>
             <InfoButton title="Def Rating" contextData={`Defensive Rating: ${defRating}. Points allowed per 100 possessions.`} />
          </div>
          <p className="text-3xl font-bold text-white">{defRating}</p>
          <div className="w-full bg-gray-700 h-2 rounded-full mt-2 overflow-hidden">
            <div className="bg-secondary h-full rounded-full" style={{ width: '60%' }}></div>
          </div>
           <span className="text-xs text-gray-500 mt-1">{awayStats.pts} Pts Allowed</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Evolution Chart (Placeholder for now as we don't have historical input) */}
        <div className="md:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-white">{t('dash.evolution')}</h2>
            <InfoButton title="Game Flow" contextData="This chart shows the point differential evolution over the last games (sample data)." />
          </div>
          <div className="rounded-xl bg-surface-dark border border-gray-800 p-5 shadow-sm h-64 md:h-80 relative">
             <div className="absolute top-2 right-2 z-10 bg-gray-800 px-2 py-1 rounded text-xs text-gray-400">Sample Data</div>
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorOff" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#1392ec" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#1392ec" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <Tooltip 
                  contentStyle={{ backgroundColor: '#1e2832', borderColor: '#374151', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                 />
                 <XAxis dataKey="game" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                 <Area type="monotone" dataKey="off" stroke="#1392ec" strokeWidth={3} fillOpacity={1} fill="url(#colorOff)" />
                 <Area type="monotone" dataKey="def" stroke="#fa6238" strokeWidth={3} fillOpacity={0} fill="url(#colorDef)" />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Game Status */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <h2 className="text-lg font-bold tracking-tight text-white">Match Status</h2>
          <div className="bg-surface-dark rounded-xl border border-gray-800 p-6 flex flex-col gap-4 items-center justify-center h-full">
              <div className="flex justify-between w-full items-center">
                 <span className="text-2xl font-bold text-primary">{homeStats.name}</span>
                 <span className="text-4xl font-mono font-bold">{homeStats.pts}</span>
              </div>
              <div className="h-px w-full bg-gray-700"></div>
              <div className="flex justify-between w-full items-center">
                 <span className="text-2xl font-bold text-secondary">{awayStats.name}</span>
                 <span className="text-4xl font-mono font-bold">{awayStats.pts}</span>
              </div>
          </div>
        </div>

      </div>
    </div>
  );
};