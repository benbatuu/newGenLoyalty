import { AdisyoPosAdapter } from './pos-adapters';

describe('AdisyoPosAdapter', () => {
  const adapter = new AdisyoPosAdapter();

  it('parses Turkish Adisyo order payload', () => {
    const sale = adapter.parseWebhook({
      SiparisId: 'AD-9921',
      ToplamTutar: 47.5,
      MusteriTelefon: '05551234567',
      FisNo: 'F-100',
      Urunler: [
        { KategoriId: 'kahve', Tutar: 25 },
        { KategoriId: 'tatli', Tutar: 22.5 },
      ],
    });
    expect(sale).toMatchObject({
      externalId: 'AD-9921',
      amountKurus: 4750,
      customerPhone: '905551234567',
      receiptId: 'F-100',
    });
    expect(sale?.lineItems).toHaveLength(2);
  });

  it('parses nested siparis object', () => {
    const sale = adapter.parseWebhook({
      siparis: {
        orderId: 'nested-1',
        toplamTutar: 120,
        telefon: '905551112233',
      },
    });
    expect(sale?.externalId).toBe('nested-1');
    expect(sale?.amountKurus).toBe(12000);
    expect(sale?.customerPhone).toBe('905551112233');
  });

  it('returns null without receipt id', () => {
    expect(adapter.parseWebhook({ ToplamTutar: 10 })).toBeNull();
  });
});
