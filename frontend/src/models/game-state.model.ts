export interface ConversationExhange {
  speaker: string,
  message: string
}

export interface ConversationItem {
  audioBuffer: ArrayBuffer | null,
  audioTranscript: string
}

export interface VotingRoundVote {
  playerId: string,
  voterId: string,
}

export interface Round {
  player: string,
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

export interface Crime {
  type: string;
  location: string;
  time: string;
  description: string;
}

export interface GameState {
    status: 'setup' | 'interrogation' | 'finished';
    crime?: Crime;
    rounds: Round[];
    players: Player[];
    allEvidence: string[];
    interrogationProgress?: number;
    outcome?: {
      winner: "innocents" | "culprit" | "not_yet_determined";
      averageGuiltScore: number;
    };
  }