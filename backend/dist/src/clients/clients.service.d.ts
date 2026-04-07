import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
export declare class ClientsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(status?: string): Promise<({
        pack: {
            id: string;
            name: string;
            price: number;
        } | null;
        options: ({
            serviceOption: {
                id: string;
                name: string;
                price: number;
            };
        } & {
            id: string;
            createdAt: Date;
            notes: string | null;
            serviceOptionId: string;
            clientId: string;
        })[];
    } & {
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        company: string;
        trade: string;
        contactName: string;
        address: string | null;
        phone: string | null;
        website: string | null;
        status: import(".prisma/client").$Enums.ClientStatus;
        notes: string | null;
        budget: number | null;
        contactDate: Date;
        onlinePresence: string[];
        packId: string | null;
    })[]>;
    findOne(id: string): Promise<{
        pack: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            price: number;
            type: import(".prisma/client").$Enums.PackType;
            devTime: number;
            position: number;
            active: boolean;
            features: string[];
        } | null;
        devis: ({
            items: {
                id: string;
                createdAt: Date;
                description: string | null;
                devTime: number;
                recurring: boolean;
                recurringUnit: string | null;
                packId: string | null;
                serviceOptionId: string | null;
                label: string;
                quantity: number;
                unitPrice: number;
                devisId: string;
            }[];
        } & {
            number: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            devTime: number;
            status: import(".prisma/client").$Enums.DevisStatus;
            notes: string | null;
            clientId: string;
            validUntil: Date | null;
            totalHT: number;
        })[];
        options: ({
            serviceOption: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                price: number;
                devTime: number;
                active: boolean;
                category: string;
                recurring: boolean;
                recurringUnit: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            notes: string | null;
            serviceOptionId: string;
            clientId: string;
        })[];
        factures: {
            number: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.FactureStatus;
            notes: string | null;
            clientId: string;
            totalHT: number;
            devisId: string;
            paidAt: Date | null;
        }[];
    } & {
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        company: string;
        trade: string;
        contactName: string;
        address: string | null;
        phone: string | null;
        website: string | null;
        status: import(".prisma/client").$Enums.ClientStatus;
        notes: string | null;
        budget: number | null;
        contactDate: Date;
        onlinePresence: string[];
        packId: string | null;
    }>;
    create(dto: CreateClientDto): Promise<{
        pack: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            price: number;
            type: import(".prisma/client").$Enums.PackType;
            devTime: number;
            position: number;
            active: boolean;
            features: string[];
        } | null;
        options: ({
            serviceOption: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                price: number;
                devTime: number;
                active: boolean;
                category: string;
                recurring: boolean;
                recurringUnit: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            notes: string | null;
            serviceOptionId: string;
            clientId: string;
        })[];
    } & {
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        company: string;
        trade: string;
        contactName: string;
        address: string | null;
        phone: string | null;
        website: string | null;
        status: import(".prisma/client").$Enums.ClientStatus;
        notes: string | null;
        budget: number | null;
        contactDate: Date;
        onlinePresence: string[];
        packId: string | null;
    }>;
    update(id: string, dto: UpdateClientDto): Promise<{
        pack: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            price: number;
            type: import(".prisma/client").$Enums.PackType;
            devTime: number;
            position: number;
            active: boolean;
            features: string[];
        } | null;
        options: ({
            serviceOption: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                price: number;
                devTime: number;
                active: boolean;
                category: string;
                recurring: boolean;
                recurringUnit: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            notes: string | null;
            serviceOptionId: string;
            clientId: string;
        })[];
    } & {
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        company: string;
        trade: string;
        contactName: string;
        address: string | null;
        phone: string | null;
        website: string | null;
        status: import(".prisma/client").$Enums.ClientStatus;
        notes: string | null;
        budget: number | null;
        contactDate: Date;
        onlinePresence: string[];
        packId: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    stats(): Promise<{
        total: number;
        byStatus: {};
    }>;
}
