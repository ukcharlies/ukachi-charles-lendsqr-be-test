import type { KarmaResult } from './karma.types.js';
export interface KarmaProvider {
  check(identity: string): Promise<KarmaResult>;
}
