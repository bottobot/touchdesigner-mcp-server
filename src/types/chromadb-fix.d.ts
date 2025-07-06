// Type fixes for ChromaDB compatibility
import { IEmbeddingFunction } from 'chromadb';

declare module 'chromadb' {
  interface ChromaClient {
    getCollection(params: { name: string; embeddingFunction?: IEmbeddingFunction }): Promise<Collection>;
  }
}