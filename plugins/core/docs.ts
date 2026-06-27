import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import appConfig from '../../config'

const docsPlugin: FastifyPluginAsync = async (fastify) => {
    if (!appConfig.docs.enabled) {
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
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'Bearer token'
                    }
                }
            }
        }
    })

    await fastify.register(swaggerUi, {
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
