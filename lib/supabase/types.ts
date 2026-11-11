export interface Conversation {
  id: string;
  user_session_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  url: string;
  title: string;
  content: string;
  published_date: string | null;
  search_timestamp: string;
  entity_tag: string | null;
}

export interface ChangeItem {
  entity: string;
  description: string;
  source_url?: string;
}

export interface ChangeDiff {
  changed: ChangeItem[];
  new_items: ChangeItem[];
  removed: ChangeItem[];
  unchanged: ChangeItem[];
}

export type QueryType = 'new_query' | 'recall_query' | 'staleness_check' | 'multi_entity';

export type LLMProvider = 'anthropic' | 'openai';

export interface Message {
  id: string;
  conversation_id: string;
  user_session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  query_type: QueryType | null;
  entities: string[] | null;
  search_queries: string[] | null;
  search_results: SearchResult[] | null;
  embedding: number[] | null;
  change_diff: ChangeDiff | null;
}

export interface PinnedContext {
  id: string;
  user_session_id: string;
  context: string;
  created_at: string;
  updated_at: string;
}

export interface StreamEvent {
  type: 'status' | 'delta' | 'sources' | 'diff' | 'done' | 'error';
  content?: string;
  sources?: SearchResult[];
  diff?: ChangeDiff;
  conversationId?: string;
}

export interface ChatRequest {
  message: string;
  conversationId: string | null;
  sessionId: string;
  provider: LLMProvider;
  model: string;
}
