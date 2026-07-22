import axios, { AxiosError, type AxiosInstance } from 'axios';
import { ExternalServiceError } from '../../common/errors/app-error.js';
import type { KarmaProvider } from './karma.provider.js';
import type { KarmaResult } from './karma.types.js';
export class AdjutorKarmaProvider implements KarmaProvider {
  private readonly client: AxiosInstance;
  public constructor(baseURL: string, apiKey: string, timeout: number) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  }
  public async check(identity: string): Promise<KarmaResult> {
    try {
      const { data, status } = await this.client.get(
        `/v2/verification/karma/${encodeURIComponent(identity)}`,
      );
      return this.interpret(data, status);
    } catch (error) {
      if (error instanceof ExternalServiceError) throw error;
      if (error instanceof AxiosError && error.response?.status === 404)
        return { blacklisted: false, decision: 'CLEAR', responseCode: '404' };
      throw new ExternalServiceError();
    }
  }
  private interpret(payload: unknown, status: number): KarmaResult {
    if (!payload || typeof payload !== 'object') throw new ExternalServiceError();
    const body = payload as Record<string, unknown>;
    if (Object.keys(body).length === 0)
      return {
        blacklisted: false,
        decision: 'INCONCLUSIVE',
        responseCode: String(status),
      };
    const data = body.data;
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      const karmaIdentity = record.karma_identity;
      const explicitlyBlacklisted =
        (typeof karmaIdentity === 'string' && karmaIdentity.trim().length > 0) ||
        karmaIdentity === true ||
        record.is_blacklisted === true ||
        record.blacklisted === true;
      if (explicitlyBlacklisted)
        return {
          blacklisted: true,
          decision: 'BLACKLISTED',
          ...(typeof record.id === 'string' ? { providerReference: record.id } : {}),
          responseCode: String(status),
        };
    }
    // The live Adjutor test environment has been observed returning an exact
    // empty object for documented test identities. That one response shape is
    // surfaced as inconclusive so the assessment can continue without claiming
    // that screening passed. Every other unfamiliar response remains fail-closed.
    throw new ExternalServiceError();
  }
}
