import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export type StoredObject = {
  key: string;
  url: string;
};

/**
 * Cloudflare R2 (S3-compatible).
 * Objects stay private in the bucket; we serve them via /media/* on the API
 * so admin/invite/Wallet work without R2 public access.
 */
@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorageService.name);
  private client: S3Client | null = null;
  private bucket = '';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (this.isConfigured()) {
      this.logger.log(
        `Object storage: R2 bucket=${this.bucket} (served via /media/*)`,
      );
    } else {
      this.logger.warn(
        'Object storage: local disk (set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)',
      );
    }
  }

  isConfigured(): boolean {
    this.ensureClient();
    return this.client !== null;
  }

  private env(key: string): string | undefined {
    return (
      process.env[key]?.trim() ||
      this.config.get<string>(key)?.trim() ||
      undefined
    );
  }

  private ensureClient() {
    if (this.client) return;
    const accountId = this.env('R2_ACCOUNT_ID');
    const accessKeyId = this.env('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.env('R2_SECRET_ACCESS_KEY');
    const bucket = this.env('R2_BUCKET');
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      return;
    }
    this.bucket = bucket;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /** Public HTTPS base used in DB URLs (API media proxy by default). */
  publicUrlForKey(key: string): string {
    const clean = key.replace(/^\//, '');
    const useCdn =
      this.env('R2_USE_PUBLIC_URL') === 'true' &&
      Boolean(this.env('R2_PUBLIC_BASE_URL'));
    if (useCdn) {
      const base = this.env('R2_PUBLIC_BASE_URL')!.replace(/\/$/, '');
      return `${base}/${clean}?v=${Date.now()}`;
    }
    return `${this.apiPublicBase()}/media/${clean}?v=${Date.now()}`;
  }

  private apiPublicBase(): string {
    const raw =
      this.env('API_URL') ||
      this.env('APPLE_WEB_SERVICE_URL') ||
      (process.env.NODE_ENV !== 'production'
        ? `http://localhost:${this.env('API_PORT') ?? 3001}`
        : '');
    if (!raw) {
      throw new Error('API_URL is required to serve R2 media');
    }
    return raw.replace(/\/$/, '');
  }

  async putObject(opts: {
    key: string;
    body: Buffer;
    contentType: string;
    cacheControl?: string;
  }): Promise<StoredObject> {
    this.ensureClient();
    if (!this.client) {
      throw new Error('R2 is not configured');
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: opts.key,
        Body: opts.body,
        ContentType: opts.contentType,
        CacheControl:
          opts.cacheControl ?? 'public, max-age=31536000, immutable',
      }),
    );
    return { key: opts.key, url: this.publicUrlForKey(opts.key) };
  }

  async getObject(
    key: string,
  ): Promise<{ body: Buffer; contentType: string } | null> {
    this.ensureClient();
    if (!this.client) return null;
    try {
      const res = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key.replace(/^\//, ''),
        }),
      );
      if (!res.Body) return null;
      const body = Buffer.from(await res.Body.transformToByteArray());
      return {
        body,
        contentType: res.ContentType || 'application/octet-stream',
      };
    } catch (err) {
      this.logger.warn(
        `R2 getObject ${key}: ${(err as Error).message}`,
      );
      return null;
    }
  }
}
