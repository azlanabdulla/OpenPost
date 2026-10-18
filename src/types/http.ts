export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface KeyValueParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export type BodyType = 'none' | 'json' | 'text' | 'form-urlencoded' | 'multipart';

export interface MultipartField {
  id: string;
  key: string;
  type: 'text' | 'file';
  value: string;
  enabled: boolean;
  description?: string;
}

export interface RequestBody {
  type: BodyType;
  rawJson?: string;
  rawText?: string;
  formUrlencoded?: KeyValueParam[];
  multipart?: MultipartField[];
}

export type AuthType = 'inherit' | 'none' | 'bearer' | 'basic' | 'apikey';

export interface AuthConfig {
  type: AuthType;
  bearer?: {
    token: string;
  };
  basic?: {
    username: string;
    password: string;
  };
  apiKey?: {
    key: string;
    value: string;
    addTo: 'header' | 'query';
  };
}

export interface RequestSettings {
  timeoutMs: number;
  followRedirects: boolean;
  verifySsl: boolean;
}

export interface HttpRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValueParam[];
  headers: KeyValueParam[];
  body: RequestBody;
  auth: AuthConfig;
  settings?: Partial<RequestSettings>;
}

export interface HttpResponseCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
}

export interface HttpResponse {
  requestId: string;
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  cookies: HttpResponseCookie[];
  body: string;
  bodySizeBytes: number;
  durationMs: number;
  isTruncated: boolean;
  contentType?: string;
  isBinary?: boolean;
}

export interface ExecuteRequestPayload {
  requestId: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  bodyType: BodyType;
  formUrlencoded?: Array<{ key: string; value: string }>;
  multipart?: Array<{ key: string; value: string; isFile: boolean }>;
  timeoutMs?: number;
  verifySsl?: boolean;
  followRedirects?: boolean;
}
