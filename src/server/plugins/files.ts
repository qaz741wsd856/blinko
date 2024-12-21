import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client, CopyObjectCommand } from "@aws-sdk/client-s3";
import { getGlobalConfig } from "../routers/config";
import { UPLOAD_FILE_PATH } from "@/lib/constant";
import fs, { unlink,  writeFile } from 'fs/promises';
import path from 'path';
import { cache } from "@/lib/cache";
import { prisma } from "../prisma";
import { Readable } from 'stream';
import { Upload } from "@aws-sdk/lib-storage";
import { PassThrough } from 'stream';
import { createWriteStream } from "fs";

export class FileService {
  public static async getS3Client() {
    const config = await getGlobalConfig({ useAdmin: true });
    return cache.wrap(`${config.s3Endpoint}-${config.s3Region}-${config.s3Bucket}-${config.s3AccessKeyId}-${config.s3AccessKeySecret}`, async () => {
      const s3ClientInstance = new S3Client({
        endpoint: config.s3Endpoint,
        region: config.s3Region,
        credentials: {
          accessKeyId: config.s3AccessKeyId,
          secretAccessKey: config.s3AccessKeySecret,
        },
        forcePathStyle: true,
      });
      return { s3ClientInstance, config };
    }, { ttl: 60 * 60 * 86400 * 1000 })
  }

