import nock from 'nock';
import { AdjutorKarmaProvider } from '../../src/modules/karma/adjutor-karma.provider.js';
describe('AdjutorKarmaProvider', () => {
  const provider = new AdjutorKarmaProvider('https://adjutor.lendsqr.com', 'secret', 100);
  afterEach(() => nock.cleanAll());
  test('reports blacklisted response', async () => {
    nock('https://adjutor.lendsqr.com', { reqheaders: { authorization: 'Bearer secret' } })
      .get('/v2/verification/karma/bad%40example.com')
      .reply(200, { status: 'success', data: { karma_identity: true, id: 'ref' } });
    await expect(provider.check('bad@example.com')).resolves.toMatchObject({ blacklisted: true });
  });
  test('treats 404 as clear per documented adapter assumption', async () => {
    nock('https://adjutor.lendsqr.com')
      .get('/v2/verification/karma/clear%40example.com')
      .reply(404);
    await expect(provider.check('clear@example.com')).resolves.toEqual({
      blacklisted: false,
      responseCode: '404',
    });
  });
  test('fails closed on ambiguous response', async () => {
    nock('https://adjutor.lendsqr.com')
      .get('/v2/verification/karma/x')
      .reply(200, { unexpected: true });
    await expect(provider.check('x')).rejects.toMatchObject({
      code: 'ELIGIBILITY_CHECK_UNAVAILABLE',
    });
  });
});
