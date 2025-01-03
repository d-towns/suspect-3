
export interface ConversationExhange {
  speaker: string,
  message: string
}

export interface Conversation {
  suspect: string,
  active: boolean,
  responses: ConversationExhange[]
}

export interface ConversationItem {
  audioTranscript: string
  timestamp: number
  speaker: 'user' | 'assistant'
  responseId: string
}

export interface VotingRoundVote {
  playerId: string,
  voterId: string,
}

export interface Round {
  player: string,
  suspect?: string,
  type: 'interrogation' | 'voting',
  conversations: Conversation[],
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
  realStory: OffenseReportItem[];
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
    outcome: 'win' | 'lose' | 'not_yet_determined';
  }

  export interface Suspect {
    id: string;
    name: string;
    identity: string;
    temperment: string;
    interrogated: boolean;
    isCulprit: boolean;
    imgSrc: string;
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
    nodes: DeductionNode[];
    edges: DeductionEdge[];
    warmth: number;
    feedback: string[];
  }

  export interface DeductionNode {
    id: string;
    type: "statement" | "evidence" | "suspect";
    data: any;
  }

  export interface DeductionEdge {
    source_node: DeductionNode;
    target_node: DeductionNode;
    type: EdgeType;
  }

  export type EdgeType = "supports" | "contradicts" | 'implicates'
  export interface SingleGameState extends GameState {
    player: string;
    suspects: Suspect[];
    deduction: Deduction;
    culpritVote: string;
  }

  export interface MultiGameState extends GameState {
    players: Player[];
  }