  private static async writeFileSafe(baseName: string, extension: string, buffer: Buffer, attempt: number = 0) {
    const MAX_ATTEMPTS = 20;
    const config = await getGlobalConfig({ useAdmin: true });

    if (attempt >= MAX_ATTEMPTS) {
      throw new Error('MAX_ATTEMPTS_REACHED');
    }

    let filename = attempt === 0 ?
      `${baseName}${extension}` :
      `${baseName}_${Date.now()}${extension}`;

    let customPath = config.localCustomPath || '';
    if (customPath) {
      customPath = customPath.startsWith('/') ? customPath : '/' + customPath;
      customPath = customPath.endsWith('/') ? customPath : customPath + '/';
    }

    try {
      const filePath = path.join(`${UPLOAD_FILE_PATH}${customPath}` + filename);
      await fs.access(filePath);
      return this.writeFileSafe(baseName, extension, buffer, attempt + 1);
    } catch (error) {
      const filePath = path.join(`${UPLOAD_FILE_PATH}${customPath}` + filename);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      //@ts-ignore
      await writeFile(filePath, buffer);
      return `${customPath}${filename}`.replace(/^\//, '');
    }
  }

  static async uploadFile(buffer: Buffer, originalName: string) {
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const timestamp = Date.now();
    const config = await getGlobalConfig({ useAdmin: true });

    if (config.objectStorage === 's3') {
      const { s3ClientInstance } = await this.getS3Client();

      let customPath = config.s3CustomPath || '';
      if (customPath) {
        customPath = customPath.startsWith('/') ? customPath : '/' + customPath;
        customPath = customPath.endsWith('/') ? customPath : customPath + '/';
      }

      const timestampedFileName = `${baseName}_${timestamp}${extension}`;
      const s3Key = `${customPath}${timestampedFileName}`.replace(/^\//, '');

      const command = new PutObjectCommand({
        Bucket: config.s3Bucket,
        Key: s3Key,
        Body: buffer,
      });

      await s3ClientInstance.send(command);
      const s3Url = `/api/s3file/${s3Key}`;
      return { filePath: s3Url, fileName: timestampedFileName };
    } else {
      const filename = await this.writeFileSafe(baseName, extension, buffer);
      return { filePath: `/api/file/${filename}`, fileName: filename };
    }
  }

  static async deleteFile(api_attachment_path: string) {
    const config = await getGlobalConfig({ useAdmin: true });
    if (api_attachment_path.includes('/api/s3file/')) {
      const { s3ClientInstance } = await this.getS3Client();
      const fileName = api_attachment_path.replace('/api/s3file/', "");
      const command = new DeleteObjectCommand({
        Bucket: config.s3Bucket,
        Key: fileName,
      });
      await s3ClientInstance.send(command);
      const attachmentPath = await prisma.attachments.findFirst({ where: { path: api_attachment_path } })
      if (attachmentPath) {
        await prisma.attachments.delete({ where: { id: attachmentPath.id } })
      }
    } else {
      const filepath = path.join(UPLOAD_FILE_PATH, api_attachment_path.replace('/api/file/', ""));
      const attachmentPath = await prisma.attachments.findFirst({ where: { path: api_attachment_path } })
      if (attachmentPath) {
        await prisma.attachments.delete({ where: { id: attachmentPath.id } })
      }
      await unlink(filepath);
    }
  }

  static async getFile(filePath: string) {
    const config = await getGlobalConfig({ useAdmin: true });
    const fileName = filePath.replace('/api/file/', '').replace('/api/s3file/', '');
    const tempPath = path.join(UPLOAD_FILE_PATH, path.basename(fileName));

    if (config.objectStorage === 's3') {
      const { s3ClientInstance } = await this.getS3Client();
      const command = new GetObjectCommand({
        Bucket: config.s3Bucket,
        Key: fileName,
      });

      const response = await s3ClientInstance.send(command);
      const chunks: any[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      //@ts-ignore
      await fs.writeFile(tempPath, Buffer.concat(chunks));
      return tempPath;
    } else {
      return path.join(UPLOAD_FILE_PATH, fileName);
    }
  }

  static async uploadFileStream(stream: ReadableStream, originalName: string, fileSize: number) {
    const config = await getGlobalConfig({ useAdmin: true });
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const timestamp = Date.now();
    const timestampedFileName = `${baseName}_${timestamp}${extension}`;

    if (config.objectStorage === 's3') {
      const { s3ClientInstance } = await this.getS3Client();
      
      let customPath = config.s3CustomPath || '';
      if (customPath) {
        customPath = customPath.startsWith('/') ? customPath : '/' + customPath;
        customPath = customPath.endsWith('/') ? customPath : customPath + '/';
      }

      const s3Key = `${customPath}${timestampedFileName}`.replace(/^\//, '');
      
      const passThrough = new PassThrough();
      const nodeReadable = Readable.fromWeb(stream as any);
      nodeReadable.pipe(passThrough);

      const upload = new Upload({
        client: s3ClientInstance,
        params: {
          Bucket: config.s3Bucket,
          Key: s3Key,
          Body: passThrough,
        },
      });

      await upload.done();
      const s3Url = `/api/s3file/${s3Key}`;
      return { filePath: s3Url, fileName: timestampedFileName };
      
    } else {
      let customPath = config.localCustomPath || '';
      if (customPath) {
        customPath = customPath.startsWith('/') ? customPath : '/' + customPath;
        customPath = customPath.endsWith('/') ? customPath : customPath + '/';
      }

      const fullPath = path.join(UPLOAD_FILE_PATH, customPath, timestampedFileName);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      const writeStream = createWriteStream(fullPath);
      const nodeReadable = Readable.fromWeb(stream as any);

      await new Promise((resolve, reject) => {
        nodeReadable.pipe(writeStream)
          .on('finish', resolve)
          .on('error', reject);
      });

      const relativePath = `${customPath}${timestampedFileName}`.replace(/^\//, '');
      return { 
        filePath: `/api/file/${relativePath}`, 
        fileName: timestampedFileName 
      };
    }
  }

  static async renameFile(oldPath: string, newName: string) {
    const config = await getGlobalConfig({ useAdmin: true });
    
    await prisma.$transaction(async (prisma) => {
      if (oldPath.includes('/api/s3file/')) {
        const { s3ClientInstance } = await this.getS3Client();
        const oldKey = oldPath.replace('/api/s3file/', '');
        const dirPath = path.dirname(oldKey);
        
        const normalizedDirPath = dirPath === '.' ? '' : dirPath.replace(/\\/g, '/');
        const normalizedNewName = newName.replace(/\\/g, '/');
        const newKey = normalizedDirPath ? `${normalizedDirPath}/${normalizedNewName}` : normalizedNewName;

        try {
          await s3ClientInstance.send(new CopyObjectCommand({
            Bucket: config.s3Bucket,
            CopySource: encodeURIComponent(`${config.s3Bucket}/${decodeURIComponent(oldKey)}`),
            Key: decodeURIComponent(newKey)
          }));

          await s3ClientInstance.send(new DeleteObjectCommand({
            Bucket: config.s3Bucket,
            Key: decodeURIComponent(oldKey)
          }));
        } catch (error) {
          console.error('S3 rename operation failed:', error);
          throw new Error(`Failed to rename file in S3: ${error.message}`);
        }
      } else {
        const oldFilePath = path.join(UPLOAD_FILE_PATH, oldPath.replace('/api/file/', ''));
        const newFilePath = path.join(path.dirname(oldFilePath), newName);
        
        await fs.rename(oldFilePath, newFilePath);
      }
    });
  }

  static async moveFile(oldPath: string, newPath: string) {
    const config = await getGlobalConfig({ useAdmin: true });
    
    if (oldPath.includes('/api/s3file/')) {
      const { s3ClientInstance } = await this.getS3Client();
      const oldKey = oldPath.replace('/api/s3file/', '');
      let newKey = newPath.replace('/api/s3file/', '');

      if (newKey.startsWith('/')) {
        newKey = newKey.substring(1);
      }

      try {
        await s3ClientInstance.send(new GetObjectCommand({
          Bucket: config.s3Bucket,
          Key: decodeURIComponent(oldKey)
        }));
      } catch (error) {
        console.error('Source file check failed:', error);
        throw new Error(`Source file does not exist: ${decodeURIComponent(oldKey)}`);
      }

      try {
        await s3ClientInstance.send(new CopyObjectCommand({
          Bucket: config.s3Bucket,
          CopySource: encodeURIComponent(`${config.s3Bucket}/${decodeURIComponent(oldKey)}`),
          Key: decodeURIComponent(newKey)
        }));

        await s3ClientInstance.send(new DeleteObjectCommand({
          Bucket: config.s3Bucket,
          Key: decodeURIComponent(oldKey)
        }));
      } catch (error) {
        console.error('S3 operation failed:', error);
        throw new Error(`Failed to move file in S3: ${error.message}`);
      }
    } else {
      const oldFilePath = path.join(UPLOAD_FILE_PATH, oldPath.replace('/api/file/', ''));
      const newFilePath = path.join(UPLOAD_FILE_PATH, newPath.replace('/api/file/', ''));
      
      await fs.mkdir(path.dirname(newFilePath), { recursive: true });
      await fs.rename(oldFilePath, newFilePath);

      try {
        const oldDir = path.dirname(oldFilePath);
        const files = await fs.readdir(oldDir);
        
        if (files.length === 0) {
          await fs.rmdir(oldDir);
          
          let parentDir = path.dirname(oldDir);
          const uploadPath = path.join(UPLOAD_FILE_PATH);
          while (parentDir !== uploadPath) {
            const parentFiles = await fs.readdir(parentDir);
            if (parentFiles.length === 0) {
              await fs.rmdir(parentDir);
              parentDir = path.dirname(parentDir);
            } else {
              break;
            }
          }
        }
      } catch (error) {
        console.error('Failed to cleanup old directories:', error);
      }
    }
  }
}

