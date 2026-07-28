import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackConversionDto } from './dto/conversion.dto';

@Injectable()
export class ConversionService {
  constructor(private readonly prisma: PrismaService) {}

  async track(dto: TrackConversionDto) {
    const {
      sessionId,
      name,
      path,
      metadata,
      landingPage,
      referrer,
      source,
      medium,
      campaign,
      term,
      content,
      device,
    } = dto;

    const session = await this.prisma.conversionSession.upsert({
      where: { sessionId },
      update: {
        ...(source && { source }),
        ...(medium && { medium }),
        ...(campaign && { campaign }),
        ...(term && { term }),
        ...(content && { content }),
        ...(device && { device }),
      },
      create: {
        sessionId,
        landingPage: landingPage || path || '/',
        referrer,
        source: source || this.inferSource(referrer),
        medium,
        campaign,
        term,
        content,
        device,
      },
    });

    await this.prisma.conversionEvent.create({
      data: {
        conversionSessionId: session.id,
        name,
        path,
        metadata: metadata ?? undefined,
      },
    });

    return { tracked: true };
  }

  async attachLead(sessionId: string | undefined, leadId: string) {
    if (!sessionId) return;
    const session = await this.prisma.conversionSession.upsert({
      where: { sessionId },
      update: {},
      create: {
        sessionId,
        landingPage: '/',
        source: 'direct',
      },
    });

    await this.prisma.$transaction([
      this.prisma.conversionSession.update({
        where: { id: session.id },
        data: { leadId },
      }),
      this.prisma.conversionEvent.create({
        data: {
          conversionSessionId: session.id,
          name: 'LEAD_CREATED',
        },
      }),
    ]);
  }

  async stats(days = 30) {
    const safeDays = Math.min(Math.max(days || 30, 1), 365);
    const from = new Date();
    from.setDate(from.getDate() - safeDays);

    const sessions = await this.prisma.conversionSession.findMany({
      where: { firstSeenAt: { gte: from } },
      include: {
        events: {
          where: { createdAt: { gte: from } },
          select: { name: true, createdAt: true },
        },
        lead: {
          select: {
            id: true,
            convertedClient: {
              select: {
                id: true,
                company: true,
                devis: {
                  select: { id: true, status: true, totalHT: true },
                },
              },
            },
          },
        },
      },
      orderBy: { firstSeenAt: 'desc' },
    });

    const hasEvent = (session: (typeof sessions)[number], name: string) =>
      session.events.some((event) => event.name === name);
    const hasQuote = (session: (typeof sessions)[number]) =>
      Boolean(session.lead?.convertedClient?.devis.length);
    const hasWonQuote = (session: (typeof sessions)[number]) =>
      session.lead?.convertedClient?.devis.some(
        (quote) => quote.status === 'ACCEPTE',
      ) ?? false;

    const rawFunnel = [
      { key: 'visits', label: 'Visites', count: sessions.length },
      {
        key: 'simulator',
        label: 'Simulateur / contact',
        count: sessions.filter((session) =>
          hasEvent(session, 'SIMULATOR_STARTED') ||
          hasEvent(session, 'CONTACT_SUBMITTED') ||
          Boolean(session.lead),
        ).length,
      },
      {
        key: 'leads',
        label: 'Leads',
        count: sessions.filter((session) => session.lead).length,
      },
      {
        key: 'quotes',
        label: 'Devis créés',
        count: sessions.filter(hasQuote).length,
      },
      {
        key: 'clients',
        label: 'Clients signés',
        count: sessions.filter(hasWonQuote).length,
      },
    ];

    const funnel = rawFunnel.map((stage, index) => ({
      ...stage,
      conversionFromPrevious:
        index === 0 || rawFunnel[index - 1].count === 0
          ? null
          : Math.round(
              (stage.count / rawFunnel[index - 1].count) * 1000,
            ) / 10,
      conversionFromVisit:
        index === 0
          ? 100
          : sessions.length === 0
            ? 0
            : Math.round((stage.count / sessions.length) * 1000) / 10,
    }));

    const sources = new Map<
      string,
      { sessions: number; leads: number; clients: number }
    >();
    for (const session of sessions) {
      const sourceName = session.source || 'direct';
      const current = sources.get(sourceName) || {
        sessions: 0,
        leads: 0,
        clients: 0,
      };
      current.sessions += 1;
      if (session.lead) current.leads += 1;
      if (hasWonQuote(session)) current.clients += 1;
      sources.set(sourceName, current);
    }

    const recent = sessions.slice(0, 30).map((session) => ({
      id: session.id,
      sessionId: session.sessionId,
      source: session.source || 'direct',
      campaign: session.campaign,
      landingPage: session.landingPage,
      device: session.device,
      firstSeenAt: session.firstSeenAt,
      pageViews: session.events.filter((event) => event.name === 'PAGE_VIEW')
        .length,
      simulatorStarted: hasEvent(session, 'SIMULATOR_STARTED'),
      lead: Boolean(session.lead),
      quote: hasQuote(session),
      client: hasWonQuote(session),
      company: session.lead?.convertedClient?.company,
    }));

    return {
      periodDays: safeDays,
      funnel,
      sources: Array.from(sources.entries())
        .map(([name, values]) => ({ name, ...values }))
        .sort((a, b) => b.sessions - a.sessions),
      recent,
    };
  }

  private inferSource(referrer?: string) {
    if (!referrer) return 'direct';
    try {
      const host = new URL(referrer).hostname.replace(/^www\./, '');
      if (host.includes('google.')) return 'google';
      if (host.includes('bing.')) return 'bing';
      if (host.includes('facebook.') || host.includes('instagram.')) {
        return 'meta';
      }
      if (host.includes('linkedin.')) return 'linkedin';
      return host;
    } catch {
      return 'referral';
    }
  }
}
