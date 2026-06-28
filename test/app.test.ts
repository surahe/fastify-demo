import assert from 'node:assert/strict';
import test from 'node:test';
import buildApp from '../app';

function createTestApp() {
    return buildApp({ logger: false });
}

test('GET /health returns ok status', async () => {
    const app = createTestApp();

    const response = await app.inject({
        method: 'GET',
        url: '/health',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, 'ok');

    await app.close();
});

test('GET /readiness returns ready status', async () => {
    const app = createTestApp();

    const response = await app.inject({
        method: 'GET',
        url: '/readiness',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, 'ready');

    await app.close();
});

test('GET /metrics returns basic metrics snapshot', async () => {
    const app = createTestApp();

    await app.inject({
        method: 'GET',
        url: '/health',
    });

    const response = await app.inject({
        method: 'GET',
        url: '/metrics',
    });

    assert.equal(response.statusCode, 200);
    assert.ok(response.json().metrics.totals.requests >= 1);

    await app.close();
});

test('GET /docs returns swagger ui in non-production environments', async () => {
    const app = createTestApp();

    const response = await app.inject({
        method: 'GET',
        url: '/docs',
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers['content-type'] || '', /text\/html/);

    await app.close();
});

test('GET /api/live/rooms/:roomId/aggregate supports degraded response', async () => {
    const app = createTestApp();

    const response = await app.inject({
        method: 'GET',
        url: '/api/live/rooms/room-1/aggregate?failSegments=coupon,recommendation',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().code, 'PARTIAL_SUCCESS');
    assert.equal(response.json().degradation.degraded, true);
    assert.equal(response.json().data.coupon.available, false);

    await app.close();
});

test('GET /api/live/rooms/:roomId/aggregate returns complete data by default', async () => {
    const app = createTestApp();

    const response = await app.inject({
        method: 'GET',
        url: '/api/live/rooms/room-1/aggregate',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().code, 'OK');
    assert.equal(response.json().degradation.degraded, false);

    await app.close();
});

test('returns 404 for unknown routes', async () => {
    const app = createTestApp();

    const response = await app.inject({
        method: 'GET',
        url: '/not-found',
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, 'NOT_FOUND');
    assert.equal(response.json().message, 'Route not found');

    await app.close();
});
