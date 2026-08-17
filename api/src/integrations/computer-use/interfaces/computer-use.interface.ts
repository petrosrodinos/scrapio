export type GenerationActionType =
  | 'click'
  | 'scroll_down'
  | 'scroll_up'
  | 'type'
  | 'navigate'
  | 'go_back'
  | 'close_tab'
  | 'wait'
  | 'inspect_dom'
  | 'probe_selectors'
  | 'done';

export type InspectDomScope = 'listing' | 'card' | 'detail' | 'pagination';

export interface GenerationAction {
  reasoning?: string;
  action: GenerationActionType;
  selector?: string;
  text?: string;
  url?: string;
  config?: Record<string, unknown>;
  scope?: InspectDomScope;
  card_index?: number;
  sample_cards?: number;
}

export interface ComputerUseStepResult {
  rawText: string;
  usage?: { input_tokens: number; output_tokens: number };
}
