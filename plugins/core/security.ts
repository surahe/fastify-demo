import helmet from '@fastify/helmet';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/*
 * 这个插件负责补安全响应头。
 *
 * 为什么放在 core plugin：
 * 1. 安全头是全站能力，不应该由每条路由自己加。
 * 2. 统一注册后，新接口天然继承这些保护，不容易漏。
 * 3. 安全策略通常和业务无关，放在平台层最合适。
 */

const securityPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(helmet, {
        global: true,
        // 这里关闭 CSP，是因为学习项目和 Swagger UI 在本地开发时更容易受 CSP 影响。
        // 真实项目上线前，通常要结合前端资源加载方式重新评估 CSP 策略。
        contentSecurityPolicy: false,
    });
};

export default fp(securityPlugin, {
    name: 'security',
});
