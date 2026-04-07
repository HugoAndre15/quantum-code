export declare enum ClientStatus {
    A_CONTACTER = "A_CONTACTER",
    CONTACTE = "CONTACTE",
    DEVIS = "DEVIS",
    FACTURE = "FACTURE",
    EN_COURS = "EN_COURS",
    TERMINE = "TERMINE",
    REFUSE = "REFUSE"
}
export declare class CreateClientDto {
    company: string;
    trade: string;
    contactName: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    status?: ClientStatus;
    notes?: string;
    budget?: number;
    contactDate?: string;
    onlinePresence?: string[];
    packId?: string;
    optionIds?: string[];
}
export declare class UpdateClientDto {
    company?: string;
    trade?: string;
    contactName?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    status?: ClientStatus;
    notes?: string;
    budget?: number;
    contactDate?: string;
    onlinePresence?: string[];
    packId?: string;
    optionIds?: string[];
}
