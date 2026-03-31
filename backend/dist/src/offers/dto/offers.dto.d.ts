export declare class CreatePackDto {
    name: string;
    description?: string;
    price: number;
    position?: number;
    active?: boolean;
    features?: string[];
}
export declare class UpdatePackDto {
    name?: string;
    description?: string;
    price?: number;
    position?: number;
    active?: boolean;
    features?: string[];
}
export declare class CreateOptionDto {
    name: string;
    description?: string;
    price: number;
    category?: string;
    active?: boolean;
}
export declare class UpdateOptionDto {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    active?: boolean;
}
