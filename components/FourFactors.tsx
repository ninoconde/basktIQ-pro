import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useGame } from '../context/GameContext';
import { InfoButton } from './Explainer';

const FactorCard: React.FC<{
  title: string;
  metric: string;
  value: string;
  target: string;
  description: string;
  color: 'primary' | 'secondary' | 'success' | 'warning';
  percent?: number;
  infoTitle: string;
  infoContext: string;
}> = ({ title, metric, value, target, description, color, percent, infoTitle, infoContext }) => {
  const { t } = useLanguage();
  return (
    <div className="w-full rounded-xl bg-surface-dark p-6 shadow-sm border border-gray-800 relative overflow-hidden hover:border-gray-600 transition-all h-full group">
       <div className={`absolute top-0 right-0 p-5 opacity-5 pointer-events-none text-${color}`}>
          <span className="material-symbols-outlined text-8xl">analytics</span>
      </div>
      <div className="absolute top-4 right-4 z-20">
         <InfoButton title={infoTitle} contextData={infoContext} />
      </div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</h3>
          <p className="text-2xl font-bold text-white mt-1">{metric}</p>
        </div>
      </div>
  
      <div className="flex items-center gap-6">
        <div className="relative size-24 shrink-0">
          <svg className="size-full -rotate-90" viewBox="0 0 36 36">
            <path className="text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
            <path className={`text-${color}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${Math.min(percent || 0, 100)}, 100`} strokeLinecap="round" strokeWidth="3"></path>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
             <span className={`text-xs font-bold text-${color}`}>{value}</span>
          </div>
        </div>
  
        <div className="flex flex-col flex-1 gap-2">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-medium">{t('factors.target')}</span>
            <span className="text-lg font-bold text-white">{target}</span>
          </div>
          <p className="text-sm text-gray-400 leading-snug">{description}</p>
        </div>
      </div>
    </div>
  );
};

export const FourFactors: React.FC = () => {
  const { t } = useLanguage();
  const { homeStats, awayStats, derivedMetrics } = useGame();
  const { homeFactors } = derivedMetrics;

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 md:p-8 md:pb-8 animate-fade-in">
      <div className="flex flex-col gap-2 px-1">
        <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">{t('factors.summary')}</span>
        <div className="flex flex-wrap gap-4 items-end">
          <h1 className="text-4xl font-bold tracking-tight text-white">{homeStats.name} vs. {awayStats.name}</h1>
          <span className="text-primary font-bold bg-primary/10 px-3 py-1.5 rounded-lg text-sm mb-1.5">Current Stats</span>
        </div>
      </div>

      {/* Grid Layout for Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <FactorCard 
          title={t('factors.shooting')}
          metric="Effective FG%"
          value={`${(homeFactors.efg * 100).toFixed(1)}%`}
          target=">52%"
          description="Measures shooting efficiency adjusting for 3-pointers."
          color="primary"
          percent={homeFactors.efg * 100}
          infoTitle="eFG%"
          infoContext={`Current eFG%: ${(homeFactors.efg * 100).toFixed(1)}%. Target > 52%.`}
        />
        
        <FactorCard 
          title={t('factors.tov')}
          metric="Turnover %"
          value={`${(homeFactors.tov * 100).toFixed(1)}%`}
          target="<13.5%"
          description="Percentage of possessions ending in a turnover."
          color="success"
          percent={homeFactors.tov * 100}
          infoTitle="TOV%"
          infoContext={`Current TOV%: ${(homeFactors.tov * 100).toFixed(1)}%. Target < 13.5%.`}
        />

         <FactorCard 
          title={t('factors.orb')}
          metric="ORB %"
          value={`${(homeFactors.orb * 100).toFixed(1)}%`}
          target=">30%"
          description="Percentage of available offensive rebounds grabbed."
          color="secondary"
          percent={homeFactors.orb * 100}
          infoTitle="ORB%"
          infoContext={`Current ORB%: ${(homeFactors.orb * 100).toFixed(1)}%. Target > 30%.`}
        />
        
         <FactorCard 
          title={t('factors.ft')}
          metric="Free Throw Rate"
          value={homeFactors.ftr.toFixed(3)}
          target=">0.250"
          description="Ratio of foul shots to field goal attempts."
          color="primary"
          percent={homeFactors.ftr * 100}
          infoTitle="FTR"
          infoContext={`Current FT Rate: ${homeFactors.ftr.toFixed(3)}. Target > 0.250.`}
        />
      </div>
    </div>
  );
};