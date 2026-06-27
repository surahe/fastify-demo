import underPressure from '@fastify/under-pressure'
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import appConfig from '../../config'

const underPressurePlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(underPressure, {
        exposeStatusRoute: false,
        maxEventLoopDelay: appConfig.underPressure.maxEventLoopDelay,
        maxHeapUsedBytes: appConfig.underPressure.maxHeapUsedBytes,
        maxRssBytes: appConfig.underPressure.maxRssBytes,
        maxEventLoopUtilization: appConfig.underPressure.maxEventLoopUtilization,
        retryAfter: appConfig.underPressure.retryAfter,
        pressureHandler(request, reply, type, value) {
            request.log.warn(
                {
                    requestId: request.id,
                    pressureType: type,
                    pressureValue: value
                },
                'service is under pressure'
            )

            reply.status(503).send({
                success: false,
                code: 'SERVICE_UNAVAILABLE',
                message: 'Service is under pressure, please retry later',
                requestId: request.id
            })
        }
    })
}

export default fp(underPressurePlugin, {
    name: 'under-pressure'
})
