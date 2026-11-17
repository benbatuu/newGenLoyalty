import { SimpraPosAdapter, MenuluxPosAdapter, RestajetPosAdapter } from './pos-adapters';

describe('TR POS adapters', () => {
  it('Simpra parses check payload', () => {
    const adapter = new SimpraPosAdapter();
    const sale = adapter.parseWebhook({
      check_id: 'sim-1',
      total: 89.9,
      customer_phone: '05559876543',
      items: [{ categoryId: 'yemek', amount: 89.9 }],
    });
    expect(sale?.externalId).toBe('sim-1');
    expect(sale?.amountKurus).toBe(8990);
    expect(sale?.customerPhone).toBe('905559876543');
  });

  it('Menulux parses order payload', () => {
    const adapter = new MenuluxPosAdapter();
    const sale = adapter.parseWebhook({
      order: {
        orderId: 'mx-22',
        totalPrice: 150,
        customerPhone: '905551112233',
      },
    });
    expect(sale?.externalId).toBe('mx-22');
    expect(sale?.amountKurus).toBe(15000);
  });

  it('Restajet parses nested data', () => {
    const adapter = new RestajetPosAdapter();
    const sale = adapter.parseWebhook({
      data: {
        OrderID: 'rj-9',
        TotalAmount: 42.5,
        CustomerPhone: '05551234567',
      },
    });
    expect(sale?.externalId).toBe('rj-9');
    expect(sale?.amountKurus).toBe(4250);
  });
});
