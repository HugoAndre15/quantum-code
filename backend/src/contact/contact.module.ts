import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { MailModule } from '../mail/mail.module';
import { ConversionModule } from '../conversion/conversion.module';

@Module({
  imports: [MailModule, ConversionModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
