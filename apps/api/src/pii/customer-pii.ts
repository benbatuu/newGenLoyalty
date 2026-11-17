import type { PiiService } from './pii.service';

/** API yanıtı — telefon/e-posta maskeli; tam değer döndürülmez. */
export function toPublicCustomer<
  T extends {
    phone?: string | null;
    phoneEnc?: string | null;
    phoneLast4?: string | null;
    email?: string | null;
    emailEnc?: string | null;
  },
>(pii: PiiService, row: T) {
  const {
    phone: _legacyPhone,
    email: _legacyEmail,
    phoneEnc: _enc,
    emailEnc: _eenc,
    ...rest
  } = row as T & { phone?: string; email?: string };
  return {
    ...rest,
    phone: pii.phoneMasked(row),
    email: pii.emailMasked(row),
  };
}

export function customerPhonePlain(
  pii: PiiService,
  row: { phone?: string | null; phoneEnc?: string | null },
): string {
  return pii.decryptPhone(row);
}

export function customerCreatePhoneData(
  pii: PiiService,
  phoneRaw: string,
): {
  phoneHash: string;
  phoneEnc: string;
  phoneLast4: string;
} {
  const packed = pii.packPhone(phoneRaw);
  return {
    phoneHash: packed.phoneHash,
    phoneEnc: packed.phoneEnc,
    phoneLast4: packed.phoneLast4,
  };
}

export function customerCreateEmailData(
  pii: PiiService,
  emailRaw: string | null | undefined,
):
  | { emailHash: string; emailEnc: string; email: null }
  | { emailHash: null; emailEnc: null; email: null } {
  const raw = emailRaw?.trim();
  if (!raw) {
    return { emailHash: null, emailEnc: null, email: null };
  }
  const packed = pii.packEmail(raw);
  return {
    emailHash: packed.emailHash,
    emailEnc: packed.emailEnc,
    email: null,
  };
}
