import underPressure from '@fastify/under-pressure';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import appConfig from '../../config';
import { LOG_EVENTS } from '../../lib/observability/log-events';

/*
 * under-pressure 插件负责“过载保护”。
 *
 * 为什么要有它：
 * 1. 服务已经很忙的时候，继续硬扛请求只会让超时和雪崩更严重。
 * 2. 与其让所有请求都慢慢拖死，不如尽早返回 503，给调用方明确反馈。
 * 3. 这也是保护下游的一种方式，因为过载时继续发请求通常只会放大问题。
 */

const underPressurePlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(underPressure, {
        exposeStatusRoute: false,
        maxEventLoopDelay: appConfig.underPressure.maxEventLoopDelay,
        maxHeapUsedBytes: appConfig.underPressure.maxHeapUsedBytes,
        maxRssBytes: appConfig.underPressure.maxRssBytes,
        maxEventLoopUtilization: appConfig.underPressure.maxEventLoopUtilization,
        retryAfter: appConfig.underPressure.retryAfter,
        pressureHandler(request, reply, type, value) {
            // 一旦触发过载，先打 warning 日志，方便后续定位到底是哪种资源先到阈值。
            request.log.warn(
                {
                    event: LOG_EVENTS.SERVICE_UNDER_PRESSURE,
                    requestId: request.id,
                    pressureType: type,
                    pressureValue: value,
                },
                'service is under pressure',
            );

            // 这里主动返回 503，而不是继续把请求交给业务层处理。
            // 原因是服务已经不健康，再进入业务只会让整体情况更糟。
            reply.status(503).send({
                success: false,
                code: 'SERVICE_UNAVAILABLE',
                message: 'Service is under pressure, please retry later',
                requestId: request.id,
            });
        },
    });
};

export default fp(underPressurePlugin, {
    name: 'under-pressure',
});
