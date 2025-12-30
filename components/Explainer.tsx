import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getMetricExplanation } from '../services/geminiService';

// --- DEFINITIONS DATABASE (Static Fallback) ---
const DEFINITIONS: Record<string, Record<'es'|'en', string>> = {
  'Net Rating': {
    es: 'La diferencia entre puntos anotados y recibidos por cada 100 posesiones. Indica la dominancia real de un equipo.',
    en: 'The difference between points scored and allowed per 100 possessions. Indicates true team dominance.'
  },
  'Off Rating': {
    es: 'Puntos anotados por cada 100 posesiones. Mide la eficiencia ofensiva pura, independiente del ritmo de juego.',
    en: 'Points scored per 100 possessions. Measures pure offensive efficiency, independent of pace.'
  },
  'Def Rating': {
    es: 'Puntos permitidos por cada 100 posesiones. Cuanto menor sea, mejor es la defensa.',
    en: 'Points allowed per 100 possessions. Lower is better.'
  },
  'eFG%': {
    es: 'Porcentaje de Tiro Efectivo. Ajusta el FG% dando más valor a los triples (1.5x) que a los dobles.',
    en: 'Effective Field Goal Percentage. Adjusts FG% to account for 3-pointers being worth 1.5x more.'
  },
  'TOV%': {
    es: 'Porcentaje de posesiones que terminan en pérdida. Un valor bajo (<13%) indica buen cuidado del balón.',
    en: 'Percentage of possessions ending in a turnover. Lower (<13%) is better.'
  },
  'ORB%': {
    es: 'Porcentaje de rebotes ofensivos disponibles que el equipo captura. Mide la agresividad en el tablero contrario.',
    en: 'Percentage of available offensive rebounds grabbed. Measures aggression on the glass.'
  },
  'FTR': {
    es: 'Free Throw Rate. Ratio de intentos de tiro libre vs tiros de campo. Indica la capacidad de sacar faltas.',
    en: 'Free Throw Rate. Ratio of FT attempts to FG attempts. Indicates ability to draw fouls.'
  },
  'Game Flow': {
    es: 'Gráfico de la diferencia de puntos a lo largo del tiempo. Muestra rachas, cambios de liderato y control del partido.',
    en: 'Chart of point differential over time. Visualizes runs, lead changes, and game control.'
  },
  'Shot Chart': {
    es: 'Mapa de calor que muestra la frecuencia y eficiencia de tiro por zonas de la cancha.',
    en: 'Heatmap showing shooting frequency and efficiency across different court zones.'
  },
  'Comparison': {
    es: 'Gráfico de radar comparando métricas clave entre dos jugadores normalizadas a escala 0-100.',
    en: 'Radar chart comparing key metrics between two players normalized to a 0-100 scale.'
  }
};

interface ExplainerContextType {
  openExplainer: (title: string, contextData?: string) => void;
  closeExplainer: () => void;
}

const ExplainerContext = createContext<ExplainerContextType | undefined>(undefined);

export const ExplainerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<{ title: string; contextData?: string }>({ title: '' });
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  
  const { language, t } = useLanguage();

  const openExplainer = (title: string, contextData?: string) => {
    setContent({ title, contextData });
    setIsOpen(true);
    setAiInsight(null);
  };

  const closeExplainer = () => {
    setIsOpen(false);
    setAiInsight(null);
  };

  // Auto-fetch AI insight when opened if context exists
  useEffect(() => {
    if (isOpen && content.contextData) {
      setLoadingAi(true);
      getMetricExplanation(content.title, content.contextData, language)
        .then(res => {
          setAiInsight(res);
          setLoadingAi(false);
        })
        .catch(() => setLoadingAi(false));
    }
  }, [isOpen, content, language]);

  // Static definition fallback
  const definition = DEFINITIONS[content.title] 
    ? DEFINITIONS[content.title][language] 
    : (language === 'es' ? 'Concepto estadístico avanzado.' : 'Advanced statistical concept.');

  return (
    <ExplainerContext.Provider value={{ openExplainer, closeExplainer }}>
      {children}
      
      {/* MODAL UI */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeExplainer}></div>
          <div className="relative bg-surface-dark border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-800 to-surface-dark p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">info</span>
                {content.title}
              </h3>
              <button onClick={closeExplainer} className="text-gray-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-6">
              
              {/* Static Definition */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                  {language === 'es' ? 'Definición' : 'Definition'}
                </p>
                <p className="text-sm text-gray-200 leading-relaxed">
                  {definition}
                </p>
              </div>

              {/* AI Insight Section */}
              {content.contextData && (
                 <div className="bg-primary/10 rounded-xl p-4 border border-primary/20 relative">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-sm text-primary">spark</span>
                      <p className="text-xs font-bold text-primary uppercase">
                        {language === 'es' ? 'Análisis AI' : 'AI Analysis'}
                      </p>
                    </div>
                    
                    {loadingAi ? (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="size-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="size-2 bg-primary rounded-full animate-bounce delay-75"></div>
                        <div className="size-2 bg-primary rounded-full animate-bounce delay-150"></div>
                        {language === 'es' ? 'Analizando datos...' : 'Analyzing data...'}
                      </div>
                    ) : (
                      <p className="text-sm text-white leading-relaxed italic">
                        "{aiInsight}"
                      </p>
                    )}
                 </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-900/50 p-3 text-center border-t border-gray-800">
              <p className="text-[10px] text-gray-500">
                Powered by Gemini • BasketIQ Pro
              </p>
            </div>
          </div>
        </div>
      )}
    </ExplainerContext.Provider>
  );
};

export const useExplainer = () => {
  const context = useContext(ExplainerContext);
  if (!context) throw new Error('useExplainer must be used within ExplainerProvider');
  return context;
};

// --- REUSABLE BUTTON COMPONENT ---
export const InfoButton: React.FC<{ title: string; contextData?: string; className?: string }> = ({ title, contextData, className }) => {
  const { openExplainer } = useExplainer();
  
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        openExplainer(title, contextData);
      }}
      className={`size-6 rounded-full bg-gray-700/50 hover:bg-primary hover:text-white flex items-center justify-center transition-colors text-gray-400 group ${className}`}
      aria-label={`Info about ${title}`}
    >
      <span className="material-symbols-outlined text-[14px]">question_mark</span>
    </button>
  );
};