import React, { useMemo } from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer, ReferenceLine, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { useGame } from '../context/GameContext';
import { InfoButton } from './Explainer';

export const MomentumTracker: React.FC = () => {
  const { t } = useLanguage();
  const { homeStats, awayStats, events } = useGame();

  const gameFlowData = useMemo(() => {
    // Process events chronologically (assuming events are stored Newest First in context)
    const sortedEvents = [...events].reverse();
    
    let hScore = 0;
    let aScore = 0;

    const points = [{ index: 0, time: 'Start', diff: 0, home: 0, away: 0, desc: 'Start' }];

    sortedEvents.forEach((ev, i) => {
      let isScoringEvent = ev.type === 'score';
      
      if (isScoringEvent) {
        // Heuristic to guess points if not explicit
        const d = ev.description.toLowerCase();
        let pts = 2;
        if (d.includes('3') || d.includes('three')) pts = 3;
        else if (d.includes('free') || d.includes('ft') || d.includes('1')) pts = 1;

        if (ev.team === 'home') hScore += pts;
        else aScore += pts;
      }
      
      // We push every event to show density/flow, or at least every scoring event
      points.push({
        index: i + 1,
        time: `${ev.quarter} ${ev.time}`,
        diff: hScore - aScore,
        home: hScore,
        away: aScore,
        desc: ev.description
      });
    });

    return points;
  }, [events]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface-dark border border-gray-700 p-3 rounded-lg shadow-xl z-50">
          <p className="text-xs font-bold text-gray-400 mb-1">{data.time}</p>
          <div className="flex items-center gap-4 mb-2">
             <div className="flex flex-col items-center">
                <span className="text-xs text-primary font-bold">{homeStats.name}</span>
                <span className="text-lg font-bold text-white">{data.home}</span>
             </div>
             <span className="text-gray-500 font-bold">-</span>
             <div className="flex flex-col items-center">
                <span className="text-xs text-secondary font-bold">{awayStats.name}</span>
                <span className="text-lg font-bold text-white">{data.away}</span>
             </div>
          </div>
          <p className="text-[10px] text-gray-400 max-w-[150px] leading-tight truncate">{data.desc}</p>
          <div className="mt-2 text-xs font-bold">
            Diff: <span className={data.diff > 0 ? 'text-primary' : data.diff < 0 ? 'text-secondary' : 'text-gray-400'}>
              {data.diff > 0 ? `+${data.diff}` : data.diff}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const offset = 0; // Can be used to center 0 if needed, but Recharts handles domain reasonably well

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 animate-fade-in">
      {/* Live Header */}
      <div className="flex items-center justify-between bg-surface-dark p-4 rounded-xl border border-gray-800">
         <div className="flex flex-col items-center flex-1">
             <div className="size-10 rounded-full border-2 border-primary flex items-center justify-center text-primary font-bold">H</div>
             <span className="text-2xl font-bold font-display mt-1">{homeStats.pts}</span>
             <span className="text-xs text-gray-500">{homeStats.name}</span>
         </div>
         <div className="flex flex-col items-center px-4">
            <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse mb-1">{t('mom.live')}</span>
         </div>
         <div className="flex flex-col items-center flex-1">
             <div className="size-10 rounded-full border-2 border-secondary flex items-center justify-center text-secondary font-bold">A</div>
             <span className="text-2xl font-bold font-display mt-1">{awayStats.pts}</span>
             <span className="text-xs text-gray-500">{awayStats.name}</span>
         </div>
      </div>

      {/* Game Flow Chart */}
      <div className="flex flex-col gap-4">
         <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400">query_stats</span>
                {t('mom.flow')}
            </h2>
            <InfoButton title="Game Flow" contextData={`Current Score Diff: ${homeStats.pts - awayStats.pts}. Tracking momentum shifts.`} />
         </div>

         <div className="rounded-xl bg-surface-dark border border-gray-800 p-4 h-80 relative">
           {events.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={gameFlowData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                     <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1392ec" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#fa6238" stopOpacity={0.4}/>
                     </linearGradient>
                     {/* We can do a more complex gradient if we knew the offset 0, but a simple mix is okay for now or just single color if we map diff directly */}
                     <linearGradient id="colorHome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1392ec" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#1392ec" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorAway" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fa6238" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#fa6238" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="index" hide />
                  <YAxis stroke="#6b7280" fontSize={10} tickCount={6} />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                  
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* We map the diff. If diff > 0, it tends to Home (Blue). If < 0, Away (Orange).
                      Standard Area charts don't switch fill color automatically based on Y=0 easily without offset trick.
                      For simplicity, let's use a single Area with a gradient that looks decent, or just one color.
                      Actually, let's use the split gradient approach if we can calculate the offset, 
                      but for now, a single gradient representing "Lead" is fine.
                   */}
                   
                  <Area 
                    type="monotone" 
                    dataKey="diff" 
                    stroke="#fff" 
                    fill="url(#splitColor)" 
                    strokeWidth={2} 
                    animationDuration={500}
                  />
               </AreaChart>
            </ResponsiveContainer>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
               <span className="material-symbols-outlined text-3xl opacity-50">timeline</span>
               <span className="text-sm">Record Play-by-Play events to visualize game flow</span>
             </div>
           )}
         </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-dark p-4 rounded-xl border border-gray-800">
             <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Largest Lead</h3>
             <div className="flex justify-between items-end">
                <span className="text-primary font-bold">{homeStats.name}</span>
                <span className="text-xl font-bold text-white">
                    +{Math.max(0, ...gameFlowData.map(d => d.diff))}
                </span>
             </div>
          </div>
          <div className="bg-surface-dark p-4 rounded-xl border border-gray-800">
             <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Largest Deficit</h3>
             <div className="flex justify-between items-end">
                <span className="text-secondary font-bold">{awayStats.name}</span>
                <span className="text-xl font-bold text-white">
                    {Math.min(0, ...gameFlowData.map(d => d.diff))}
                </span>
             </div>
          </div>
      </div>
    </div>
  );
};