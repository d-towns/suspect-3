export interface ConversationExhange {
  speaker: string,
  message: string
}
export interface Round {
  player: string,
  type: 'evidence' | 'kill',
  conversation: ConversationExhange[],
  results: {
    platyerFlipped?: string,
    guiltScoreUpdate?: number
    votedRat: string
  };
  status: 'inactive' | 'active' | 'completed';
}

export interface Player {
  id: string;
  identity: string;
  evidence: string[];
  guiltScore: number;
  interrogated: boolean;
}

export interface Crime {
  type: string;
  location: string;
  time: string;
  description: string;
}

export interface GameState {
    status: 'setup' | 'interrogation' | 'finished';
    crime?: Crime;
    rounds:Round[];
    players: Player[];
    allEvidence: string[];
    interrogationProgress?: number;
    outcome?: {
      teamWon: boolean;
      averageGuiltScore: number;
    };
  }