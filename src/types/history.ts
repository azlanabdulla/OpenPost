import { HttpRequest, HttpResponse } from './http';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  request: HttpRequest;
  response?: Partial<HttpResponse>;
  error?: string;
}
