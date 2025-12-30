import React, { useState, useMemo, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { useGame } from '../context/GameContext';
import { PlayEvent } from '../types';
import { InfoButton } from './Explainer';

// Configuration for normalization and display
const METRICS_CONFIG: Record<string, { max: number, label: string, desc: string, detailedDesc: string, lowerIsBetter?: boolean }> = {
  'ORTG': { 
    max: 150, 
    label: 'Ratio Ofensivo', 
    desc: 'Pts/100 Pos', 
    detailedDesc: 'Rating Ofensivo (ORTG): Estimación de puntos producidos por 100 posesiones basada en los eventos registrados.' 
  },
  'AST%': { 
    max: 100, 
    label: '% Asistencias', 
    desc: '% Asist.', 
    detailedDesc: 'Ratio de Asistencias: Porcentaje de posesiones que terminan en asistencia cuando el jugador está involucrado.' 
  },
  'REB': { 
    max: 20, 
    label: 'Rebotes', 
    desc: 'Total Reb', 
    detailedDesc: 'Volumen total de rebotes capturados (Ofensivos + Defensivos) según el registro de eventos.' 
  },
  'USG%': { 
    max: 50, 
    label: '% Uso', 
    desc: '% Usage', 
    detailedDesc: 'Porcentaje de Uso (USG%): Estimación del volumen ofensivo (Tiros + Pérdidas) que asume el jugador.' 
  },
  'eFG%': { 
    max: 100, 
    label: '% Tiro Efec.', 
    desc: '% eFG', 
    detailedDesc: 'Porcentaje de Tiro Efectivo (eFG%): Ajusta el FG% valorando los triples (FGM + 0.5 * 3PM) / FGA.' 
  },
  'TS%': { 
    max: 100, 
    label: '% Tiro Real', 
    desc: '% True Shooting', 
    detailedDesc: 'True Shooting (TS%): Eficiencia total de tiro incluyendo tiros de 2, 3 y libres.' 
  },
};

// Internal Component for Drawing the Court Heatmap
const CourtHeatmap: React.FC<{ 
    zones: { paint: number, mid: number, corner3: number, top3: number }, 
    playerColor: string,
    playerName: string 
}> = ({ zones, playerColor, playerName }) => {
    
    // Simple helper to determine color intensity based on FG%
    const getZoneColor = (pct: number, type: 'paint' | 'mid' | '3pt') => {
        // Thresholds
        const hot = type === 'paint' ? 60 : type === 'mid' ? 45 : 35;
        const cold = type === 'paint' ? 40 : type === 'mid' ? 30 : 25;
        
        if (pct >= hot) return '#ef4444'; // Red-500
        if (pct === 0) return '#374151'; // Gray-700 (No data)
        if (pct <= cold) return '#3b82f6'; // Blue-500
        return '#f59e0b'; // Amber-500 (Neutral)
    };

    const getOpacity = (pct: number) => pct > 0 ? 0.8 : 0.2;

    return (
        <div className="relative aspect-[4/3] w-full bg-surface-dark border border-gray-800 rounded-xl overflow-hidden shadow-inner">
            <div className="absolute top-2 left-2 z-10 bg-black/40 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white border border-white/10">
                {playerName}
            </div>
            
            <svg viewBox="0 0 500 470" className="w-full h-full">
                {/* Court Background Lines */}
                <g stroke="#4b5563" strokeWidth="3" fill="none">
                    <path d="M20,0 V470 H480 V0" /> {/* Out of bounds */}
                    <path d="M170,0 V190 H330 V0" /> {/* Paint */}
                    <circle cx="250" cy="190" r="60" /> {/* Free throw circle */}
                    <circle cx="250" cy="40" r="10" /> {/* Rim */}
                    <line x1="220" y1="35" x2="280" y2="35" /> {/* Backboard */}
                    {/* 3PT Line */}
                    <path d="M40,0 V140 Q40,300 250,300 Q460,300 460,140 V0" /> 
                </g>

                {/* --- HEAT ZONES --- */}

                {/* 1. Paint Zone */}
                <rect 
                    x="170" y="0" width="160" height="190" 
                    fill={getZoneColor(zones.paint, 'paint')} 
                    opacity={getOpacity(zones.paint)} 
                    className="transition-colors duration-500"
                />
                <text x="250" y="100" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" opacity="0.9">{zones.paint.toFixed(0)}%</text>

                {/* 2. Mid-Range */}
                <circle cx="100" cy="200" r="50" fill={getZoneColor(zones.mid, 'mid')} opacity={getOpacity(zones.mid)} filter="blur(20px)" />
                <circle cx="400" cy="200" r="50" fill={getZoneColor(zones.mid, 'mid')} opacity={getOpacity(zones.mid)} filter="blur(20px)" />
                <text x="250" y="245" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" opacity="0.9">{zones.mid.toFixed(0)}%</text>

                {/* 3. Corner 3s */}
                <rect x="0" y="0" width="40" height="140" fill={getZoneColor(zones.corner3, '3pt')} opacity={getOpacity(zones.corner3)} />
                <rect x="460" y="0" width="40" height="140" fill={getZoneColor(zones.corner3, '3pt')} opacity={getOpacity(zones.corner3)} />
                
                {/* 4. Top 3 */}
                <path 
                    d="M40,140 Q40,300 250,300 Q460,300 460,140 L500,140 V470 H0 V140 Z" 
                    fill={getZoneColor(zones.top3, '3pt')} 
                    opacity={getOpacity(zones.top3)} 
                    clipPath="inset(0 0 0 0)"
                />
                <text x="250" y="360" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">{zones.top3.toFixed(0)}%</text>
            </svg>
        </div>
    );
}

export const PlayerComparison: React.FC = () => {
  const { t } = useLanguage();
  const { events, homeStats, awayStats } = useGame();
  
  const [player1Id, setPlayer1Id] = useState<string>('');
  const [player2Id, setPlayer2Id] = useState<string>('');
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<string[]>(['ORTG', 'AST%', 'REB', 'USG%', 'eFG%', 'TS%']);

  // --- Dynamic Data Calculation ---
  const calculatedPlayers = useMemo(() => {
    const playersMap: Record<string, any> = {};

    if (events.length === 0) return [];

    events.forEach((ev: PlayEvent) => {
        if (!ev.player) return;
        
        const name = ev.player;
        if (!playersMap[name]) {
            playersMap[name] = {
                id: name,
                name: name,
                short: name.substring(0, 3).toUpperCase(),
                team: ev.team === 'home' ? homeStats.name : awayStats.name,
                raw: {
                    pts: 0, fga: 0, fgm: 0, tpa: 0, tpm: 0, fta: 0, ftm: 0, 
                    ast: 0, reb: 0, tov: 0,
                    zones: {
                        paintM: 0, paintA: 0,
                        midM: 0, midA: 0,
                        c3M: 0, c3A: 0,
                        t3M: 0, t3A: 0
                    }
                }
            };
        }

        const p = playersMap[name];
        const desc = ev.description.toLowerCase();

        // Basic Stats
        if (ev.type === 'score') {
            let pts = 2;
            let is3 = desc.includes('3pt') || desc.includes('three');
            let isFt = desc.includes('free') || desc.includes('ft');

            if (is3) {
                pts = 3;
                p.raw.tpm++;
                p.raw.tpa++;
                p.raw.fgm++;
                p.raw.fga++;
            } else if (isFt) {
                pts = 1;
                p.raw.ftm++;
                p.raw.fta++;
            } else {
                // 2pt
                p.raw.fgm++;
                p.raw.fga++;
            }
            p.raw.pts += pts;
        } else if (ev.type === 'miss') {
            let is3 = desc.includes('3pt') || desc.includes('three');
            let isFt = desc.includes('free') || desc.includes('ft');
            if (is3) {
                p.raw.tpa++;
                p.raw.fga++;
            } else if (isFt) {
                p.raw.fta++;
            } else {
                p.raw.fga++;
            }
        } else if (ev.type === 'tov') {
            p.raw.tov++;
        }

        // Heuristics for non-explicit types
        if (desc.includes('assist')) p.raw.ast++;
        if (desc.includes('rebound')) p.raw.reb++;

        // Shot Zones Logic (Parsing Description)
        if (ev.type === 'score' || ev.type === 'miss') {
            if (desc.includes('3pt') || desc.includes('three')) {
               // Randomly assign to Top or Corner if not specified, mostly top
               if(desc.includes('corner')) {
                  if(ev.type === 'score') p.raw.zones.c3M++;
                  p.raw.zones.c3A++;
               } else {
                  if(ev.type === 'score') p.raw.zones.t3M++;
                  p.raw.zones.t3A++;
               }
            } else if (desc.includes('layup') || desc.includes('dunk') || desc.includes('paint') || desc.includes('driving')) {
                if(ev.type === 'score') p.raw.zones.paintM++;
                p.raw.zones.paintA++;
            } else if (desc.includes('jump') || desc.includes('pull') || desc.includes('mid')) {
                if(ev.type === 'score') p.raw.zones.midM++;
                p.raw.zones.midA++;
            } else if (!desc.includes('free') && !desc.includes('ft')) {
                // Default fallback to paint for unspecified 2 pointers
                if(ev.type === 'score') p.raw.zones.paintM++;
                p.raw.zones.paintA++;
            }
        }
    });

    // Calculate Derived Stats
    return Object.values(playersMap).map((p: any) => {
        const r = p.raw;
        
        // eFG% = (FGM + 0.5 * 3PM) / FGA
        const efg = r.fga > 0 ? ((r.fgm + 0.5 * r.tpm) / r.fga) * 100 : 0;
        
        // TS% = PTS / (2 * (FGA + 0.44 * FTA))
        const ts = (r.fga + 0.44 * r.fta) > 0 ? (r.pts / (2 * (r.fga + 0.44 * r.fta))) * 100 : 0;
        
        // USG Proxy: (FGA + 0.44*FTA + TOV)
        const usgVol = r.fga + 0.44 * r.fta + r.tov;
        // ORTG Proxy: PTS / USG_Volume (Not exact but relative) * 100
        const ortg = usgVol > 0 ? (r.pts / usgVol) * 100 : 0;
        
        // AST Ratio
        const astRatio = usgVol > 0 ? (r.ast / usgVol) * 100 : 0;

        // Zone Pcts
        const calcZone = (m: number, a: number) => a > 0 ? (m/a)*100 : 0;

        return {
            ...p,
            stats: {
                'ORTG': parseFloat(ortg.toFixed(1)),
                'eFG%': parseFloat(efg.toFixed(1)),
                'TS%': parseFloat(ts.toFixed(1)),
                'USG%': parseFloat(usgVol.toFixed(1)), // Displaying Volume index roughly
                'AST%': parseFloat(astRatio.toFixed(1)),
                'REB': r.reb
            },
            shotZones: {
                paint: calcZone(r.zones.paintM, r.zones.paintA),
                mid: calcZone(r.zones.midM, r.zones.midA),
                corner3: calcZone(r.zones.c3M, r.zones.c3A),
                top3: calcZone(r.zones.t3M, r.zones.t3A)
            }
        };
    }).sort((a: any, b: any) => b.raw.pts - a.raw.pts); // Sort by points initially

  }, [events, homeStats, awayStats]);

  // Set default selection when players are loaded
  useEffect(() => {
    if (calculatedPlayers.length >= 1 && !player1Id) setPlayer1Id(calculatedPlayers[0].id);
    if (calculatedPlayers.length >= 2 && !player2Id) setPlayer2Id(calculatedPlayers[1].id);
  }, [calculatedPlayers]);

  // Handle empty state
  if (calculatedPlayers.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4 p-8 text-center animate-fade-in">
              <div className="w-20 h-20 bg-surface-dark rounded-full flex items-center justify-center border border-gray-700">
                  <span className="material-symbols-outlined text-4xl text-gray-500">groups</span>
              </div>
              <div>
                  <h3 className="text-xl font-bold text-white mb-2">{t('input.uploadBox')} / {t('input.uploadPbp')}</h3>
                  <p className="text-gray-400 max-w-md">
                      Para comparar jugadores, primero debes cargar datos del partido (PDF) o ingresar eventos manualmente en la sección de "Entrada".
                  </p>
              </div>
          </div>
      );
  }

  const player1 = calculatedPlayers.find((p: any) => p.id === player1Id) || calculatedPlayers[0];
  const player2 = calculatedPlayers.find((p: any) => p.id === player2Id) || calculatedPlayers[1] || calculatedPlayers[0];

  const toggleMetric = (metric: string) => {
    if (activeMetrics.includes(metric)) {
      if (activeMetrics.length > 3) {
        setActiveMetrics(prev => prev.filter(m => m !== metric));
      }
    } else {
      if (activeMetrics.length < 6) {
        setActiveMetrics(prev => [...prev, metric]);
      }
    }
  };

  const chartData = activeMetrics.map(key => {
      const config = METRICS_CONFIG[key];
      const p1Val = player1.stats[key as keyof typeof player1.stats] || 0;
      const p2Val = player2.stats[key as keyof typeof player2.stats] || 0;
      
      let valA = (p1Val / config.max) * 100;
      let valB = (p2Val / config.max) * 100;

      if (config.lowerIsBetter) {
          valA = 100 - ((p1Val) / (config.max)) * 100;
          valB = 100 - ((p2Val) / (config.max)) * 100;
      }

      return {
        subject: config.label,
        key: key,
        A: Math.max(0, Math.min(100, valA)),
        B: Math.max(0, Math.min(100, valB)),
        rawA: p1Val,
        rawB: p2Val,
        fullMark: 100
      };
  });

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 animate-fade-in relative">
        {/* Selectors */}
        <div className="bg-surface-dark rounded-xl p-4 shadow-sm border border-gray-800 flex items-center justify-between gap-2">
            <div className="flex-1">
                <label className="text-xs text-gray-400 font-bold block mb-1">{t('comp.selectPlayer')}</label>
                <select 
                    value={player1Id} 
                    onChange={(e) => setPlayer1Id(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2 focus:border-primary focus:outline-none"
                >
                    {calculatedPlayers.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.team})</option>)}
                </select>
            </div>
            <div className="flex items-center justify-center pt-5">
                <span className="text-sm font-bold text-gray-500">VS</span>
            </div>
             <div className="flex-1">
                <label className="text-xs text-gray-400 font-bold block mb-1">{t('comp.selectPlayer')}</label>
                <select 
                    value={player2Id} 
                    onChange={(e) => setPlayer2Id(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2 focus:border-secondary focus:outline-none"
                >
                    {calculatedPlayers.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.team})</option>)}
                </select>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Main Content: Chart + Metrics */}
            <div className="flex-1 flex flex-col gap-6">
                
                {/* Chart Section */}
                <div className="bg-surface-dark rounded-xl p-6 shadow-sm flex flex-col items-center border border-gray-800 relative">
                   <div className="absolute top-4 right-4 z-10">
                      <InfoButton title="Comparison" contextData={`Comparing ${player1.name} and ${player2.name}. Radar chart visualizes strengths and weaknesses.`} />
                   </div>
                   <div className="flex w-full justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-white">{t('comp.visual')}</h3>
                      <div className="flex flex-col gap-2 items-end">
                        <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-primary"></span><span className="text-xs font-medium text-gray-300">{player1.name}</span></div>
                        <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-secondary"></span><span className="text-xs font-medium text-gray-300">{player2.name}</span></div>
                      </div>
                   </div>
                   
                   <div className="w-full h-80">
                     <ResponsiveContainer width="100%" height="100%">
                       <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                         <PolarGrid stroke="#374151" />
                         <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }} />
                         <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                         <Tooltip 
                            contentStyle={{ backgroundColor: '#1e2832', borderColor: '#374151', color: '#fff' }}
                            itemStyle={{ fontSize: '12px' }}
                            formatter={(value: number, name: string, props: any) => {
                                const isA = name === player1.short;
                                const raw = isA ? props.payload.rawA : props.payload.rawB;
                                return [raw, isA ? player1.name : player2.name];
                            }}
                         />
                         <Radar name={player1.short} dataKey="A" stroke="#1392ec" strokeWidth={2} fill="#1392ec" fillOpacity={0.3} />
                         <Radar name={player2.short} dataKey="B" stroke="#fa6238" strokeWidth={2} fill="#fa6238" fillOpacity={0.3} />
                       </RadarChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                {/* Metrics Configuration */}
                <div className="bg-surface-dark rounded-xl p-6 border border-gray-800 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-sm text-gray-300 uppercase">Métricas</h3>
                        <span className="text-xs text-gray-500">{activeMetrics.length}/6 Seleccionadas</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {Object.keys(METRICS_CONFIG).map((metric) => {
                            const isActive = activeMetrics.includes(metric);
                            const isDisabled = !isActive && activeMetrics.length >= 6;
                            return (
                                <button
                                    key={metric}
                                    onClick={() => toggleMetric(metric)}
                                    disabled={isDisabled}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                        isActive 
                                        ? 'bg-primary/20 border-primary text-primary' 
                                        : isDisabled 
                                            ? 'opacity-30 cursor-not-allowed border-gray-800 text-gray-500'
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                                    }`}
                                >
                                    {METRICS_CONFIG[metric].label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Detailed Breakdown Table */}
                <div className="flex flex-col gap-4">
                   <div className="flex items-center justify-between px-2">
                      <h3 className="font-bold text-lg text-white">{t('comp.breakdown')}</h3>
                   </div>
                   
                   <div className="bg-surface-dark rounded-xl overflow-hidden border border-gray-800 shadow-sm">
                      <div className="grid grid-cols-12 bg-gray-800/40 py-3 px-4 border-b border-gray-800 text-xs font-bold text-gray-400 uppercase tracking-wider">
                         <div className="col-span-4 md:col-span-4">{t('comp.metric')}</div>
                         <div className="col-span-3 md:col-span-3 text-center text-primary">{player1.short}</div>
                         <div className="col-span-2 md:col-span-2 text-center">Dif</div>
                         <div className="col-span-3 md:col-span-3 text-center text-secondary">{player2.short}</div>
                      </div>
                      <div className="divide-y divide-gray-800/50">
                         {Object.keys(METRICS_CONFIG).map((key) => {
                            const conf = METRICS_CONFIG[key];
                            const valA = player1.stats[key as keyof typeof player1.stats] || 0;
                            const valB = player2.stats[key as keyof typeof player2.stats] || 0;
                            
                            const lowerIsBetter = conf.lowerIsBetter;
                            
                            let winner = null;
                            if (valA !== valB) {
                                if (lowerIsBetter) {
                                    winner = valA < valB ? 'A' : 'B';
                                } else {
                                    winner = valA > valB ? 'A' : 'B';
                                }
                            }

                            const diff = Math.abs(valA - valB).toFixed(1);
                            const isExpanded = expandedMetric === key;
                            
                            return (
                                <div key={key} className="flex flex-col">
                                    <div 
                                        onClick={() => setExpandedMetric(isExpanded ? null : key)}
                                        className={`grid grid-cols-12 py-3 px-4 hover:bg-white/5 transition-colors items-center cursor-pointer group ${isExpanded ? 'bg-white/5' : ''}`}
                                    >
                                       <div className="col-span-4 md:col-span-4 flex flex-col justify-center pr-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">{conf.label}</span>
                                            <span className={`material-symbols-outlined text-[14px] transition-colors ${isExpanded ? 'text-primary' : 'text-gray-600 group-hover:text-gray-400'}`}>info</span>
                                          </div>
                                          <span className="text-[10px] text-gray-500 hidden md:block">{conf.desc}</span>
                                       </div>
                                       
                                       <div className={`col-span-3 md:col-span-3 flex items-center justify-center font-mono font-bold text-sm transition-all ${winner === 'A' ? 'text-success bg-success/10 rounded py-1' : 'text-gray-400'}`}>
                                          {valA}
                                       </div>

                                       <div className="col-span-2 md:col-span-2 flex justify-center">
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500 ${diff !== '0.0' ? 'opacity-100' : 'opacity-30'}`}>
                                             {diff === '0.0' ? '-' : diff}
                                          </span>
                                       </div>

                                       <div className={`col-span-3 md:col-span-3 flex items-center justify-center font-mono font-bold text-sm transition-all ${winner === 'B' ? 'text-success bg-success/10 rounded py-1' : 'text-gray-400'}`}>
                                          {valB}
                                       </div>
                                    </div>
                                    
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out bg-gray-900/40 ${isExpanded ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="px-4 py-3 border-b border-gray-800/50 mx-2 mb-1 rounded-b-lg">
                                             <p className="text-xs text-gray-300 leading-relaxed">
                                                <span className="font-bold text-primary mr-2 block mb-1">{conf.label}</span>
                                                {conf.detailedDesc}
                                             </p>
                                        </div>
                                    </div>
                                </div>
                            );
                         })}
                      </div>
                   </div>
                </div>

                {/* --- SHOT EFFICIENCY HEATMAP --- */}
                <div className="flex flex-col gap-4 mt-2">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="font-bold text-lg text-white">Mapa de Calor (Eficiencia)</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CourtHeatmap 
                            zones={player1.shotZones} 
                            playerColor="#1392ec"
                            playerName={player1.name}
                        />
                        <CourtHeatmap 
                            zones={player2.shotZones} 
                            playerColor="#fa6238"
                            playerName={player2.name}
                        />
                    </div>
                    <p className="text-xs text-gray-500 italic text-center">
                        Calculado basándose en las descripciones de los eventos del partido.
                    </p>
                </div>

            </div>

            {/* Explanation Sidebar */}
            <div className="lg:w-80 flex flex-col gap-4">
                 <div className="bg-surface-dark border border-gray-800 rounded-xl p-5 sticky top-4">
                    <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">info</span>
                        Guía de Análisis
                    </h4>
                    <div className="flex flex-col gap-4">
                        <div>
                            <h5 className="text-xs font-bold text-gray-300 uppercase mb-1">Sobre los Datos</h5>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Estos datos son calculados en tiempo real basándose en los eventos cargados en la sección "Entrada".
                                <br/><br/>
                                Si los datos de "Shot Zones" están vacíos, asegúrate de que el Play-by-Play contenga descripciones como "Layup", "3pt", "Jumpshot".
                            </p>
                        </div>
                    </div>
                 </div>
            </div>

        </div>
    </div>
  );
};