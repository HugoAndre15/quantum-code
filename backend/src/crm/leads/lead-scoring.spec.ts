import { LeadSource, LeadStatus, ProspectWebsiteStatus } from '@prisma/client';
import { calculateLeadScore, getScoreLabel } from './lead-scoring';

describe('lead scoring', () => {
  it('prioritizes a reachable local prospect with a weak web presence and a concrete project', () => {
    const score = calculateLeadScore({
      name: 'Julie Martin',
      company: 'Martin Plomberie',
      email: 'julie@example.com',
      phone: '0600000000',
      trade: 'Plombier',
      city: 'Senlis',
      websiteStatus: ProspectWebsiteStatus.ABSENT,
      need: 'Présenter les réalisations et obtenir des demandes de devis',
      budget: 1000,
      delayMonths: 1,
      pageCount: 5,
      source: LeadSource.MANUEL,
      status: LeadStatus.REPONSE_RECUE,
    });

    expect(score.total).toBe(89);
    expect(score.label).toBe('Prioritaire');
    expect(score.parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'opportunity', score: 25, max: 25 }),
        expect.objectContaining({ key: 'intent', score: 28, max: 30 }),
        expect.objectContaining({ key: 'contact', score: 19, max: 20 }),
      ]),
    );
  });

  it('keeps an unqualified company with an already-correct website at low priority', () => {
    const score = calculateLeadScore({
      name: 'Entreprise Exemple',
      website: 'https://example.com',
      websiteStatus: ProspectWebsiteStatus.CORRECT,
      source: LeadSource.IMPORT_CSV,
      status: LeadStatus.NOUVEAU,
    });

    expect(score.total).toBe(7);
    expect(score.label).toBe('Faible');
  });

  it.each([
    [0, 'Faible'],
    [35, 'À travailler'],
    [55, 'Chaud'],
    [75, 'Prioritaire'],
  ])('labels a score of %i as %s', (score, label) => {
    expect(getScoreLabel(score)).toBe(label);
  });
});
