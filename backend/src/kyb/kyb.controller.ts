import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { GetUser, RequestUser } from '../auth/get-user.decorator';
import { KybService } from './kyb.service';
import { IsString, IsIn } from 'class-validator';

class UploadDocumentDto {
  @IsString()
  @IsIn(['CAC_CERTIFICATE', 'TAX_CERTIFICATE', 'BANK_STATEMENT', 'ID_CARD', 'PROOF_OF_ADDRESS'])
  documentType!: string;
}

class VerifyDocumentDto {
  @IsString()
  @IsIn(['VERIFIED', 'REJECTED'])
  status!: string;

  notes?: string;
}

@Controller('kyb')
@UseGuards(JwtAuthGuard)
export class KybController {
  constructor(private readonly kyb: KybService) {}

  /**
   * Upload KYB document.
   */
  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @GetUser() user: RequestUser,
    @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string },
    @Body() body: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    return this.kyb.uploadDocument({
      businessId: user.businessId,
      documentType: body.documentType as any,
      fileName: file.originalname,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
    });
  }

  /**
   * Get business documents.
   */
  @Get('documents')
  async getDocuments(@GetUser() user: RequestUser) {
    return this.kyb.getBusinessDocuments(user.businessId);
  }

  /**
   * Get document file (download).
   */
  @Get('documents/:id/file')
  async getDocumentFile(@GetUser() user: RequestUser, @Param('id') id: string) {
    const file = await this.kyb.getDocumentFile(id);
    // Return file as download
    return {
      buffer: file.buffer.toString('base64'),
      fileName: file.fileName,
      mimeType: file.mimeType,
    };
  }

  /**
   * Admin: Verify document.
   */
  @Post('documents/:id/verify')
  @UseGuards(AdminGuard)
  async verifyDocument(
    @GetUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: VerifyDocumentDto,
  ) {
    await this.kyb.verifyDocument({
      documentId: id,
      status: body.status as 'VERIFIED' | 'REJECTED',
      notes: body.notes,
      verifiedBy: user.id,
    });
    return { success: true };
  }
}
