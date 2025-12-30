import React, { useState } from 'react';
import { generateDetailedReport } from '../services/geminiService';
import { useLanguage } from '../context/LanguageContext';
import { useGame } from '../context/GameContext';
import { jsPDF } from 'jspdf';
import { PlayEvent } from '../types';

// Helper to aggregate stats from events to give AI better context
const aggregatePlayerStats = (events: PlayEvent[]) => {
  const players: Record<string, { 
    points: number; 
    fga: number; 
    fgm: number; 
    tov: number; 
    actions: number; 
    team: string 
  }> = {};

  events.forEach(ev => {
    if (!ev.player) return;
    const name = ev.player;
    
    if (!players[name]) {
      players[name] = { points: 0, fga: 0, fgm: 0, tov: 0, actions: 0, team: ev.team };
    }
    
    players[name].actions += 1; // General activity counter

    if (ev.type === 'score') {
      players[name].fgm += 1;
      players[name].fga += 1;
      // Heuristic for points
      const desc = ev.description.toLowerCase();
      const pts = desc.includes('3pt') || desc.includes('three') ? 3 : desc.includes('free') ? 1 : 2;
      players[name].points += pts;
    } else if (ev.type === 'miss') {
      players[name].fga += 1;
    } else if (ev.type === 'tov') {
      players[name].tov += 1;
    }
  });

  // Convert to array and sort by "impact" (actions + points)
  return Object.entries(players)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => (b.points + b.actions) - (a.points + a.actions));
};

