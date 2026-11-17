import { SetMetadata } from '@nestjs/common';

export const SKIP_SUBSCRIPTION_CHECK = 'skipSubscriptionCheck';

/** Askıda hesap yeniden açma vb. — abonelik operasyonel kontrolü atlanır */
export const SkipSubscriptionCheck = () =>
  SetMetadata(SKIP_SUBSCRIPTION_CHECK, true);
