import { Module } from '@nestjs/common';
import { DevisService } from './devis.service';
import { DevisController } from './devis.controller';
import { PdfModule } from '../pdf/pdf.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PdfModule, MailModule],
  controllers: [DevisController],
  providers: [DevisService],
  exports: [DevisService],
})
export class DevisModule {}
