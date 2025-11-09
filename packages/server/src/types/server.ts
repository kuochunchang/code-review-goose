export interface ServerConfig {
  projectPath: string;
  port: number;
}

export interface ServerInstance {
  port: number;
  projectPath: string;
  close: () => Promise<void>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
