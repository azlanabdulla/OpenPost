import { HttpRequest } from './http';

export interface CollectionItemRequest {
  id: string;
  type: 'request';
  name: string;
  request: HttpRequest;
}

export interface CollectionFolder {
  id: string;
  type: 'folder';
  name: string;
  description?: string;
  items: Array<CollectionItemRequest | CollectionFolder>;
}

export interface OpenPostCollection {
  $schema?: string;
  openpostVersion: string;
  id: string;
  name: string;
  description?: string;
  variables?: Array<{ key: string; value: string; enabled: boolean }>;
  items: Array<CollectionItemRequest | CollectionFolder>;
}
