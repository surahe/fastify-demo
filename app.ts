import autoLoad from '@fastify/autoload'
import { randomUUID } from 'node:crypto'
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'
import { join } from 'node:path'
import appConfig from './config'
import { AppError, isAppError } from './errors/app-error'
import { ErrorCodes } from './errors/error-codes'
import corsPlugin from './plugins/core/cors'
import docsPlugin from './plugins/core/docs'
import observabilityPlugin from './plugins/core/observability'
import platformPlugin from './plugins/core/platform'
import rateLimitPlugin from './plugins/core/rate-limit'
import requestContextPlugin from './plugins/core/request-context'
import securityPlugin from './plugins/core/security'
import underPressurePlugin from './plugins/core/under-pressure'

// 显式告诉 autoload：当前运行时可以直接加载 .ts 插件文件。
process.env.FASTIFY_AUTOLOAD_TYPESCRIPT ??= '1'

interface BuildAppOptions {
    logger?: boolean
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
    const loggerEnabled = options.logger ?? appConfig.fastify.logger
    const app = Fastify({
        logger: loggerEnabled
            ? {
                  level: appConfig.fastify.logLevel
              }
            : false,
        trustProxy: appConfig.fastify.trustProxy,
        requestIdHeader: appConfig.fastify.requestIdHeader,
        genReqId: () => randomUUID(),
        ajv: {
            customOptions: {
                removeAdditional: 'all',
                coerceTypes: true
            }
        }
    })

    // core plugins 改为显式注册，顺序由这里控制，不再依赖文件名前缀。
    app.register(requestContextPlugin)
    app.register(securityPlugin)
    app.register(corsPlugin)
    app.register(platformPlugin)
    app.register(observabilityPlugin)
    app.register(rateLimitPlugin)
    app.register(docsPlugin)
    app.register(underPressurePlugin)

    // 自动注册 routes 插件，适合 BFF 里持续扩展接口模块。
    app.register(autoLoad, {
        dir: join(__dirname, 'plugins', 'routes'),
        dirNameRoutePrefix: false
    })

    app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
        request.log.error(
            {
                requestId: request.id,
                error
            },
            'request failed'
        )

        if (isAppError(error)) {
            reply.status(error.statusCode).send({
                success: false,
                code: error.code,
                message: error.message,
                requestId: request.id,
                details: error.expose ? error.details : undefined
            })
            return
        }

        if (error.validation) {
            reply.status(400).send({
                success: false,
                code: ErrorCodes.validation,
                message: error.message,
                requestId: request.id,
                details: error.validation
            })
            return
        }

        if (error.statusCode === 429) {
            reply.status(429).send({
                success: false,
                code: ErrorCodes.tooManyRequests,
                message: 'Too many requests',
                requestId: request.id
            })
            return
        }

        const statusCode = error.statusCode ?? 500
        reply.status(statusCode).send({
            success: false,
            code: ErrorCodes.internal,
            message: statusCode >= 500 ? 'Something went wrong' : error.message,
            requestId: request.id
        })
    })

    app.setNotFoundHandler((request, reply) => {
        reply.status(404).send({
            success: false,
            code: ErrorCodes.notFound,
            message: 'Route not found',
            requestId: request.id
        })
    })

    return app
}

export default buildApp
