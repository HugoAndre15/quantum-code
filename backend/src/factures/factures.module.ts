import { Module } from '@nestjs/common';
import { FacturesService } from './factures.service';
import { FacturesController } from './factures.controller';
import { PdfModule } from '../pdf/pdf.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PdfModule, MailModule],
  controllers: [FacturesController],
  providers: [FacturesService],
  exports: [FacturesService],
})
export class FacturesModule {}
