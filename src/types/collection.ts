import { HttpRequest, AuthConfig } from './http';

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
  auth?: AuthConfig;
  variables?: Record<string, string>;
  items: Array<CollectionItemRequest | CollectionFolder>;
}

export interface OpenPostCollection {
  $schema?: string;
  openpostVersion: string;
  id: string;
  name: string;
  description?: string;
  auth?: AuthConfig;
  variables?: Array<{ key: string; value: string; enabled: boolean }> | Record<string, string>;
  items: Array<CollectionItemRequest | CollectionFolder>;
}

