import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private ready = false;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length) {
      this.ready = true;
      return;
    }

    try {
      const jsonInline = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
      const pathEnv =
        this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH') ||
        this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS');

      // Default paths relative to monorepo / api cwd
      const candidates = [
        pathEnv,
        resolve(process.cwd(), 'firebase-service-account.json'),
        resolve(process.cwd(), '../../firebase-service-account.json'),
        resolve(process.cwd(), '../firebase-service-account.json'),
        '/var/www/sparebolt/firebase-service-account.json',
        '/root/firebase-service-account.json',
      ].filter(Boolean) as string[];

      let credential: admin.ServiceAccount | undefined;

      if (jsonInline) {
        credential = JSON.parse(jsonInline) as admin.ServiceAccount;
      } else {
        for (const p of candidates) {
          if (p && existsSync(p)) {
            credential = JSON.parse(
              readFileSync(p, 'utf8'),
            ) as admin.ServiceAccount;
            this.logger.log(`Firebase Admin credentials loaded from ${p}`);
            break;
          }
        }
      }

      if (!credential) {
        this.logger.warn(
          'Firebase Admin not configured — push notifications disabled. Set FIREBASE_SERVICE_ACCOUNT_PATH or place firebase-service-account.json.',
        );
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert(credential),
        projectId:
          (credential as { project_id?: string }).project_id ||
          this.config.get<string>('FIREBASE_PROJECT_ID'),
      });
      this.ready = true;
      this.logger.log('Firebase Admin initialized for FCM push');
    } catch (err) {
      this.logger.error(
        `Firebase Admin init failed: ${err instanceof Error ? err.message : err}`,
      );
      this.ready = false;
    }
  }

  isReady() {
    return this.ready;
  }

  async sendToTokens(
    tokens: string[],
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<{ success: number; failed: string[] }> {
    if (!this.ready || !tokens.length) {
      return { success: 0, failed: [] };
    }

    const data: Record<string, string> = {};
    if (payload.data) {
      for (const [k, v] of Object.entries(payload.data)) {
        data[k] = String(v ?? '');
      }
    }

    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data,
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
        },
        fcmOptions: {
          link: data.orderId ? `/orders/${data.orderId}` : '/notifications',
        },
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'sparebolt_default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    });

    const failed: string[] = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        failed.push(tokens[i]);
        const code = r.error?.code || '';
        if (
          code.includes('registration-token-not-registered') ||
          code.includes('invalid-registration-token')
        ) {
          // caller will prune
        } else {
          this.logger.warn(
            `FCM send failed for token …${tokens[i].slice(-8)}: ${r.error?.message}`,
          );
        }
      }
    });

    return { success: res.successCount, failed };
  }
}
