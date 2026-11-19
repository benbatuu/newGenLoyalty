/**
 * Apple pass stili programın türünden belirlenir; kullanıcı seçmez.
 * Bir kart Wallet'a eklendikten sonra stil değişmemeli.
 */
export type ApplePassStyle = 'storeCard' | 'eventTicket';

export function resolvePassStyle(programType: string | null | undefined): ApplePassStyle {
  return programType === 'EVENT_CARD' ? 'eventTicket' : 'storeCard';
}
