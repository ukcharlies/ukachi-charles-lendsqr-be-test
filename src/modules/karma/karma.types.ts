export type IdentityType = 'EMAIL' | 'PHONE' | 'BVN';
export interface KarmaResult {
  blacklisted: boolean;
  providerReference?: string;
  responseCode?: string;
}
