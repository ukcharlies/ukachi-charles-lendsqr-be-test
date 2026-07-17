import nock from 'nock';
import { AdjutorKarmaProvider } from '../../src/modules/karma/adjutor-karma.provider.js';

describe('AdjutorKarmaProvider', () => {
  const baseUrl = 'https://adjutor.lendsqr.com';
  const provider = new AdjutorKarmaProvider(baseUrl, 'test-api-key', 50);

  afterEach(() => nock.cleanAll());

  test('1: identifies a blacklisted email from documented string response', async () => {
    nock(baseUrl, { reqheaders: { authorization: 'Bearer test-api-key' } })
      .get('/v2/verification/karma/bad%40example.com')
      .reply(200, {
        status: 'success',
        data: { karma_identity: 'bad@example.com', id: 'karma-email-1' },
      });

    await expect(provider.check('bad@example.com')).resolves.toEqual({
      blacklisted: true,
      providerReference: 'karma-email-1',
      responseCode: '200',
    });
  });

  test('2: identifies a blacklisted Nigerian phone number', async () => {
    nock(baseUrl)
      .get('/v2/verification/karma/%2B2348012345678')
      .reply(200, { status: 'success', data: { karma_identity: '+2348012345678' } });

    await expect(provider.check('+2348012345678')).resolves.toMatchObject({ blacklisted: true });
  });

  test('3: identifies a blacklisted BVN', async () => {
    nock(baseUrl)
      .get('/v2/verification/karma/22212345678')
      .reply(200, { status: 'success', data: { karma_identity: '22212345678' } });

    await expect(provider.check('22212345678')).resolves.toMatchObject({ blacklisted: true });
  });

  test('4: accepts provider 404 as a clear identity', async () => {
    nock(baseUrl).get('/v2/verification/karma/clear%40example.com').reply(404, {
      status: 'error',
      message: 'Identity not found',
    });

    await expect(provider.check('clear@example.com')).resolves.toEqual({
      blacklisted: false,
      responseCode: '404',
    });
  });

  test('5: fails closed for success response with no Karma identity', async () => {
    nock(baseUrl).get('/v2/verification/karma/ambiguous').reply(200, {
      status: 'success',
      data: {},
    });

    await expect(provider.check('ambiguous')).rejects.toMatchObject({
      code: 'ELIGIBILITY_CHECK_UNAVAILABLE',
    });
  });

  test('6: fails closed for a malformed response body', async () => {
    nock(baseUrl).get('/v2/verification/karma/malformed').reply(200, 'not-json-contract');

    await expect(provider.check('malformed')).rejects.toMatchObject({
      code: 'ELIGIBILITY_CHECK_UNAVAILABLE',
    });
  });

  test('7: fails closed when Adjutor times out', async () => {
    nock(baseUrl)
      .get('/v2/verification/karma/timeout')
      .delay(100)
      .reply(200, {
        status: 'success',
        data: { karma_identity: 'timeout' },
      });

    await expect(provider.check('timeout')).rejects.toMatchObject({
      code: 'ELIGIBILITY_CHECK_UNAVAILABLE',
    });
  });

  test('8: fails closed when the API key is rejected', async () => {
    nock(baseUrl).get('/v2/verification/karma/unauthorized').reply(401, {
      status: 'error',
      message: 'Unauthenticated',
    });

    await expect(provider.check('unauthorized')).rejects.toMatchObject({
      code: 'ELIGIBILITY_CHECK_UNAVAILABLE',
    });
  });

  test('9: fails closed when Adjutor rate-limits the request', async () => {
    nock(baseUrl).get('/v2/verification/karma/rate-limited').reply(429, {
      status: 'error',
      message: 'Too many requests',
    });

    await expect(provider.check('rate-limited')).rejects.toMatchObject({
      code: 'ELIGIBILITY_CHECK_UNAVAILABLE',
    });
  });

  test('10: fails closed for an Adjutor server error', async () => {
    nock(baseUrl).get('/v2/verification/karma/provider-error').reply(500, {
      status: 'error',
      message: 'Internal error',
    });

    await expect(provider.check('provider-error')).rejects.toMatchObject({
      code: 'ELIGIBILITY_CHECK_UNAVAILABLE',
    });
  });
});
