import helmet from '@fastify/helmet';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import appConfig from '../../config';

/*
 * 这个插件负责补安全响应头。
 *
 * 为什么放在 core plugin：
 * 1. 安全头是全站能力，不应该由每条路由自己加。
 * 2. 统一注册后，新接口天然继承这些保护，不容易漏。
 * 3. 安全策略通常和业务无关，放在平台层最合适。
 */

const securityPlugin: FastifyPluginAsync = async (fastify) => {
    const isDevelopment = appConfig.env === 'development';

    await fastify.register(helmet, {
        global: true,
        // 开发环境优先保证 Swagger UI 和本地联调体验，其它环境恢复 Helmet 默认 CSP。
        contentSecurityPolicy: isDevelopment ? false : undefined,
    });
};

export default fp(securityPlugin, {
    name: 'security',
});
