import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export type StoredObject = {
  /** Object key inside the bucket, e.g. tenants/{id}/logo.png */
  key: string;
  /** Public HTTPS URL (with optional cache-bust query) */
  url: string;
};

/**
 * Cloudflare R2 (S3-compatible) object storage.
 * When R2_* env is incomplete, callers should fall back to local disk.
 */
@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorageService.name);
  private client: S3Client | null = null;
  private bucket = '';
  private publicBase = '';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (this.isConfigured()) {
      this.logger.log(
        `Object storage: R2 bucket=${this.bucket} public=${this.publicBase}`,
      );
    } else {
      this.logger.warn(
        'Object storage: local disk (set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL for Cloudflare R2)',
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
    const publicBase = this.env('R2_PUBLIC_BASE_URL')?.replace(/\/$/, '');
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
      return;
    }
    this.bucket = bucket;
    this.publicBase = publicBase;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
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
    const url = `${this.publicBase}/${opts.key.replace(/^\//, '')}?v=${Date.now()}`;
    return { key: opts.key, url };
  }
}
