import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  /** Single image — multipart field name: `file` */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  uploadOne(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Use field name "file".');
    }
    return {
      url: this.uploads.toPublicUrl(file.filename),
      absoluteUrl: this.uploads.toAbsoluteUrl(
        file.filename,
        req.get('host') || undefined,
      ),
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  /** Multiple images — multipart field name: `files` (max 10) */
  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadMany(
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Req() req: Request,
  ) {
    if (!files?.length) {
      throw new BadRequestException(
        'No files uploaded. Use field name "files".',
      );
    }
    return {
      files: files.map((file) => ({
        url: this.uploads.toPublicUrl(file.filename),
        absoluteUrl: this.uploads.toAbsoluteUrl(
          file.filename,
          req.get('host') || undefined,
        ),
        filename: file.filename,
        size: file.size,
        mimeType: file.mimetype,
      })),
    };
  }
}
