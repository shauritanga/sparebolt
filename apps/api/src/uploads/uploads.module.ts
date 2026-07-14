import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

const IMAGE_MIME = /^(image\/(jpeg|jpg|png|webp|gif|heic|heif))$/i;

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname || '').toLowerCase() || '.jpg';
          const allowed = [
            '.jpg',
            '.jpeg',
            '.png',
            '.webp',
            '.gif',
            '.heic',
            '.heif',
          ];
          cb(null, `${randomUUID()}${allowed.includes(ext) ? ext : '.jpg'}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!IMAGE_MIME.test(file.mimetype)) {
          cb(
            new BadRequestException(
              'Only image files are allowed (jpeg, png, webp, gif)',
            ) as unknown as Error,
            false,
          );
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
