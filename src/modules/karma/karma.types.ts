export type IdentityType = 'EMAIL' | 'PHONE' | 'BVN';
export type KarmaDecision = 'CLEAR' | 'BLACKLISTED' | 'INCONCLUSIVE';
export interface KarmaResult {
  blacklisted: boolean;
  decision?: KarmaDecision;
  providerReference?: string;
  responseCode?: string;
}
