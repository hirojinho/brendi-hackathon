export type ProviderType = 'openai' | 'openrouter' | 'ollama';

export interface Settings {
  openaiApiKey?: string;
  openrouterApiKey?: string;
  ollamaBaseUrl?: string;
  provider?: ProviderType;
  modelName?: string;
  globalShortcut?: string;
  defaultMode?: 'chat' | 'note-taking';
}

export interface SettingsState {
  openaiKey: string;
  openrouterKey: string;
  ollamaUrl: string;
  provider: ProviderType;
  modelName: string;
  isLoading: boolean;
  saveStatus: string;
}

