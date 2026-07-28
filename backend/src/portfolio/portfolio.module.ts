import { Module } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [PortfolioController, ReviewsController],
  providers: [PortfolioService, ReviewsService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
