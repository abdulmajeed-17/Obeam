import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class KybService {
  private readonly logger = new Logger(KybService.name);
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly encryption: EncryptionService,
  ) {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'kyb');
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error}`);
    }
  }

  async uploadDocument(params: {
    businessId: string;
    documentType: 'CAC_CERTIFICATE' | 'TAX_CERTIFICATE' | 'BANK_STATEMENT' | 'ID_CARD' | 'PROOF_OF_ADDRESS';
    fileName: string;
    fileBuffer: Buffer;
    mimeType: string;
  }): Promise<{ id: string; status: string }> {
    const { businessId, documentType, fileName, fileBuffer, mimeType } = params;

    const maxSize = 10 * 1024 * 1024;
    if (fileBuffer.length > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit.');
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(mimeType)) {
      throw new BadRequestException('Invalid file type. Only PDF, JPEG, PNG allowed.');
    }

    const fileId = randomUUID();
    const ext = path.extname(fileName);
    const storedFileName = `${fileId}${ext}`;
    const filePath = path.join(this.uploadDir, storedFileName);

    await fs.writeFile(filePath, fileBuffer);
    const encryptedPath = this.encryption.encrypt(filePath);

    const document = await this.prisma.$queryRaw`
      INSERT INTO kyb_documents (
        id, business_id, document_type, file_name, file_path, file_size, mime_type, status
      ) VALUES (
        gen_random_uuid(), ${businessId}::uuid, ${documentType}, ${fileName}, ${encryptedPath}, ${fileBuffer.length}, ${mimeType}, 'PENDING'
      )
      RETURNING id, status
    ` as Array<{ id: string; status: string }>;

    return document[0];
  }

  async getBusinessDocuments(businessId: string) {
    return this.prisma.$queryRaw`
      SELECT id, document_type, file_name, file_size, mime_type, status, verification_notes, verified_at, created_at
      FROM kyb_documents
      WHERE business_id = ${businessId}::uuid
      ORDER BY created_at DESC
    `;
  }

  async verifyDocument(params: {
    documentId: string;
    status: 'VERIFIED' | 'REJECTED';
    notes?: string;
    verifiedBy: string;
  }): Promise<void> {
    const { documentId, status, notes, verifiedBy } = params;
    await this.prisma.$queryRaw`
      UPDATE kyb_documents
      SET status = ${status}, verification_notes = ${notes || null}, verified_at = NOW(), verified_by = ${verifiedBy}::uuid, updated_at = NOW()
      WHERE id = ${documentId}::uuid
    `;
  }

  async getDocumentFile(documentId: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const doc = await this.prisma.$queryRaw`
      SELECT file_path, file_name, mime_type FROM kyb_documents WHERE id = ${documentId}::uuid
    ` as Array<{ file_path: string; file_name: string; mime_type: string }>;

    if (!doc || doc.length === 0) {
      throw new NotFoundException('Document not found.');
    }

    const decryptedPath = this.encryption.decrypt(doc[0].file_path);
    const buffer = await fs.readFile(decryptedPath);

    return { buffer, fileName: doc[0].file_name, mimeType: doc[0].mime_type };
  }
}
