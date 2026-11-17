import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import {
  clientIpFromRequest,
  consumeRateLimitAsync,
} from './simple-rate-limit';

/** Shared HTTP rate-limit guard for public and auth endpoints. */
export async function assertHttpRateLimit(
  req: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const ip = clientIpFromRequest({
    ip: req.ip,
    headers: {
      get: (name: string) => {
        const v = req.headers[name];
        return Array.isArray(v) ? v[0] : v;
      },
    },
  });
  const result = await consumeRateLimitAsync(`${bucket}:${ip}`, limit, windowMs);
  if (!result.ok) {
    throw new HttpException(
      { message: 'Too many requests', retryAfterSec: result.retryAfterSec },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
