export enum View {
  DASHBOARD = 'DASHBOARD',
  FOUR_FACTORS = 'FOUR_FACTORS',
  SCOUTING = 'SCOUTING',
  MOMENTUM = 'MOMENTUM',
  COMPARISON = 'COMPARISON',
  AI_COACH = 'AI_COACH',
  REPORTS = 'REPORTS',
  INPUT_STATS = 'INPUT_STATS'
}

export interface Player {
  id: string;
  name: string;
  position: string;
  avatar: string;
  stats: {
    ppg: number;
    rpg: number;
    apg: number;
    eff: number;
  };
}

export interface TeamStats {
  name: string;
  pts: number;
  fg: number;
  fga: number;
  tp: number;
  tpa: number;
  ft: number;
  fta: number;
  orb: number;
  drb: number;
  ast: number;
  tov: number;
}

export interface PlayEvent {
  id: string;
  time: string; // MM:SS
  quarter: string;
  team: 'home' | 'away';
  type: 'score' | 'miss' | 'foul' | 'tov' | 'sub';
  description: string;
  player?: string;
  scoreDiff?: number; // Calculated field for flow
}

export interface GameContextType {
  homeStats: TeamStats;
  awayStats: TeamStats;
  events: PlayEvent[];
  updateHomeStats: (stats: Partial<TeamStats>) => void;
  updateAwayStats: (stats: Partial<TeamStats>) => void;
  addEvent: (event: PlayEvent) => void;
  resetGame: () => void;
  derivedMetrics: {
    homeFactors: FourFactorsData;
    awayFactors: FourFactorsData;
    players: string[];
  };
  pdfFiles: {
    boxscore: string | null; // Base64 string
    pbp: string | null; // Base64 string
  };
  setPdfFile: (type: 'boxscore' | 'pbp', data: string | null) => void;
}

export interface FourFactorsData {
  efg: number;
  tov: number;
  orb: number;
  ftr: number;
}