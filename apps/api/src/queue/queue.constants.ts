export const QUEUE_CAMPAIGN = 'campaign';
export const CAMPAIGN_JOB_RUN = 'run';

export type CampaignJobPayload = {
  tenantId: string;
  campaignId: string;
  triggeredAt: string;
};
