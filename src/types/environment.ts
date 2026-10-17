export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  isSecret: boolean;
  description?: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  isDefault?: boolean;
}
