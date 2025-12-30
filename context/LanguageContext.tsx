import React, { createContext, useState, useContext, ReactNode } from 'react';

export type Language = 'es' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  es: {
    // Nav
    'nav.dashboard': 'Resumen',
    'nav.factors': 'Factores',
    'nav.scouting': 'Scouting',
    'nav.flow': 'Flujo',
    'nav.compare': 'Comparar',
    'nav.reports': 'Informes',
    'nav.input': 'Entrada',
    // Dashboard
    'dash.title': 'Dashboard de Equipo',
    'dash.season': 'Temp. 23-24',
    'dash.last10': 'Últimos 10',
    'dash.netRating': 'Net Rating',
    'dash.netRatingDesc': 'Pts por 100 posesiones (vs Liga)',
    'dash.offRating': 'Off Rating',
    'dash.defRating': 'Def Rating',
    'dash.evolution': 'Evolución (Últ. 8)',
    'dash.recentGames': 'Partidos Recientes',
    'dash.local': 'Local',
    'dash.visitor': 'Visitante',
    'dash.pts': 'Pts',
    // Factors
    'factors.title': 'Cuatro Factores',
    'factors.summary': 'Resumen del Partido',
    'factors.shooting': 'Tiro Eficiente',
    'factors.shootingDesc': 'Excelente selección de tiro. Top 10% de la liga.',
    'factors.tov': 'Control de Balón',
    'factors.tovDesc': 'Pérdidas controladas bajo presión.',
    'factors.orb': 'Rebote Ofensivo',
    'factors.orbDesc': 'Necesitamos cargar más el rebote.',
    'factors.ft': 'Tiros Libres',
    'factors.ftDesc': 'Agresividad atacando el aro es buena.',
    'factors.target': 'Objetivo',
    // Scouting
    'scout.title': 'Scouting Report',
    'scout.export': 'Exportar',
    'scout.volume': 'Volumen',
    'scout.shotSummary': 'Resumen de Tiro',
    'scout.paint': 'Zona Pintada',
    'scout.midRange': 'Media Distancia',
    'scout.freq': 'Freq',
    'scout.ppp': 'PPP',
    'scout.team': 'Equipo',
    'scout.notes': 'Notas del Equipo',
    'scout.notesPlaceholder': 'Añade notas tácticas, observaciones o estrategias aquí...',
    // Momentum
    'mom.title': 'Momentum & Flow',
    'mom.live': 'EN VIVO',
    'mom.prob': 'Probabilidad Actual',
    'mom.flow': 'Flujo de Juego',
    'mom.alerts': 'Alertas',
    'mom.burst': 'Explosión Ofensiva',
    'mom.burstDesc': 'Parcial 8-0 en 90 segundos.',
    'mom.rebound': 'Problema en el Rebote',
    'mom.reboundDesc': 'Rival con 4 rebotes ofensivos consecutivos.',
    'mom.ago': 'Hace',
    'mom.sec': 's',
    'mom.min': 'm',
    // Comparison
    'comp.title': 'Comparador',
    'comp.visual': 'Comparativa Visual',
    'comp.breakdown': 'Desglose Métrico',
    'comp.metric': 'Métrica',
    'comp.selectPlayer': 'Seleccionar Jugador',
    // Reports
    'rep.title': 'Informes & Análisis',
    'rep.subtitle': 'Genera análisis detallados basados en datos.',
    'rep.btn_match': 'Análisis Post-Partido',
    'rep.btn_scout': 'Informe de Scouting',
    'rep.btn_tactical': 'Auditoría Táctica',
    'rep.btn_lineups': 'Análisis de Quintetos',
    'rep.generating': 'Redactando informe...',
    'rep.empty': 'Selecciona un tipo de informe para comenzar.',
    // AI
    'ai.title': 'Asistente AI',
    'ai.subtitle': 'Pregunta sobre estrategia, rotaciones o jugadas.',
    'ai.analyzing': 'Analizando datos del partido...',
    'ai.placeholder': 'Pregunta al entrenador...',
    'ai.examples': 'Ejemplos: "¿Cómo paramos el P&R?", "¿Pido tiempo muerto?", "Análisis últimos 5 min"',
    'ai.send': 'Enviar',
    'ai.empty': 'No se pudo generar respuesta.',
    'ai.error': 'Error al conectar con el asistente.',
    // Input Stats
    'input.title': 'Entrada de Datos',
    'input.boxscore': 'Marcador Global',
    'input.pbp': 'Play by Play',
    'input.pdf': 'Importar PDF',
    'input.home': 'Local',
    'input.away': 'Visitante',
    'input.save': 'Guardar',
    'input.addEvent': 'Añadir Evento',
    'input.time': 'Tiempo',
    'input.q': 'Cuarto',
    'input.desc': 'Descripción',
    'input.type': 'Tipo',
    'input.score': 'Anotación',
    'input.miss': 'Fallo',
    'input.foul': 'Falta',
    'input.tov': 'Pérdida',
    'input.sub': 'Cambio',
    'input.player': 'Jugador',
    'input.uploadBox': 'Subir Estadística de Partido',
    'input.uploadPbp': 'Subir Play-by-Play',
    'input.dragDrop': 'Arrastra un PDF aquí o haz clic',
    'input.fileUploaded': 'Archivo cargado',
    'input.remove': 'Eliminar',
    'input.pdfNote': 'Estos archivos serán leídos por la IA para generar informes detallados.',
    'input.analyze': 'Analizar PDF',
    'input.analyzing': 'Procesando...',
    'input.successBox': '¡Estadísticas de partido extraídas correctamente!',
    'input.successPbp': '¡Eventos Play-by-Play importados correctamente!',
    'input.errorPdf': 'Error al procesar el PDF. Asegúrate de que es legible.',
  },
  en: {
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.factors': 'Factors',
    'nav.scouting': 'Scouting',
    'nav.flow': 'Flow',
    'nav.compare': 'Compare',
    'nav.reports': 'Reports',
    'nav.input': 'Input',
    // Dashboard
    'dash.title': 'Team Dashboard',
    'dash.season': 'Season 23-24',
    'dash.last10': 'Last 10',
    'dash.netRating': 'Net Rating',
    'dash.netRatingDesc': 'Pts per 100 poss (vs League)',
    'dash.offRating': 'Off Rating',
    'dash.defRating': 'Def Rating',
    'dash.evolution': 'Evolution (Last 8)',
    'dash.recentGames': 'Recent Games',
    'dash.local': 'Home',
    'dash.visitor': 'Away',
    'dash.pts': 'Pts',
    // Factors
    'factors.title': 'Four Factors',
    'factors.summary': 'Match Summary',
    'factors.shooting': 'Effective Shooting',
    'factors.shootingDesc': 'Excellent shot selection. Top 10% of league.',
    'factors.tov': 'Ball Control',
    'factors.tovDesc': 'Turnovers controlled under pressure.',
    'factors.orb': 'Offensive Rebounding',
    'factors.orbDesc': 'Need to crash the boards more.',
    'factors.ft': 'Free Throws',
    'factors.ftDesc': 'Rim attack aggression is good.',
    'factors.target': 'Target',
    // Scouting
    'scout.title': 'Scouting Report',
    'scout.export': 'Export',
    'scout.volume': 'Volume',
    'scout.shotSummary': 'Shot Summary',
    'scout.paint': 'Paint',
    'scout.midRange': 'Mid-Range',
    'scout.freq': 'Freq',
    'scout.ppp': 'PPP',
    'scout.team': 'Team',
    'scout.notes': 'Team Notes',
    'scout.notesPlaceholder': 'Add tactical notes, observations, or strategies here...',
    // Momentum
    'mom.title': 'Momentum & Flow',
    'mom.live': 'LIVE',
    'mom.prob': 'Win Probability',
    'mom.flow': 'Game Flow',
    'mom.alerts': 'Alerts',
    'mom.burst': 'Offensive Burst',
    'mom.burstDesc': '8-0 run in 90 seconds.',
    'mom.rebound': 'Rebounding Issue',
    'mom.reboundDesc': 'Opponent with 4 consecutive offensive rebounds.',
    'mom.ago': 'Ago',
    'mom.sec': 's',
    'mom.min': 'm',
    // Comparison
    'comp.title': 'Comparison',
    'comp.visual': 'Visual Comparison',
    'comp.breakdown': 'Metric Breakdown',
    'comp.metric': 'Metric',
    'comp.selectPlayer': 'Select Player',
    // Reports
    'rep.title': 'Reports & Analysis',
    'rep.subtitle': 'Generate detailed data-driven insights.',
    'rep.btn_match': 'Post-Game Analysis',
    'rep.btn_scout': 'Scouting Report',
    'rep.btn_tactical': 'Tactical Audit',
    'rep.btn_lineups': 'Lineup Analysis',
    'rep.generating': 'Writing report...',
    'rep.empty': 'Select a report type to begin.',
    // AI
    'ai.title': 'AI Assistant',
    'ai.subtitle': 'Ask about strategy, rotations, or playcalling.',
    'ai.analyzing': 'Analyzing game data...',
    'ai.placeholder': 'Ask the coach...',
    'ai.examples': 'Examples: "How do we stop the P&R?", "Should I call a timeout?", "Analysis of last 5 min"',
    'ai.send': 'Send',
    'ai.empty': 'Unable to generate insight.',
    'ai.error': 'Error connecting to assistant.',
    // Input Stats
    'input.title': 'Data Input',
    'input.boxscore': 'Box Score',
    'input.pbp': 'Play by Play',
    'input.pdf': 'Import PDF',
    'input.home': 'Home',
    'input.away': 'Away',
    'input.save': 'Save Stats',
    'input.addEvent': 'Add Event',
    'input.time': 'Time',
    'input.q': 'Q',
    'input.desc': 'Description',
    'input.type': 'Type',
    'input.score': 'Score',
    'input.miss': 'Miss',
    'input.foul': 'Foul',
    'input.tov': 'Turnover',
    'input.sub': 'Sub',
    'input.player': 'Player',
    'input.uploadBox': 'Upload Box Score',
    'input.uploadPbp': 'Upload Play-by-Play',
    'input.dragDrop': 'Drag PDF here or click to upload',
    'input.fileUploaded': 'File uploaded',
    'input.remove': 'Remove',
    'input.pdfNote': 'These files will be analyzed by AI to generate detailed reports.',
    'input.analyze': 'Analyze PDF',
    'input.analyzing': 'Processing...',
    'input.successBox': 'Box score extracted successfully!',
    'input.successPbp': 'Play-by-Play events imported successfully!',
    'input.errorPdf': 'Error processing PDF. Ensure it is legible.',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('es');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};