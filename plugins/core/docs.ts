import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import appConfig from '../../config'

/*
 * 这个插件负责生成 OpenAPI 文档和 Swagger UI。
 *
 * 为什么学习阶段要保留文档插件：
 * 1. Fastify 的 schema 不只是做校验，还能顺手生成接口文档，这一点很值得理解。
 * 2. 前后端联调时，有一个可视化入口会比只看代码更高效。
 * 3. 文档和 schema 共用一份定义，可以减少“文档写了但接口没按文档实现”的偏差。
 */

const docsPlugin: FastifyPluginAsync = async (fastify) => {
    if (!appConfig.docs.enabled) {
        // 通过配置开关控制文档是否启用，避免把调试入口默认暴露到生产环境。
        return
    }

    await fastify.register(swagger, {
        openapi: {
            openapi: '3.0.3',
            info: {
                title: 'fastify-demo API',
                description: 'Minimal BFF learning template for live streaming scenarios.',
                version: '1.0.0'
            },
            servers: [
                {
                    url: `http://localhost:${appConfig.server.port}`,
                    description: 'Local development server'
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        // 这里只是在文档层告诉调用方：接口可能使用 Bearer Token。
                        // 真实鉴权判定仍然由后端完成，BFF 当前只负责透传。
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'Bearer token'
                    }
                }
            }
        }
    })

    await fastify.register(swaggerUi, {
        // Swagger UI 是给人看的网页入口，所以 routePrefix 交给配置控制更灵活。
        routePrefix: appConfig.docs.routePrefix,
        uiConfig: {
            docExpansion: 'list',
            deepLinking: false
        },
        staticCSP: false
    })
}

export default fp(docsPlugin, {
    name: 'docs'
})
