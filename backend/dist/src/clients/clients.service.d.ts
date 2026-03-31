import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
export declare class ClientsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(status?: string): Promise<any>;
    findOne(id: string): Promise<any>;
    create(dto: CreateClientDto): Promise<any>;
    update(id: string, dto: UpdateClientDto): Promise<any>;
    remove(id: string): Promise<{
        message: string;
    }>;
    stats(): Promise<{
        total: any;
        byStatus: any;
    }>;
}
