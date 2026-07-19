import { Injectable } from '@nestjs/common';
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import config from '../../../common/config/app.config';

export interface UploadedFile {
  url: string;
  fileKey: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class S3FileStorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor() {
    this.region = config.aws_region;
    this.bucket = config.aws_s3_bucket;
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.aws_access_key_id,
        secretAccessKey: config.aws_secret_access_key,
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadedFile> {
    const fileKey = `${folder}/${uuid()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucket,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      },
    });

    await upload.done();

    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileKey}`;

    return {
      url,
      fileKey,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async uploadBookFiles(
    files: { [fieldname: string]: Express.Multer.File[] },
    userId: string,
  ): Promise<{
    bookCover?: UploadedFile;
    audiobook?: UploadedFile;
    ebook?: UploadedFile;
    hardcover?: UploadedFile;
    paperback?: UploadedFile;
    interiorPdf?: UploadedFile;
    coverPdf?: UploadedFile;
  }> {
    const folder = `books/${userId}`;
    const result: {
      bookCover?: UploadedFile;
      audiobook?: UploadedFile;
      ebook?: UploadedFile;
      hardcover?: UploadedFile;
      paperback?: UploadedFile;
      interiorPdf?: UploadedFile;
      coverPdf?: UploadedFile;
    } = {};

    for (const [fieldname, fileArray] of Object.entries(files)) {
      if (fileArray && fileArray.length > 0) {
        const file = fileArray[0];
        result[fieldname as keyof typeof result] = await this.uploadFile(
          file,
          `${folder}/${fieldname}`,
        );
      }
    }

    return result;
  }

  async deleteFile(fileKey: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      }),
    );
  }

  async createDownloadUrl(
    fileKey: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      }),
      { expiresIn: expiresInSeconds },
    );
  }
}
