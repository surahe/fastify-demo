import 'fastify';
import type { UpstreamRegistry } from '../lib/http/upstream-registry';
import type { MetricsStore } from '../lib/observability/metrics-store';

/*
 * 这是 TypeScript 的模块扩展声明。
 *
 * 为什么需要它：
 * 1. platform 插件里用 fastify.decorate 给实例挂了新字段。
 * 2. 如果没有这里的声明，TypeScript 不知道 fastify.metricsStore 这些字段存在。
 * 3. 这样写完后，业务代码里拿这些能力会有完整的类型提示。
 */

declare module 'fastify' {
    interface FastifyInstance {
        metricsStore: MetricsStore;
        upstreamRegistry: UpstreamRegistry;
    }
}
