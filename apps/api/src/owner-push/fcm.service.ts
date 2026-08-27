import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';

type ServiceAccountJson = {
  project_id: string;
  client_email: string;
  private_key: string;
};

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private auth: GoogleAuth | null = null;
  private projectId: string | null = null;

  constructor(private readonly config: ConfigService) {
    const sa = this.loadServiceAccount();
    if (!sa) {
      this.logger.warn(
        'FCM yapılandırılmadı — FCM_SERVICE_ACCOUNT_JSON veya FCM_SERVICE_ACCOUNT_PATH',
      );
      return;
    }
    this.projectId = sa.project_id;
    this.auth = new GoogleAuth({
      credentials: {
        client_email: sa.client_email,
        private_key: sa.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
  }

  isConfigured(): boolean {
    return this.auth !== null && this.projectId !== null;
  }

  private loadServiceAccount(): ServiceAccountJson | null {
    const rawJson = this.config.get<string>('FCM_SERVICE_ACCOUNT_JSON')?.trim();
    if (rawJson) {
      try {
        return JSON.parse(rawJson) as ServiceAccountJson;
      } catch {
        this.logger.error('FCM_SERVICE_ACCOUNT_JSON geçersiz JSON');
        return null;
      }
    }
    const path = this.config.get<string>('FCM_SERVICE_ACCOUNT_PATH')?.trim();
    if (!path) return null;
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as ServiceAccountJson;
    } catch {
      this.logger.error(`FCM service account okunamadı: ${path}`);
      return null;
    }
  }

  async sendToTokens(
    tokens: string[],
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<{ sent: number; invalidTokens: string[] }> {
    if (!this.isConfigured() || tokens.length === 0) {
      return { sent: 0, invalidTokens: [] };
    }

    const client = await this.auth!.getClient();
    const accessToken = await client.getAccessToken();
    const bearer = accessToken.token;
    if (!bearer) {
      this.logger.warn('FCM access token alınamadı');
      return { sent: 0, invalidTokens: [] };
    }

    const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;
    let sent = 0;
    const invalidTokens: string[] = [];

    for (const token of tokens) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${bearer}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token,
              notification: {
                title: payload.title,
                body: payload.body,
              },
              data: payload.data ?? {},
              android: {
                priority: 'HIGH',
                notification: { channelId: 'owner_ops' },
              },
              apns: {
                payload: {
                  aps: {
                    sound: 'default',
                    badge: 1,
                  },
                },
              },
            },
          }),
        });

        if (res.ok) {
          sent += 1;
          continue;
        }

        const errText = await res.text();
        if (
          errText.includes('UNREGISTERED') ||
          errText.includes('INVALID_ARGUMENT') ||
          errText.includes('NOT_FOUND')
        ) {
          invalidTokens.push(token);
        } else {
          this.logger.warn(`FCM gönderim hatası (${res.status}): ${errText}`);
        }
      } catch (err) {
        this.logger.warn(`FCM istek hatası: ${(err as Error).message}`);
      }
    }

    return { sent, invalidTokens };
  }
}
