type BackupWorkerEnvironment = {
  BACKUPS: {
    get(key: string, type: "json"): Promise<unknown>;
    put(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
  BACKUP_RATE_LIMITER?: {
    limit(input: { key: string }): Promise<{ success: boolean }>;
  };
  STAGING_ORIGIN?: string;
};

declare const worker: {
  fetch(request: Request, env: BackupWorkerEnvironment): Promise<Response>;
};

export default worker;
