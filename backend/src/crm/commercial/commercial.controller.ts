import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard, RoleGuard } from '../../auth/guards/jwt.guard';
import { CommercialService } from './commercial.service';
import {
  CreateNoteDto,
  CreateTaskDto,
  CrmContextDto,
  TaskQueryDto,
  UpdateTaskDto,
} from './dto/commercial.dto';

@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('crm')
export class CommercialController {
  constructor(private readonly commercial: CommercialService) {}

  @Get('timeline')
  timeline(@Query() context: CrmContextDto) {
    return this.commercial.timeline(context);
  }

  @Post('timeline/notes')
  addNote(@Body() dto: CreateNoteDto) {
    return this.commercial.addNote(dto);
  }

  @Get('tasks')
  tasks(@Query() query: TaskQueryDto) {
    const { status, ...context } = query;
    return this.commercial.findTasks(context, status);
  }

  @Post('tasks')
  createTask(@Body() dto: CreateTaskDto) {
    return this.commercial.createTask(dto);
  }

  @Patch('tasks/:id')
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.commercial.updateTask(id, dto);
  }

  @Delete('tasks/:id')
  removeTask(@Param('id') id: string) {
    return this.commercial.removeTask(id);
  }
}
