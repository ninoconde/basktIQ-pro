import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { InfoButton } from './Explainer';

const Hexagon: React.FC<{ style: React.CSSProperties, active?: boolean, type?: 'hot' | 'cold' | 'neutral' }> = ({ style, active, type }) => {
  // Adjusted colors for Light Mode
  const bgColor = type === 'hot' ? 'bg-red-500' : type === 'cold' ? 'bg-blue-500' : 'bg-gray-400';
  const opacity = active ? 'opacity-90' : 'opacity-20';
  
  return (
    <div 
      className={`absolute ${bgColor} ${opacity} hover:scale-110 hover:opacity-100 transition-all cursor-pointer`}
      style={{
        ...style,
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        boxShadow: active ? '0 0 10px rgba(0,0,0,0.2)' : 'none'
      }}
    />
  );
};

export const ScoutingReport: React.FC = () => {
  const [filter, setFilter] = useState('All');
  const [notes, setNotes] = useState('');
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-full animate-fade-in pb-24 bg-white text-black">
      {/* Header - Light Mode */}
      <div className="flex items-center px-6 py-4 justify-between bg-white border-b border-gray-200 shadow-sm z-10">
         <div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('scout.title')}</p>
          <h2 className="text-black text-2xl font-bold tracking-tight">LA Lakers <span className="text-gray-400 font-normal text-lg">Scouting</span></h2>
        </div>
        <button className="text-white text-xs font-bold px-4 py-2 bg-black rounded-lg hover:bg-gray-800 transition-colors shadow-lg shadow-black/20">
            {t('scout.export')} PDF
        </button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar bg-gray-50">
        <div className="max-w-4xl mx-auto w-full p-6 flex flex-col gap-6">
            
            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
               <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 items-center">
                  <button onClick={() => setFilter('All')} className={`flex flex-col items-center gap-2 min-w-[60px] group`}>
                    <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all ${filter === 'All' ? 'border-black bg-black text-white' : 'border-gray-200 bg-gray-50 text-gray-400 group-hover:border-gray-400'}`}>
                      <span className="material-symbols-outlined text-[28px]">groups</span>
                    </div>
                    <span className={`text-xs font-bold text-center ${filter === 'All' ? 'text-black' : 'text-gray-400'}`}>{t('scout.team')}</span>
                  </button>
                  {['L. James', 'A. Davis', 'D. Russell'].map((player, i) => (
                    <button key={i} onClick={() => setFilter(player)} className="flex flex-col items-center gap-2 min-w-[60px] group">
                       <div className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${filter === player ? 'border-black ring-2 ring-black/20' : 'border-transparent group-hover:border-gray-300'}`}>
                         <img src={`https://picsum.photos/seed/${player}/100`} alt={player} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                       </div>
                       <span className={`text-xs font-bold text-center ${filter === player ? 'text-black' : 'text-gray-400'}`}>{player}</span>
                    </button>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Stats Summary - Left Column */}
                <div className="md:col-span-4 flex flex-col gap-4">
                   <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-full relative">
                       <div className="absolute top-4 right-4">
                          <InfoButton title="Shot Chart" contextData="Analysis of paint vs perimeter scoring efficiency." />
                       </div>
                       <h3 className="text-black text-lg font-bold mb-4 flex items-center gap-2">
                           <span className="material-symbols-outlined text-gray-400">analytics</span>
                           {t('scout.shotSummary')}
                       </h3>
                       
                       <div className="flex flex-col gap-4">
                           <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className="bg-blue-100 p-2 rounded-md text-blue-600"><span className="material-symbols-outlined">square</span></div>
                                 <div>
                                    <p className="text-sm font-bold text-gray-900">{t('scout.paint')}</p>
                                    <p className="text-xs text-gray-500">62% {t('scout.freq')}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-xl font-bold text-black">1.24</p>
                                 <p className="text-[10px] font-bold text-gray-400 uppercase">{t('scout.ppp')}</p>
                              </div>
                           </div>

                           <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className="bg-orange-100 p-2 rounded-md text-orange-600"><span className="material-symbols-outlined">change_history</span></div>
                                 <div>
                                    <p className="text-sm font-bold text-gray-900">{t('scout.midRange')}</p>
                                    <p className="text-xs text-gray-500">8% {t('scout.freq')}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-xl font-bold text-black">0.78</p>
                                 <p className="text-[10px] font-bold text-gray-400 uppercase">{t('scout.ppp')}</p>
                              </div>
                           </div>
                           
                           <div className="mt-2 border-t border-gray-100 pt-4">
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    <strong>Insight:</strong> The team prioritizes paint scoring. Force them to take mid-range jumpers where their efficiency drops significantly.
                                </p>
                           </div>
                       </div>
                   </div>
                </div>

                {/* Hex Map - Right Column */}
                <div className="md:col-span-8">
                   <div className="bg-white rounded-xl p-4 shadow-sm relative overflow-hidden aspect-[4/3] border border-gray-200">
                      {/* Legend */}
                      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] uppercase font-bold text-gray-500">{t('scout.volume')}</span>
                           <div className="flex gap-1.5"><div className="w-2 h-2 bg-gray-300 rounded-full"></div><div className="w-3 h-3 bg-gray-400 rounded-full"></div></div>
                        </div>
                      </div>

                      {/* Court Lines SVG - Dark Lines on Light Background */}
                      <div className="relative w-full h-full flex justify-center items-end bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                        <svg className="absolute inset-0 w-full h-full text-gray-900 opacity-20 pointer-events-none" viewBox="0 0 500 470">
                            <path d="M20,0 V470 H480 V0" fill="none" stroke="currentColor" strokeWidth="4"></path>
                            <path d="M40,0 V140 Q40,300 250,300 Q460,300 460,140 V0" fill="none" stroke="currentColor" strokeWidth="4"></path>
                            <path d="M170,0 V190 H330 V0" fill="none" stroke="currentColor" strokeWidth="4"></path>
                            <circle cx="250" cy="190" fill="none" r="60" stroke="currentColor" strokeWidth="4"></circle>
                            <circle cx="250" cy="40" fill="none" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <line stroke="currentColor" strokeWidth="4" x1="220" x2="280" y1="30" y2="30"></line>
                        </svg>

                        {/* Simulated Data Layer */}
                        <div className="absolute inset-0 z-0">
                           {/* Paint */}
                           <Hexagon style={{ top: '15%', left: '48%', width: '30px', height: '30px' }} active type="hot" />
                           <Hexagon style={{ top: '12%', left: '45%', width: '25px', height: '25px' }} active type="hot" />
                           <Hexagon style={{ top: '18%', left: '52%', width: '28px', height: '28px' }} active type="hot" />
                           
                           {/* Mid Range */}
                           <Hexagon style={{ top: '40%', left: '30%', width: '15px', height: '15px' }} active type="cold" />
                           <Hexagon style={{ top: '35%', left: '70%', width: '18px', height: '18px' }} active type="neutral" />
                           
                           {/* 3PT */}
                           <Hexagon style={{ top: '25%', left: '10%', width: '22px', height: '22px' }} active type="cold" /> {/* Corner */}
                           <Hexagon style={{ top: '65%', left: '50%', width: '24px', height: '24px' }} active type="neutral" /> {/* Top Key */}
                           <Hexagon style={{ top: '55%', right: '25%', width: '20px', height: '20px' }} active type="hot" />
                        </div>
                      </div>
                   </div>
                </div>
            </div>

            {/* NOTES SECTION */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-black text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined">edit_note</span>
                        {t('scout.notes')}
                    </h3>
                </div>
                <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm relative group focus-within:ring-2 focus-within:ring-black/5 transition-all">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-400 rounded-l-xl"></div>
                    <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-transparent p-6 text-sm text-gray-800 outline-none min-h-[150px] resize-none placeholder-gray-400 font-medium leading-relaxed"
                        placeholder={t('scout.notesPlaceholder')}
                    />
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};