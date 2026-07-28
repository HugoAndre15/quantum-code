import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const reviews = await this.prisma.review.findMany({
      include: { client: { select: { id: true, company: true } } },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
    return reviews.map(({ comment, ...review }) => ({
      ...review,
      content: comment,
    }));
  }

  async create(dto: CreateReviewDto) {
    const review = await this.prisma.review.create({
      data: {
        authorName: dto.authorName,
        company: dto.company || null,
        rating: dto.rating,
        comment: dto.content,
        published: dto.published ?? false,
        position: dto.position ?? 0,
      },
    });
    const { comment, ...rest } = review;
    return { ...rest, content: comment };
  }

  async update(id: string, dto: UpdateReviewDto) {
    await this.ensureExists(id);
    const { content, ...data } = dto;
    const review = await this.prisma.review.update({
      where: { id },
      data: {
        ...data,
        ...(content !== undefined ? { comment: content } : {}),
      },
    });
    const { comment, ...rest } = review;
    return { ...rest, content: comment };
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.review.delete({ where: { id } });
    return { message: 'Avis supprimé' };
  }

  private async ensureExists(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!review) throw new NotFoundException('Avis introuvable');
  }
}
