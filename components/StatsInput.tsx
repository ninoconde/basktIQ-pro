import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useGame } from '../context/GameContext';
import { PlayEvent } from '../types';
import { parseUploadedPdf } from '../services/geminiService';

// Common basketball plays for quick auto-fill
const PLAY_PRESETS: Record<string, string[]> = {
  score: ['Driving Layup', 'Dunk', 'Jump Shot', 'Pull-up Jumpshot', 'Corner 3PT', 'Top of Key 3PT', 'Free Throw 1/1', 'Free Throw 1/2', 'Free Throw 2/2'],
  miss: ['Missed Layup', 'Missed 3PT', 'Rim out', 'Airball', 'Blocked Shot', 'Missed Free Throw'],
  foul: ['Shooting Foul', 'Reach-in Foul', 'Blocking Foul', 'Charge (Offensive)', 'Technical Foul'],
  tov: ['Bad Pass', 'Lost Ball', 'Traveling', '3 Seconds', 'Out of Bounds', 'Offensive Foul'],
  sub: ['Substitution In', 'Substitution Out'],
};

// Internal Autocomplete Component
const AutocompleteInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
}> = ({ value, onChange, options, placeholder }) => {
  const [show, setShow] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(opt => 
    opt.toLowerCase().includes(value.toLowerCase()) && opt.toLowerCase() !== value.toLowerCase()
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShow(true);
        }}
        onFocus={() => setShow(true)}
        className="w-full bg-gray-800 text-white text-sm rounded-lg p-2.5 border border-gray-700 outline-none focus:border-primary transition-colors"
      />
      {show && value && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-40 overflow-y-auto hide-scrollbar">
          {filtered.map((opt, idx) => (
            <li 
              key={idx}
              onClick={() => {
                onChange(opt);
                setShow(false);
              }}
              className="px-3 py-2 text-sm text-gray-200 hover:bg-primary/20 hover:text-white cursor-pointer transition-colors"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const StatsInput: React.FC = () => {
  const { t } = useLanguage();
  const { 
    homeStats, awayStats, updateHomeStats, updateAwayStats, 
    addEvent, events, resetGame, pdfFiles, setPdfFile, derivedMetrics 
  } = useGame();
  const [activeTab, setActiveTab] = useState<'boxscore' | 'pbp' | 'pdf'>('boxscore');
  
  // Enhanced State for Upload/Analysis
  const [analyzing, setAnalyzing] = useState<'boxscore' | 'pbp' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<'boxscore' | 'pbp', number>>({ boxscore: 0, pbp: 0 });
  const [processingStatus, setProcessingStatus] = useState<Record<'boxscore' | 'pbp', { type: 'success' | 'error' | 'info' | null, msg: string }>>({
    boxscore: { type: null, msg: '' },
    pbp: { type: null, msg: '' }
  });

  // Local state to track filenames for display
  const [fileNames, setFileNames] = useState<Record<'boxscore' | 'pbp', string>>({ boxscore: '', pbp: '' });

  // New Event State
  const [newEvent, setNewEvent] = useState<Partial<PlayEvent>>({
    quarter: 'Q1',
    time: '',
    team: 'home',
    type: 'score',
    player: '',
    description: ''
  });

  const handleStatChange = (team: 'home' | 'away', field: string, value: string) => {
    const val = value === '' ? 0 : parseInt(value);
    
    if (field === 'name') {
       if (team === 'home') updateHomeStats({ name: value });
       else updateAwayStats({ name: value });
       return;
    }

    if (isNaN(val)) return;

    if (team === 'home') updateHomeStats({ [field]: val });
    else updateAwayStats({ [field]: val });
  };

  const handleAddEvent = () => {
    if (!newEvent.time || !newEvent.description) return;
    const event: PlayEvent = {
        id: Date.now().toString(),
        quarter: newEvent.quarter || 'Q1',
        time: newEvent.time,
        team: newEvent.team as 'home' | 'away',
        type: newEvent.type as any,
        description: newEvent.description,
        player: newEvent.player
    };
    addEvent(event);
    setNewEvent({ ...newEvent, time: '', description: '', player: '' });
  };

  const handleProcessPdf = async (type: 'boxscore' | 'pbp') => {
    const data = pdfFiles[type];
    if (!data) return;

    setAnalyzing(type);
    setProcessingStatus(prev => ({ ...prev, [type]: { type: 'info', msg: t('input.analyzing') } }));
    
    try {
      const result = await parseUploadedPdf(data, type);
      
      if (result) {
        if (type === 'boxscore') {
          if (result.home) updateHomeStats(result.home);
          if (result.away) updateAwayStats(result.away);
          setProcessingStatus(prev => ({ ...prev, [type]: { type: 'success', msg: t('input.successBox') } }));
        } else if (type === 'pbp' && Array.isArray(result)) {
           result.forEach((ev: any) => {
             addEvent({
               id: Date.now() + Math.random().toString(), 
               ...ev
             });
           });
           setProcessingStatus(prev => ({ ...prev, [type]: { type: 'success', msg: `${t('input.successPbp')} (${result.length} events)` } }));
        } else {
            // Parsed but structure invalid
            setProcessingStatus(prev => ({ ...prev, [type]: { type: 'error', msg: 'AI could not identify valid data structure.' } }));
        }
      } else {
        setProcessingStatus(prev => ({ ...prev, [type]: { type: 'error', msg: t('input.errorPdf') } }));
      }
    } catch (e) {
      console.error(e);
      setProcessingStatus(prev => ({ ...prev, [type]: { type: 'error', msg: 'Connection error during analysis.' } }));
    } finally {
      setAnalyzing(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'boxscore' | 'pbp') => {
    const file = e.target.files?.[0];
    setProcessingStatus(prev => ({ ...prev, [type]: { type: null, msg: '' } }));
    setUploadProgress(prev => ({ ...prev, [type]: 0 }));

    if (file && file.type === 'application/pdf') {
      // 10MB Limit
      if (file.size > 10 * 1024 * 1024) {
        setProcessingStatus(prev => ({ ...prev, [type]: { type: 'error', msg: 'File too large (Max 10MB)' } }));
        return;
      }

      setFileNames(prev => ({ ...prev, [type]: file.name }));
      
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => ({ ...prev, [type]: percent }));
        }
      };

      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setPdfFile(type, base64Data);
        setUploadProgress(prev => ({ ...prev, [type]: 100 }));
      };
      
      reader.readAsDataURL(file);
    } else {
      setProcessingStatus(prev => ({ ...prev, [type]: { type: 'error', msg: 'Please select a valid PDF file.' } }));
    }
  };

  const FileUploadCard = ({ type, label, active }: { type: 'boxscore' | 'pbp', label: string, active: boolean }) => {
    const status = processingStatus[type];
    const progress = uploadProgress[type];
    const isAnalyzing = analyzing === type;
    const fileName = fileNames[type] || 'PDF Document';

    return (
      <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all relative overflow-hidden min-h-[250px] ${active ? 'border-primary/50 bg-surface-dark' : 'border-gray-700 bg-surface-dark hover:border-gray-500'}`}>
          {active ? (
              <div className="flex flex-col items-center gap-4 w-full z-10">
                   <div className="w-16 h-16 rounded-full bg-surface-light/5 flex items-center justify-center relative">
                      {progress < 100 ? (
                        <div className="absolute inset-0 rounded-full border-4 border-gray-700 border-t-primary animate-spin"></div>
                      ) : (
                        <span className="material-symbols-outlined text-3xl text-primary">description</span>
                      )}
                   </div>
                   
                   <div className="text-center">
                     <p className="font-bold text-white text-sm truncate max-w-[200px]">{fileName}</p>
                     <p className="text-xs text-gray-500">{progress < 100 ? `Uploading ${progress}%` : t('input.fileUploaded')}</p>
                   </div>
                   
                   {/* Progress Bar for Upload */}
                   {progress < 100 && (
                      <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                      </div>
                   )}

                   {/* Status Message */}
                   {status.type && (
                     <div className={`text-xs font-bold px-3 py-2 rounded-lg text-center max-w-[250px] ${
                       status.type === 'success' ? 'bg-success/10 text-success' :
                       status.type === 'error' ? 'bg-red-500/10 text-red-500' :
                       'bg-blue-500/10 text-blue-400'
                     }`}>
                       {status.msg}
                     </div>
                   )}
                   
                   {progress === 100 && (
                     <div className="flex flex-col gap-2 w-full max-w-[200px]">
                       <button 
                         onClick={() => handleProcessPdf(type)}
                         disabled={isAnalyzing}
                         className={`w-full font-bold py-3 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition-all duration-200 ${
                           isAnalyzing 
                           ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                           : status.type === 'error' 
                             ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20' 
                             : 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:scale-[1.02]'
                         } disabled:opacity-70 disabled:cursor-not-allowed`}
                       >
                         {isAnalyzing ? (
                           <>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="animate-pulse">{t('input.analyzing')}</span>
                           </>
                         ) : (
                           <>
                              <span className="material-symbols-outlined text-sm">{status.type === 'error' ? 'refresh' : 'smart_toy'}</span>
                              {status.type === 'error' ? 'Retry Analysis' : t('input.analyze')}
                           </>
                         )}
                       </button>

                       <button 
                         onClick={() => {
                            setPdfFile(type, null);
                            setProcessingStatus(prev => ({ ...prev, [type]: { type: null, msg: '' } }));
                            setUploadProgress(prev => ({ ...prev, [type]: 0 }));
                         }}
                         className="text-xs text-gray-500 hover:text-red-400 underline decoration-gray-700 underline-offset-4"
                       >
                         {t('input.remove')}
                       </button>
                     </div>
                   )}
              </div>
          ) : (
              <label className="flex flex-col items-center gap-3 cursor-pointer w-full h-full justify-center group">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                    <span className="material-symbols-outlined text-3xl text-gray-500 group-hover:text-gray-300">upload_file</span>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-white text-sm group-hover:text-primary transition-colors">{label}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('input.dragDrop')}</p>
                  </div>
                  <input 
                      type="file" 
                      accept="application/pdf" 
                      className="hidden" 
                      onChange={(e) => handleFileUpload(e, type)}
                  />
              </label>
          )}
      </div>
    );
  };

  const StatRow = ({ label, field, hVal, aVal, isText = false }: { label: string, field: string, hVal: string | number, aVal: string | number, isText?: boolean }) => (
    <div className="flex items-center gap-4 py-3 border-b border-gray-800 last:border-0 hover:bg-white/5 px-2 transition-colors">
        <input 
            type={isText ? "text" : "number"}
            value={hVal} 
            onChange={(e) => handleStatChange('home', field, e.target.value)}
            className={`${isText ? 'w-32' : 'w-20'} bg-surface-dark border border-gray-700 rounded p-1.5 text-center text-white font-mono focus:border-primary focus:outline-none`}
        />
        <span className="flex-1 text-center text-sm font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        <input 
            type={isText ? "text" : "number"}
            value={aVal} 
            onChange={(e) => handleStatChange('away', field, e.target.value)}
            className={`${isText ? 'w-32' : 'w-20'} bg-surface-dark border border-gray-700 rounded p-1.5 text-center text-white font-mono focus:border-secondary focus:outline-none`}
        />
    </div>
  );

  return (
    <div className="flex flex-col h-full animate-fade-in pb-24 md:pb-0">
      {/* Tabs */}
      <div className="flex flex-col md:flex-row p-4 gap-4 bg-background-dark sticky top-0 z-10 justify-between items-center border-b border-gray-800/50">
        <div className="flex gap-2 w-full max-w-lg">
          <button 
            onClick={() => setActiveTab('boxscore')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'boxscore' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-surface-dark text-gray-400 hover:bg-gray-800'}`}
          >
            {t('input.boxscore')}
          </button>
          <button 
            onClick={() => setActiveTab('pbp')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'pbp' ? 'bg-secondary text-white shadow-lg shadow-secondary/20 scale-105' : 'bg-surface-dark text-gray-400 hover:bg-gray-800'}`}
          >
            {t('input.pbp')}
          </button>
           <button 
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'pdf' ? 'bg-warning text-white shadow-lg shadow-warning/20 scale-105' : 'bg-surface-dark text-gray-400 hover:bg-gray-800'}`}
          >
            {t('input.pdf')}
          </button>
        </div>
        
        <button 
          onClick={() => {
            if(window.confirm('Are you sure you want to clear all data?')) {
              resetGame();
            }
          }}
          className="text-red-500 text-xs font-bold border border-red-500/30 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
        >
          CLEAR ALL
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-4">
        <div className="max-w-3xl mx-auto w-full">
            
            {/* BOX SCORE VIEW */}
            {activeTab === 'boxscore' && (
               <div className="bg-surface-dark rounded-xl border border-gray-800 p-6 shadow-sm">
                  <div className="flex justify-between mb-6 px-4 gap-4">
                     <input 
                       type="text"
                       value={homeStats.name}
                       onChange={(e) => handleStatChange('home', 'name', e.target.value)}
                       className="text-xl font-bold text-primary bg-transparent border-b border-primary/30 focus:border-primary outline-none w-1/2 placeholder-primary/50"
                       placeholder="Home Team"
                     />
                     <input 
                       type="text"
                       value={awayStats.name}
                       onChange={(e) => handleStatChange('away', 'name', e.target.value)}
                       className="text-xl font-bold text-secondary bg-transparent border-b border-secondary/30 focus:border-secondary outline-none w-1/2 text-right placeholder-secondary/50"
                       placeholder="Away Team"
                     />
                  </div>
                  
                  <div className="flex flex-col">
                    <StatRow label="PTS" field="pts" hVal={homeStats.pts} aVal={awayStats.pts} />
                    <StatRow label="FGM" field="fg" hVal={homeStats.fg} aVal={awayStats.fg} />
                    <StatRow label="FGA" field="fga" hVal={homeStats.fga} aVal={awayStats.fga} />
                    <StatRow label="3PM" field="tp" hVal={homeStats.tp} aVal={awayStats.tp} />
                    <StatRow label="3PA" field="tpa" hVal={homeStats.tpa} aVal={awayStats.tpa} />
                    <StatRow label="FTM" field="ft" hVal={homeStats.ft} aVal={awayStats.ft} />
                    <StatRow label="FTA" field="fta" hVal={homeStats.fta} aVal={awayStats.fta} />
                    <StatRow label="ORB" field="orb" hVal={homeStats.orb} aVal={awayStats.orb} />
                    <StatRow label="DRB" field="drb" hVal={homeStats.drb} aVal={awayStats.drb} />
                    <StatRow label="AST" field="ast" hVal={homeStats.ast} aVal={awayStats.ast} />
                    <StatRow label="TOV" field="tov" hVal={homeStats.tov} aVal={awayStats.tov} />
                  </div>
               </div>
            )}

            {/* PLAY BY PLAY VIEW */}
            {activeTab === 'pbp' && (
               <div className="flex flex-col gap-6 md:grid md:grid-cols-12">
                  {/* Input Form */}
                  <div className="md:col-span-5">
                    <div className="bg-surface-dark rounded-xl border border-gray-800 p-5 sticky top-4">
                       <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider">{t('input.addEvent')}</h3>
                       <div className="grid grid-cols-4 gap-2 mb-3">
                          <select 
                             value={newEvent.quarter}
                             onChange={(e) => setNewEvent({...newEvent, quarter: e.target.value})}
                             className="bg-gray-800 text-white text-sm rounded-lg p-2.5 border border-gray-700 outline-none focus:border-primary"
                          >
                             <option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option><option>OT</option>
                          </select>
                          <input 
                             type="text" 
                             placeholder="MM:SS" 
                             value={newEvent.time}
                             onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                             className="bg-gray-800 text-white text-sm rounded-lg p-2.5 border border-gray-700 outline-none focus:border-primary"
                          />
                          <select 
                             value={newEvent.team}
                             onChange={(e) => setNewEvent({...newEvent, team: e.target.value as any})}
                             className="bg-gray-800 text-white text-sm rounded-lg p-2.5 border border-gray-700 outline-none col-span-2 focus:border-primary"
                          >
                             <option value="home">{homeStats.name}</option>
                             <option value="away">{awayStats.name}</option>
                          </select>
                       </div>
                       <div className="grid grid-cols-2 gap-2 mb-3">
                          <select 
                             value={newEvent.type}
                             onChange={(e) => setNewEvent({...newEvent, type: e.target.value as any})}
                             className="bg-gray-800 text-white text-sm rounded-lg p-2.5 border border-gray-700 outline-none focus:border-primary"
                          >
                             <option value="score">{t('input.score')}</option>
                             <option value="miss">{t('input.miss')}</option>
                             <option value="foul">{t('input.foul')}</option>
                             <option value="tov">{t('input.tov')}</option>
                             <option value="sub">{t('input.sub')}</option>
                          </select>
                          
                          {/* Autocomplete Player Input */}
                          <AutocompleteInput 
                            value={newEvent.player || ''}
                            onChange={(val) => setNewEvent({...newEvent, player: val})}
                            options={derivedMetrics.players}
                            placeholder={t('input.player')}
                          />
                       </div>

                       {/* Quick Description Actions */}
                       <div className="mb-3">
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Quick Actions</p>
                          <div className="flex flex-wrap gap-2">
                             {(PLAY_PRESETS[newEvent.type || 'score'] || []).map((preset) => (
                               <button 
                                 key={preset}
                                 onClick={() => setNewEvent({...newEvent, description: preset})}
                                 className="text-[10px] bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded px-2 py-1 transition-all"
                               >
                                 {preset}
                               </button>
                             ))}
                          </div>
                       </div>

                       <textarea 
                          placeholder={t('input.desc')} 
                          value={newEvent.description}
                          onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                          rows={3}
                          className="w-full bg-gray-800 text-white text-sm rounded-lg p-3 border border-gray-700 outline-none mb-4 resize-none focus:border-primary"
                       />
                       <button 
                          onClick={handleAddEvent}
                          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg text-sm transition-colors"
                       >
                          {t('input.addEvent')}
                       </button>
                    </div>
                  </div>

                  {/* Timeline Feed */}
                  <div className="md:col-span-7">
                      <div className="bg-surface-dark rounded-xl border border-gray-800 p-6">
                         <h3 className="text-sm font-bold text-gray-400 mb-6 uppercase">Game Log</h3>
                         <div className="flex flex-col gap-0 relative">
                             {events.length === 0 ? (
                               <p className="text-gray-500 text-sm text-center py-4">No events recorded. Add plays manually.</p>
                             ) : (
                               <>
                               <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-800"></div>
                               {events.map((ev) => (
                                  <div key={ev.id} className="relative pl-12 pb-8 group last:pb-0">
                                     <div className={`absolute left-4 top-1 w-4 h-4 rounded-full border-2 ${ev.team === 'home' ? 'bg-primary border-background-dark' : 'bg-secondary border-background-dark'} z-10 ring-4 ring-background-dark`}></div>
                                     <div className="flex justify-between items-start hover:bg-white/5 p-2 rounded-lg -ml-2 -mt-2 transition-colors">
                                        <div>
                                           <span className="text-xs font-mono text-gray-500 block mb-1 font-bold">{ev.quarter} • {ev.time}</span>
                                           <p className="text-sm text-gray-200 leading-snug">{ev.description}</p>
                                           {ev.player && <span className="text-xs text-primary font-bold">{ev.player}</span>}
                                        </div>
                                        <div className={`text-[10px] px-2 py-1 rounded font-bold uppercase ml-2 shrink-0 ${
                                           ev.type === 'score' ? 'bg-success/20 text-success' : 
                                           ev.type === 'tov' ? 'bg-red-500/20 text-red-500' : 
                                           'bg-gray-700 text-gray-400'
                                        }`}>
                                           {t(`input.${ev.type}`)}
                                        </div>
                                     </div>
                                  </div>
                               ))}
                               </>
                             )}
                         </div>
                      </div>
                  </div>
               </div>
            )}

            {/* PDF UPLOAD VIEW */}
            {activeTab === 'pdf' && (
              <div className="flex flex-col gap-6">
                <div className="bg-surface-dark p-6 rounded-xl border border-gray-800">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-warning">picture_as_pdf</span>
                    <h3 className="text-lg font-bold text-white">{t('input.pdf')}</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-6">{t('input.pdfNote')}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FileUploadCard 
                        type="boxscore" 
                        label={t('input.uploadBox')} 
                        active={!!pdfFiles.boxscore} 
                     />
                     <FileUploadCard 
                        type="pbp" 
                        label={t('input.uploadPbp')} 
                        active={!!pdfFiles.pbp} 
                     />
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};