import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadsService implements OnModuleInit {
  readonly uploadDir: string;

  constructor(private config: ConfigService) {
    this.uploadDir = join(process.cwd(), 'uploads');
  }

  onModuleInit() {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /** Public path served by static middleware, e.g. /uploads/abc.jpg */
  toPublicUrl(filename: string) {
    return `/uploads/${filename}`;
  }

  /** Absolute URL for clients that need a full host (optional) */
  toAbsoluteUrl(filename: string, reqHost?: string) {
    const publicPath = this.toPublicUrl(filename);
    const base =
      this.config.get<string>('PUBLIC_BASE_URL') ||
      (reqHost ? `http://${reqHost}` : '');
    return base ? `${base.replace(/\/$/, '')}${publicPath}` : publicPath;
  }
}
