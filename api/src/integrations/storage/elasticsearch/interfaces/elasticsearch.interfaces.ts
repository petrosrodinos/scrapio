export interface IndexMappings {
    properties: Record<string, unknown>;
}

export type SearchFilter =
    | { term: { field: string; value: string | number | boolean } }
    | { terms: { field: string; values: (string | number)[] } }
    | { range: { field: string; gte?: number; lte?: number; gt?: number; lt?: number } };

export interface SearchQuery {
    q?: string;
    page?: number;
    limit?: number;
    filters?: SearchFilter[];
    user_id?: string;
}

export interface SearchResult<T = Record<string, unknown>> {
    hits: (T & { _id: string; _score?: number })[];
    total: number;
}

export interface IndexDocumentOptions {
    embeddingSource?: string;
    embeddingField?: string;
    user_id?: string;
}
