import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
export declare class ClientsController {
    private clients;
    constructor(clients: ClientsService);
    findAll(status?: string): Promise<any>;
    stats(): Promise<{
        total: any;
        byStatus: any;
    }>;
    findOne(id: string): Promise<any>;
    create(dto: CreateClientDto): Promise<any>;
    update(id: string, dto: UpdateClientDto): Promise<any>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
