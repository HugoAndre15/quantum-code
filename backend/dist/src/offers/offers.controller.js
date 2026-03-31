"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffersController = void 0;
const common_1 = require("@nestjs/common");
const offers_service_1 = require("./offers.service");
const offers_dto_1 = require("./dto/offers.dto");
const jwt_guard_1 = require("../auth/guards/jwt.guard");
let OffersController = class OffersController {
    offers;
    constructor(offers) {
        this.offers = offers;
    }
    findAllPacks() {
        return this.offers.findAllPacks();
    }
    createPack(dto) {
        return this.offers.createPack(dto);
    }
    updatePack(id, dto) {
        return this.offers.updatePack(id, dto);
    }
    removePack(id) {
        return this.offers.removePack(id);
    }
    findAllOptions(category) {
        return this.offers.findAllOptions(category);
    }
    createOption(dto) {
        return this.offers.createOption(dto);
    }
    updateOption(id, dto) {
        return this.offers.updateOption(id, dto);
    }
    removeOption(id) {
        return this.offers.removeOption(id);
    }
};
exports.OffersController = OffersController;
__decorate([
    (0, common_1.Get)('packs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OffersController.prototype, "findAllPacks", null);
__decorate([
    (0, common_1.Post)('packs'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [offers_dto_1.CreatePackDto]),
    __metadata("design:returntype", void 0)
], OffersController.prototype, "createPack", null);
__decorate([
    (0, common_1.Put)('packs/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, offers_dto_1.UpdatePackDto]),
    __metadata("design:returntype", void 0)
], OffersController.prototype, "updatePack", null);
__decorate([
    (0, common_1.Delete)('packs/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OffersController.prototype, "removePack", null);
__decorate([
    (0, common_1.Get)('options'),
    __param(0, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OffersController.prototype, "findAllOptions", null);
__decorate([
    (0, common_1.Post)('options'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [offers_dto_1.CreateOptionDto]),
    __metadata("design:returntype", void 0)
], OffersController.prototype, "createOption", null);
__decorate([
    (0, common_1.Put)('options/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, offers_dto_1.UpdateOptionDto]),
    __metadata("design:returntype", void 0)
], OffersController.prototype, "updateOption", null);
__decorate([
    (0, common_1.Delete)('options/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OffersController.prototype, "removeOption", null);
exports.OffersController = OffersController = __decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('offers'),
    __metadata("design:paramtypes", [offers_service_1.OffersService])
], OffersController);
//# sourceMappingURL=offers.controller.js.map