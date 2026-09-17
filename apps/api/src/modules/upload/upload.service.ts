import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadService {
  private readonly uploadDir = join(process.cwd(), 'uploads');

  ensureDir() {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  saveFile(file: Express.Multer.File) {
    this.ensureDir();
    const ext = extname(file.originalname) || '.jpg';
    const filename = `${Date.now()}_${randomBytes(4).toString('hex')}${ext}`;
    writeFileSync(join(this.uploadDir, filename), file.buffer);
    return {
      url: `/api/uploads/${filename}`,
      filename,
    };
  }
}
