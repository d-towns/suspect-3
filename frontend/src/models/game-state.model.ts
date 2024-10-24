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
}

export interface GameState {
    status: 'setup' | 'interrogation' | 'finished';
    crime?: {
      type: string;
      location: string;
      time: string;
      description: string;
    };
    rounds:Round[];
    players: {
      id: string;
      identity: string;
      evidence: string[];
      guiltScore: number;
      interrogated: boolean;
    }[];
    allEvidence: string[];
    interrogationProgress?: number;
    outcome?: {
      teamWon: boolean;
      averageGuiltScore: number;
    };
  }