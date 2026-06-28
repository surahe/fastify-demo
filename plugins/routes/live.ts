import type { FastifyPluginAsync } from 'fastify'
import liveRoutes from '../../modules/live/live.routes'

/*
 * 这是“业务模块入口插件”。
 *
 * 为什么还要多这一层，而不是直接在 app.ts 里注册 modules/live：
 * 1. app.ts 只关心平台装配，不直接感知每个业务模块的细节。
 * 2. 通过 plugins/routes 这一层，可以统一控制业务模块前缀和加载方式。
 * 3. 以后业务模块变多时，结构会更整齐：平台插件在 core，业务入口在 routes。
 */

const livePlugin: FastifyPluginAsync = async (fastify) => {
    // 这里给整个 live 模块挂上统一前缀，模块内部就只需要关心自己的相对路径。
    await fastify.register(liveRoutes, { prefix: '/api/live' })
}

export default livePlugin
