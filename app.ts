import autoLoad from '@fastify/autoload';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import appConfig from './config';
import { AppError, isAppError } from './errors/app-error';
import { ErrorCodes } from './errors/error-codes';
import corsPlugin from './plugins/core/cors';
import docsPlugin from './plugins/core/docs';
import observabilityPlugin from './plugins/core/observability';
import platformPlugin from './plugins/core/platform';
import rateLimitPlugin from './plugins/core/rate-limit';
import requestContextPlugin from './plugins/core/request-context';
import securityPlugin from './plugins/core/security';
import underPressurePlugin from './plugins/core/under-pressure';

/*
 * 这是整个应用真正的“组装中心”。
 *
 * 为什么需要单独有 app.ts，而不是直接在 server.ts 里把所有逻辑写完：
 * 1. server.ts 只关心“启动”，app.ts 只关心“怎么组装应用”，职责更清晰。
 * 2. 测试时可以直接调用 buildApp() 拿到 Fastify 实例，不需要真的监听端口。
 * 3. 后续新增插件或调整注册顺序时，只改这里就够了，入口文件不会越来越乱。
 */

// 显式告诉 autoload：当前运行时可以直接加载 .ts 插件文件。
process.env.FASTIFY_AUTOLOAD_TYPESCRIPT ??= '1';

interface BuildAppOptions {
    logger?: boolean;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
    const loggerEnabled = options.logger ?? appConfig.fastify.logger;

    // 这里创建 Fastify 实例，并把和“整站行为”相关的底层选项一次性定下来。
    // 这些选项比具体业务更底层，所以放在应用初始化阶段最合适。
    const app = Fastify({
        logger: loggerEnabled
            ? {
                  // 日志级别统一来自配置中心，避免散落硬编码。
                  level: appConfig.fastify.logLevel,
              }
            : false,
        // trustProxy 让 Fastify 在有网关 / 反向代理时，正确识别真实客户端信息。
        trustProxy: appConfig.fastify.trustProxy,
        // requestIdHeader 用来告诉 Fastify：请求 ID 优先从哪个 header 中读取。
        requestIdHeader: appConfig.fastify.requestIdHeader,
        // 如果前面没有透传 requestId，就在这里生成一个新的，保证每个请求都能被追踪。
        genReqId: () => randomUUID(),
        ajv: {
            customOptions: {
                // 去掉 schema 未声明的额外字段，避免无意义参数继续流入业务层。
                removeAdditional: 'all',
                // 把 "123" 这种字符串自动转成 number / boolean 等，更适合处理 HTTP 入参。
                coerceTypes: true,
            },
        },
    });

    // core plugins 改为显式注册，顺序由这里控制，不再依赖文件名前缀。
    // 这样做的原因是：插件顺序本身就是系统行为的一部分，写在这里最直观。
    app.register(requestContextPlugin);
    app.register(securityPlugin);
    app.register(corsPlugin);
    app.register(platformPlugin);
    app.register(observabilityPlugin);
    app.register(rateLimitPlugin);
    app.register(docsPlugin);
    app.register(underPressurePlugin);

    // 自动注册 routes 插件，适合 BFF 里持续扩展接口模块。
    // 这里和 core plugin 不同：业务路由会越来越多，所以更适合用 autoload 自动发现。
    app.register(autoLoad, {
        dir: join(__dirname, 'plugins', 'routes'),
        dirNameRoutePrefix: false,
    });

    // 统一错误处理器的意义是：不管错误来自 schema、业务、下游还是平台插件，
    // 最终都在这里收口成一致的响应格式，前端和日志都更容易处理。
    app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
        request.log.error(
            {
                requestId: request.id,
                error,
            },
            'request failed',
        );

        if (isAppError(error)) {
            reply.status(error.statusCode).send({
                success: false,
                code: error.code,
                message: error.message,
                requestId: request.id,
                details: error.expose ? error.details : undefined,
            });
            return;
        }

        if (error.validation) {
            // Fastify / AJV 的 schema 校验错误会走到这里。
            // 单独拦出来的原因是：这类错误属于“客户端传错参数”，语义上是 400。
            reply.status(400).send({
                success: false,
                code: ErrorCodes.validation,
                message: error.message,
                requestId: request.id,
                details: error.validation,
            });
            return;
        }

        if (error.statusCode === 429) {
            // 429 大多来自限流插件。这里单独转成统一响应结构，避免前端收到格式不一致的错误体。
            reply.status(429).send({
                success: false,
                code: ErrorCodes.tooManyRequests,
                message: 'Too many requests',
                requestId: request.id,
            });
            return;
        }

        const statusCode = error.statusCode ?? 500;

        // 剩下的错误统一走兜底逻辑：
        // - 5xx 不暴露实现细节，避免把内部错误直接泄漏给前端
        // - 4xx 可以保留错误消息，因为它通常和用户输入有关
        reply.status(statusCode).send({
            success: false,
            code: ErrorCodes.internal,
            message: statusCode >= 500 ? 'Something went wrong' : error.message,
            requestId: request.id,
        });
    });

    // 未匹配到路由时，统一返回标准 404 结构。
    // 这样前端不需要区分“业务错误响应”和“路由不存在响应”的数据格式。
    app.setNotFoundHandler((request, reply) => {
        reply.status(404).send({
            success: false,
            code: ErrorCodes.notFound,
            message: 'Route not found',
            requestId: request.id,
        });
    });

    return app;
}

export default buildApp;
