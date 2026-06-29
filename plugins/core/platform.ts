import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import appConfig from '../../config';
import { UpstreamRegistry } from '../../lib/http/upstream-registry';
import { MetricsStore } from '../../lib/observability/metrics-store';

/*
 * platform 插件的职责是：把“跨业务复用的平台对象”统一挂到 Fastify 实例上。
 *
 * Fastify 的 decorate 可以理解成“给 app 实例增加字段 / 能力”。
 * 这样做的好处是：
 * 1. 所有路由、插件、业务模块都能从 fastify 上拿到同一份平台能力。
 * 2. 不需要在业务代码里到处 import 单例，依赖关系更清晰。
 * 3. 测试时更容易替换或观察这些能力。
 */

const platformPlugin: FastifyPluginAsync = async (fastify) => {
    // 把监控和下游客户端统一挂到 Fastify 实例上，业务层按需使用。
    fastify.decorate('metricsStore', new MetricsStore());
    fastify.decorate('upstreamRegistry', new UpstreamRegistry(appConfig));
};

export default fp(platformPlugin, {
    name: 'platform',
});
