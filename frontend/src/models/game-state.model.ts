export interface ConversationExhange {
  speaker: string,
  message: string
}

export interface ConversationItem {
  audioTranscript: string
  timestamp: number
  speaker: 'user' | 'assistant'
}

export interface VotingRoundVote {
  playerId: string,
  voterId: string,
}

export interface Round {
  player: string,
  suspect?: string,
  type: 'interrogation' | 'voting',
  conversation: ConversationExhange[],
  results: {
    guiltScoreUpdate?: number
    votingResults?: VotingRoundVote[]
    deduction?: string
  };
  status: 'inactive' | 'active' | 'completed';
}

export interface Player {
  id: string;
  identity: string;
  evidence: string[];
  guiltScore: number;
  interrogated: boolean;
  isCulprit: boolean;
}

export interface OffenseReportItem {
  location: string;
  time: string;
  description: string;
  imgSrc: string;
}

export interface Crime {
  type: string;
  location: string;
  time: string;
  offenseReport: OffenseReportItem[];
}

export interface Evidence {
  id: string;
  description: string;
}

export interface GameState {
    status: 'setup' | 'active' | 'finished';
    crime?: Crime;
    rounds: Round[];
    allEvidence: Evidence[];
    interrogationProgress?: number;
    outcome?: {
      winner: "innocents" | "culprit" | "not_yet_determined";
      averageGuiltScore?: number;
    };
  }

  export interface Suspect {
    id: string;
    name: string;
    identity: string;
    temperment: string;
    interrogated: boolean;
    isCulprit: boolean;
  }

  export interface Lead {
    suspect: string;
    evidence: string;
  }

  export interface DeductionAnalysis {
    analysis: string;
    accepted: boolean;
  }

  export interface Deduction {
    submitted: boolean;
    active: boolean;
    leads: Lead[];
    culpritVote: string;
    analysis: DeductionAnalysis
  }

  export interface SingleGameState extends GameState {
    player: string;
    suspects: Suspect[];
    deductions: Deduction[];
    culpritVote: string;
  }

  export interface MultiGameState extends GameState {
    players: Player[];
  }