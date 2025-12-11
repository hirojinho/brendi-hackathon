export type ProviderType = 'openai' | 'openrouter' | 'ollama';

export interface Settings {
  openaiApiKey?: string;
  openrouterApiKey?: string;
  ollamaBaseUrl?: string;
  provider?: ProviderType;
  modelName?: string;
  globalShortcut?: string;
  defaultMode?: 'chat' | 'note-taking';
  maxQuickNotes?: number;
  reviewAgeThresholdHours?: number;
}

export interface SettingsState {
  openaiKey: string;
  openrouterKey: string;
  ollamaUrl: string;
  provider: ProviderType;
  modelName: string;
  maxQuickNotes: number;
  reviewAgeThresholdHours: number;
  isLoading: boolean;
  saveStatus: string;
}

