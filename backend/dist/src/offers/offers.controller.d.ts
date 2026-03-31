import { OffersService } from './offers.service';
import { CreatePackDto, UpdatePackDto, CreateOptionDto, UpdateOptionDto } from './dto/offers.dto';
export declare class OffersController {
    private offers;
    constructor(offers: OffersService);
    findAllPacks(): Promise<any>;
    createPack(dto: CreatePackDto): Promise<any>;
    updatePack(id: string, dto: UpdatePackDto): Promise<any>;
    removePack(id: string): Promise<{
        message: string;
    }>;
    findAllOptions(category?: string): Promise<any>;
    createOption(dto: CreateOptionDto): Promise<any>;
    updateOption(id: string, dto: UpdateOptionDto): Promise<any>;
    removeOption(id: string): Promise<{
        message: string;
    }>;
}
