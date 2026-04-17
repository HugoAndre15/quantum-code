import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async sendContact(@Body() dto: ContactDto) {
    await this.contactService.sendContactEmail(dto);
    return { message: 'Message envoyé avec succès' };
  }
}
