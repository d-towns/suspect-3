export interface GameState {
    status: 'setup' | 'interrogation' | 'finished';
    crime?: {
      type: string;
      location: string;
      time: string;
      description: string;
    };
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