export const Reports: React.FC = () => {
  const { t, language } = useLanguage();
  const { homeStats, awayStats, derivedMetrics, events } = useGame();
  const [reportText, setReportText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const handleGenerate = async (labelKey: string) => {
    setLoading(true);
    setActiveReport(labelKey);
    setReportText(null);
    
    // 1. Aggregate Player Data for Accuracy
    const playerAgg = aggregatePlayerStats(events);
    const topPlayers = playerAgg.slice(0, 12); // Send top 12 active players for better rotation analysis

    // 2. Construct Enhanced Data Context
    const contextData = `
      GAME SUMMARY:
      ${homeStats.name} (Home) vs ${awayStats.name} (Away)
      Final Score: ${homeStats.pts} - ${awayStats.pts}
      
      STATS FOR HOME TEAM (${homeStats.name}):
      - FG: ${homeStats.fg}/${homeStats.fga} 
      - 3PT: ${homeStats.tp}/${homeStats.tpa} 
      - FT: ${homeStats.ft}/${homeStats.fta}
      - REB: ${homeStats.orb + homeStats.drb} (ORB: ${homeStats.orb})
      - TOV: ${homeStats.tov}
      - eFG%: ${(derivedMetrics.homeFactors.efg * 100).toFixed(1)}%
      - TOV%: ${(derivedMetrics.homeFactors.tov * 100).toFixed(1)}%
      
      STATS FOR AWAY TEAM (${awayStats.name}):
      - FG: ${awayStats.fg}/${awayStats.fga} 
      - 3PT: ${awayStats.tp}/${awayStats.tpa} 
      - FT: ${awayStats.ft}/${awayStats.fta}
      - REB: ${awayStats.orb + awayStats.drb} (ORB: ${awayStats.orb})
      - TOV: ${awayStats.tov}
      - eFG%: ${(derivedMetrics.awayFactors.efg * 100).toFixed(1)}%
      - TOV%: ${(derivedMetrics.awayFactors.tov * 100).toFixed(1)}%
      
      PLAYER PERFORMANCE DATA:
      ${topPlayers.map(p => 
        `- ${p.name} (${p.team}): ${p.points} Pts, ${p.fgm}/${p.fga} FG, ${p.tov} TOV.`
      ).join('\n')}
      
      SUBSTITUTION & PLAY LOG (Last 15 events for flow context):
      ${events.slice(0, 15).map(e => `[${e.quarter} ${e.time}] ${e.type.toUpperCase()}: ${e.description} (${e.player || 'Team'})`).join('\n')}
    `;
    
    // Pass the key (e.g. 'rep.btn_lineups') to service to select the correct prompt strategy
    const result = await generateDetailedReport(contextData, labelKey, language);
    setReportText(result);
    setLoading(false);
  };

  const handleExportPDF = () => {
    if (!reportText) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxLineWidth = pageWidth - margin * 2;

    // Title - STRICT BLACK
    doc.setTextColor(0, 0, 0); 
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('BasketIQ Pro Report', margin, 20);

    // Meta - STRICT BLACK
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleString();
    doc.text(`Generated: ${dateStr}`, margin, 30);
    doc.text(`Match: ${homeStats.name} vs ${awayStats.name}`, margin, 35);
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, 40, pageWidth - margin, 40);

    let cursorY = 50;
    
    // Split by logical paragraphs/lines first
    const logicalLines = reportText.split('\n');

    logicalLines.forEach((line) => {
      // Handle empty lines
      if (!line.trim()) {
        cursorY += 4;
        return;
      }

      let fontSize = 11;
      let fontStyle = 'normal';
      let indent = 0;
      let spacingAfter = 4;
      let cleanLine = line;

      // Identify formatting based on Markdown patterns
      if (line.startsWith('## ')) {
        fontSize = 16;
        fontStyle = 'bold';
        cleanLine = line.replace('## ', '');
        spacingAfter = 8;
        cursorY += 6; // Extra breathing room before header
      } else if (line.startsWith('### ')) {
        fontSize = 13;
        fontStyle = 'bold';
        cleanLine = line.replace('### ', '');
        spacingAfter = 6;
        cursorY += 3;
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        indent = 6;
        cleanLine = '• ' + line.trim().substring(2);
      } else if (line.trim().match(/^\d+\./)) {
         indent = 6;
         // cleanLine remains same
      }

      // Remove bold markdown markers for PDF readability
      cleanLine = cleanLine.replace(/\*\*/g, '');

      doc.setFont('helvetica', fontStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(0, 0, 0); // Ensure black text

      // Split text to fit width
      const lines = doc.splitTextToSize(cleanLine, maxLineWidth - indent);
      
      // Calculate height of this text block
      // 1 pt approx 0.3527 mm. Factor 1.3 for line height.
      const lineHeightMm = fontSize * 0.3527 * 1.3;
      const blockHeight = lines.length * lineHeightMm;

      // Check for page break
      if (cursorY + blockHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }

      doc.text(lines, margin + indent, cursorY);
      cursorY += blockHeight + spacingAfter;
    });

    doc.save(`BasketIQ_Report_${Date.now()}.pdf`);
  };

  const handleExportJSON = () => {
    const data = {
      meta: {
        generatedAt: new Date().toISOString(),
        version: "1.0",
        app: "BasketIQ Pro"
      },
      match: { 
        home: homeStats, 
        away: awayStats,
        metrics: derivedMetrics 
      },
      events: events,
      reportContent: reportText || "No report generated",
      reportType: activeReport ? t(activeReport) : null
    };
    
    const safeDate = new Date().toISOString().split('T')[0];
    const fileName = `BasketIQ_${homeStats.name}_vs_${awayStats.name}_${safeDate}.json`
      .replace(/\s+/g, '_');

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in pb-24">
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-surface-dark to-background-dark border-b border-gray-800 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="bg-white text-black p-2 rounded-lg">
                <span className="material-symbols-outlined text-2xl">description</span>
             </div>
             <h1 className="text-xl font-bold text-white leading-none">{t('rep.title')}</h1>
          </div>
          <p className="text-sm text-gray-400">{t('rep.subtitle')}</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={handleExportJSON}
             className="bg-surface-dark hover:bg-gray-800 text-gray-300 border border-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors"
           >
             <span className="material-symbols-outlined text-sm">data_object</span>
             JSON
           </button>
           {reportText && (
             <button 
               onClick={handleExportPDF}
               className="bg-white hover:bg-gray-100 text-black px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors shadow-lg"
             >
               <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
               PDF
             </button>
           )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-4 flex flex-col gap-4">
        
        {/* Report Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button 
            onClick={() => handleGenerate('rep.btn_match')}
            className={`p-3 rounded-xl border transition-all text-left flex flex-col gap-2 ${activeReport === 'rep.btn_match' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-surface-dark border-gray-800 hover:border-gray-600 text-gray-400 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-sm">assessment</span>
            <span className="text-xs font-bold">{t('rep.btn_match')}</span>
          </button>

          <button 
             onClick={() => handleGenerate('rep.btn_lineups')}
             className={`p-3 rounded-xl border transition-all text-left flex flex-col gap-2 ${activeReport === 'rep.btn_lineups' ? 'bg-warning text-black border-warning shadow-lg shadow-warning/20' : 'bg-surface-dark border-gray-800 hover:border-gray-600 text-gray-400 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-sm">groups</span>
            <span className="text-xs font-bold">{t('rep.btn_lineups')}</span>
          </button>

          <button 
             onClick={() => handleGenerate('rep.btn_scout')}
             className={`p-3 rounded-xl border transition-all text-left flex flex-col gap-2 ${activeReport === 'rep.btn_scout' ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/20' : 'bg-surface-dark border-gray-800 hover:border-gray-600 text-gray-400 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-sm">radar</span>
            <span className="text-xs font-bold">{t('rep.btn_scout')}</span>
          </button>

          <button 
             onClick={() => handleGenerate('rep.btn_tactical')}
             className={`p-3 rounded-xl border transition-all text-left flex flex-col gap-2 ${activeReport === 'rep.btn_tactical' ? 'bg-success text-white border-success shadow-lg shadow-success/20' : 'bg-surface-dark border-gray-800 hover:border-gray-600 text-gray-400 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-sm">fact_check</span>
            <span className="text-xs font-bold">{t('rep.btn_tactical')}</span>
          </button>
        </div>

        {/* Report Content Area - STRICT WHITE BACKGROUND AND DARK TEXT */}
        <div className="flex-1 bg-white text-black rounded-xl p-8 shadow-2xl min-h-[500px] border border-gray-200 relative max-w-5xl mx-auto w-full">
          
          {loading ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl z-10">
                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-bold text-black animate-pulse tracking-wider">{t('rep.generating')}</p>
             </div>
          ) : null}

          {!reportText && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 mt-20">
               <span className="material-symbols-outlined text-7xl opacity-50">article</span>
               <p className="font-medium">{t('rep.empty')}</p>
            </div>
          ) : (
            <div className="prose prose-sm md:prose-base max-w-none text-black font-serif leading-relaxed">
              {/* Simple Markdown Rendering Logic with STRICT BLACK TEXT */}
              {reportText?.split('\n').map((line, i) => {
                if (line.startsWith('## ')) {
                  // H2 - Strict Black
                  return <h2 key={i} className="text-2xl font-bold text-black mt-8 mb-4 border-b-2 border-black pb-2">{line.replace('## ', '')}</h2>;
                }
                if (line.startsWith('### ')) {
                  // H3 - Strict Black
                  return <h3 key={i} className="text-xl font-bold text-black mt-6 mb-3">{line.replace('### ', '')}</h3>;
                }
                if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                  // Lists - Strict Black
                  return <li key={i} className="ml-4 text-black mb-1 list-disc pl-1">{line.replace(/^- |^\* /, '')}</li>;
                }
                if (line.trim().match(/^\d+\./)) {
                    // Numbered Lists - Strict Black
                    return <div key={i} className="font-bold mt-3 text-black">{line}</div>
                }
                if (line.includes('**')) {
                   const parts = line.split('**');
                   return (
                     <p key={i} className="mb-3 text-black">
                       {parts.map((part, index) => index % 2 === 1 ? <strong key={index} className="font-bold">{part}</strong> : part)}
                     </p>
                   )
                }
                // Paragraphs - Strict Black
                return <p key={i} className="mb-3 text-black">{line}</p>;
              })}
              
              <div className="mt-12 pt-6 border-t border-gray-300 flex justify-between text-xs text-gray-500 font-sans">
                <span className="uppercase tracking-widest font-bold">BasketIQ Pro Analytics</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};