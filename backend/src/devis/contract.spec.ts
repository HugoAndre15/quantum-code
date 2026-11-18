import { DevisService } from './devis.service';
import { CONTRACT_VERSION, freezeOffer, offerDigest, signatureDeadline } from './contract';
import { renderContractPdf } from './contract-pdf';

const future = new Date('2099-03-10T20:00:00Z');
const quote = {
  id: 'q1', number: 'DEV-TEST', status: 'ENVOYE', project: null, clientId: 'c1',
  client: { company: 'Atelier exemple', contactName: 'Camille Exemple', address: 'Adresse de test', email: 'test@example.invalid' },
  createdAt: new Date('2026-11-18T10:00:00Z'), updatedAt: new Date('2026-11-18T10:00:00Z'),
  totalHT: 600, discountAmount: 0, promoCode: null, notes: 'Recette sur préproduction',
  items: [{ label: 'Site vitrine', description: null, quantity: 1, unitPrice: 600, recurring: false, recurringUnit: null }],
  acceptToken: 'test-invitation', acceptTokenExpiresAt: future, validUntil: future,
};
const snapshot = freezeOffer(quote, 'Adresse professionnelle de test', future);
const input = { signerName: 'Camille Exemple', signerRole: 'Gérante', confirmsB2BRemote: true, acceptsContract: true, digest: offerDigest(snapshot) };

function fixture(overrides: Record<string, unknown> = {}, claim = 1) {
  const devis = { ...quote, contractOffer: snapshot, ...overrides };
  const tx = {
    devis: {
      updateMany: jest.fn().mockResolvedValue({ count: claim }),
      findUnique: jest.fn().mockResolvedValue({ status: 'ACCEPTE', acceptToken: quote.acceptToken }),
    },
    devisSignature: { create: jest.fn().mockResolvedValue({}) },
    crmTask: { updateMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    crmActivity: { create: jest.fn() },
  };
  const prisma = {
    devis: { findUnique: jest.fn().mockResolvedValue(devis), update: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn().mockImplementation(callback => callback(tx)),
  };
  return { service: new DevisService(prisma as never), prisma, tx };
}

describe('Contrat B2B', () => {
  it('binds the price, notes, client, exact clauses and declaration to the digest', () => {
    expect(offerDigest(snapshot)).toHaveLength(64);
    expect(offerDigest(freezeOffer({ ...quote, notes: 'Autre condition' }, 'Adresse professionnelle de test', future))).not.toBe(input.digest);
    expect(JSON.parse(snapshot)).toMatchObject({ version: CONTRACT_VERSION, number: 'DEV-TEST', totalHT: 600 });
  });

  it('honours French calendar dates in both winter and summer', () => {
    expect(signatureDeadline(new Date('2026-12-05'), new Date()).toISOString()).toBe('2026-12-05T22:59:59.999Z');
    expect(signatureDeadline(new Date('2026-07-05'), new Date()).toISOString()).toBe('2026-07-05T21:59:59.999Z');
  });

  it('previews the frozen offer even after edits to customer master data', async () => {
    const { service, prisma } = fixture({ client: { company: 'Nouveau nom' } });
    const result = await service.getAcceptancePreview(quote.acceptToken);
    expect(result.client.company).toBe(quote.client.company);
    expect(result.contract?.digest).toBe(input.digest);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    [{}, { ...input, acceptsContract: false }],
    [{}, { ...input, confirmsB2BRemote: false }],
    [{}, { ...input, digest: '0'.repeat(64) }],
    [{}, { ...input, signerName: ' ' }],
    [{ contractOffer: null }, input],
    [{ status: 'BROUILLON' }, input],
    [{ status: 'REFUSE' }, input],
    [{ acceptTokenExpiresAt: new Date(0) }, input],
  ] satisfies Array<[Record<string, unknown>, typeof input]>)('rejects an invalid agreement before any write', async (overrides, body) => {
    const { service, prisma } = fixture(overrides);
    await expect(service.acceptByToken(quote.acceptToken, body)).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('files the exact signed PDF and sends only the winning request to notification', async () => {
    const { service, tx } = fixture();
    expect((await service.acceptByToken(quote.acceptToken, input)).alreadyAccepted).toBe(false);
    const evidence = tx.devisSignature.create.mock.calls[0][0].data;
    expect(evidence).toMatchObject({ version: CONTRACT_VERSION, offerDigest: input.digest, signerName: input.signerName });
    expect(Buffer.from(evidence.signedPdf).subarray(0, 4).toString()).toBe('%PDF');
    expect(tx.devis.updateMany.mock.calls[0][0].where).toMatchObject({ status: 'ENVOYE', acceptToken: quote.acceptToken, contractOffer: snapshot });
    const raced = fixture({}, 0);
    expect((await raced.service.acceptByToken(quote.acceptToken, input)).alreadyAccepted).toBe(true);
    expect(raced.tx.devisSignature.create).not.toHaveBeenCalled();
    expect(raced.tx.crmTask.create).not.toHaveBeenCalled();
  });

  it('does not let a CRM status change act as the customer signature', async () => {
    const { service, prisma } = fixture();
    await expect(service.update(quote.id, { status: 'ACCEPTE' })).rejects.toThrow(/signer/);
    expect(prisma.devis.update).not.toHaveBeenCalled();
  });

  it('never revises a signed document or issues an invitation with an incomplete issuer address', async () => {
    await expect(fixture({ status: 'ACCEPTE' }).service.update(quote.id, { notes: 'Edit' })).rejects.toThrow(/figé/);
    await expect(fixture().service.generateAcceptToken(quote.id, ' ')).rejects.toThrow(/CONTRACT_ISSUER_ADDRESS/);
  });

  it('renders a pre-signature copy as a PDF without recording acceptance', async () => {
    const pdf = await renderContractPdf(snapshot);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('reports a stale invitation if the administrator edits the quote during email dispatch', async () => {
    const { service, prisma } = fixture({ acceptToken: 'new-invitation' });
    prisma.devis.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.markInvitationSent(quote.id, quote.acceptToken)).rejects.toThrow(/changé/);
  });

  it('allows a retry of the same invitation without a second CRM transition', async () => {
    const { service, prisma } = fixture();
    prisma.devis.updateMany.mockResolvedValue({ count: 0 });
    await service.markInvitationSent(quote.id, quote.acceptToken);
    expect(prisma.devis.update).not.toHaveBeenCalled();
  });
});
