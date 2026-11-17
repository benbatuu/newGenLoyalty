export type MultiplierCampaignConfig = {
  multiplier: number;
  /** 0=Pazar … 6=Cumartesi; boş = her gün */
  daysOfWeek?: number[];
  /** HH:mm — happy hour başlangıç (opsiyonel) */
  startTime?: string;
  /** HH:mm — happy hour bitiş (opsiyonel) */
  endTime?: string;
  label?: string;
  /** Boş = tüm müşteriler */
  segmentId?: string;
  /** Boş = tüm şubeler */
  branchId?: string;
};

export type WinBackCampaignConfig = {
  inactiveDays: number;
  message: string;
  /** MVP: owner özeti; müşteri SMS sonraki sürümde */
  channel: 'OWNER_PUSH' | 'SMS';
  /** Boş = tüm uyuyan müşteriler */
  segmentId?: string;
};

export type ScheduledBroadcastConfig = {
  message: string;
  scheduledAt: string;
};

export type ActiveCampaignBadge = {
  id: string;
  name: string;
  type: string;
  label: string;
  multiplier?: number;
};
