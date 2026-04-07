import { OffersService } from './offers.service';
import { CreatePackDto, UpdatePackDto, CreateOptionDto, UpdateOptionDto } from './dto/offers.dto';
export declare class OffersController {
    private offers;
    constructor(offers: OffersService);
    findPublicPacks(): Promise<{
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
    }[]>;
    findPublicOptions(): Promise<{
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
    }[]>;
    findAllPacks(): Promise<{
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
    }[]>;
    createPack(dto: CreatePackDto): Promise<{
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
    }>;
    updatePack(id: string, dto: UpdatePackDto): Promise<{
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
    }>;
    removePack(id: string): Promise<{
        message: string;
    }>;
    findAllOptions(category?: string): Promise<{
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
    }[]>;
    createOption(dto: CreateOptionDto): Promise<{
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
    }>;
    updateOption(id: string, dto: UpdateOptionDto): Promise<{
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
    }>;
    removeOption(id: string): Promise<{
        message: string;
    }>;
}
