export type QueryType = "new_query" | "recall_query" | "staleness_check" | "multi_entity";

export interface ClassifierResult {
  query_type: QueryType;
  entities: string[];
  time_reference: string | null;
  original_topic: string | null;
}
