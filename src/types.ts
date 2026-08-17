export interface CommitterOptions {
  model?: string;
  thinking?: string;
}

export interface OtaEntryInput {
  turnNumber: number;
  timestamp: string;
  model: string;
  thought: string;
  thinking: string;
  actions: string[];
  observations: string[];
}

export interface SubagentResult {
  text: string;
  exitCode: number;
  error?: string;
}
