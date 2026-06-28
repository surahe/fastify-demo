import dotenv from 'dotenv';
import { z } from 'zod';

/*
 * 这一层负责“配置收口”。
 *
 * 为什么 BFF 项目要专门做一层配置模块：
 * 1. 环境变量本质上都是字符串，直接在业务里读容易到处做类型转换。
 * 2. 把校验集中到这里，启动时就能尽早发现配置错误，而不是运行到一半才报错。
 * 3. 对外统一输出 appConfig，业务代码就不需要知道环境变量原名是什么。
 */

// 启动时优先读取 .env，后面的 zod 校验直接消费 process.env。
dotenv.config();

export type AppEnv = 'development' | 'test' | 'production';

// AppConfig 是“项目内部真正使用的配置结构”。
// 你可以把它理解成：所有环境变量在经过校验、转换、整理之后，最终会变成什么样子。
//
// 为什么这里还要再定义一层 interface，而不是直接 everywhere 用 process.env：
// 1. process.env 里的值原始上几乎都是字符串，不适合直接在业务里使用。
// 2. 代码里真正关心的是“这个配置表示什么”，而不是“它原始环境变量名叫什么”。
// 3. 有了这层结构定义后，IDE 会给出更清晰的类型提示，后续维护也更稳定。
export interface AppConfig {
    // env 用来区分不同运行环境，很多开关都会依赖它。
    env: AppEnv;
    server: {
        // host / port 决定 HTTP 服务监听在哪个地址和端口上。
        host: string;
        port: number;
    };
    fastify: {
        // fastify 这组配置不是业务配置，而是框架自身行为的配置。
        logger: boolean;
        logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
        requestIdHeader: string;
        trustProxy: boolean;
    };
    cors: {
        // 浏览器跨域白名单，代码里用数组最方便，所以最终会整理成 string[]。
        allowedOrigins: string[];
    };
    rateLimit: {
        // 限流属于平台保护能力，用来限制单位时间内允许的请求量。
        globalMax: number;
        timeWindow: string;
    };
    docs: {
        // docs 控制 Swagger / OpenAPI 文档是否开启，以及暴露在哪个路径。
        enabled: boolean;
        routePrefix: string;
    };
    underPressure: {
        // underPressure 这一组控制“服务过载时”的保护策略。
        retryAfter: number;
        maxEventLoopDelay: number;
        maxHeapUsedBytes: number;
        maxRssBytes: number;
        maxEventLoopUtilization: number;
    };
    cache: {
        // 当前项目虽然不接 Redis，但仍然保留了一个本地内存缓存能力，所以这里要有缓存 TTL 配置。
        ttlMs: number;
    };
    upstreamDefaults: {
        // 这组是“调用后端服务时的默认策略”，属于 BFF 非常关键的基础配置。
        timeoutMs: number;
        retries: number;
        retryDelayMs: number;
        circuitBreakerThreshold: number;
        circuitBreakerResetMs: number;
    };
    upstream: {
        // 这里是真实后端服务的地址入口。
        // 当前示例里只预留了 live / trade 两个服务，后续可按真实需求继续扩。
        liveApiBaseUrl?: string;
        tradeApiBaseUrl?: string;
    };
}

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 3000;

// 下面这些 xxxEnvSchema 可以理解成“各个配置分组自己的校验规则”。
//
// 为什么要拆成这么多小 schema：
// 1. 读代码时更容易知道“这一组配置是干什么的”。
// 2. 后续新增配置时，不会把所有逻辑都塞进一个巨大的对象里。
// 3. 对新手来说，也更容易把“server 配置”“docs 配置”“下游配置”分别理解。
//
// 这里要特别理解：这些 schema 还不是最终给业务使用的配置对象，
// 它们只是“环境变量校验规则”。
const appEnvSchema = z.object({
    // NODE_ENV 限制运行环境只能是这三个值之一。
    // default('development') 表示如果没配，就默认按开发环境处理。
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const serverEnvSchema = z.object({
    // HOST 是服务监听地址。0.0.0.0 通常表示监听所有网卡，适合本地开发和容器部署。
    HOST: z.string().trim().min(1).default(DEFAULT_HOST),
    // z.coerce.number() 的意思是：就算环境变量原本是字符串，也先帮你转成 number 再校验。
    // int().positive() 则是在保证它必须是一个正整数端口号。
    PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
});

const fastifyEnvSchema = z.object({
    // 这一组控制 Fastify 本身的运行行为，而不是你的业务接口逻辑。
    // LOG_LEVEL 控制日志打印详细程度。开发阶段通常用 info / debug，生产更关注 warn / error。
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    // REQUEST_ID_HEADER 表示：如果上游网关或前端已经带了请求 ID，Fastify 应该从哪个 header 读取它。
    // 默认用 x-request-id，是很多系统里比较常见的约定。
    REQUEST_ID_HEADER: z.string().trim().min(1).default('x-request-id'),
    // TRUST_PROXY 表示是否信任反向代理透传过来的客户端信息。
    // 如果前面有 Nginx、网关、Ingress，这个开关通常要开。
    TRUST_PROXY: z.coerce.boolean().default(true),
});

const corsEnvSchema = z.object({
    // 这里保留字符串格式，是因为环境变量里写逗号分隔最方便；
    // 真正给代码用时，会在后面再转成数组。
    CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
});

const rateLimitEnvSchema = z.object({
    // RATE_LIMIT_MAX 表示在一个时间窗口内，最多允许多少次请求通过。
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    // RATE_LIMIT_WINDOW 表示限流统计窗口，比如 1 minute、10 seconds 这种格式。
    RATE_LIMIT_WINDOW: z.string().trim().min(1).default('1 minute'),
});

const docsEnvSchema = z.object({
    // 文档相关配置先在这里校验，后面 appConfig 阶段还会再叠加“生产环境默认关闭”的项目约定。
    // SWAGGER_ENABLED 只是“是否允许开启文档”的原始开关，不代表最终一定会开启。
    SWAGGER_ENABLED: z.coerce.boolean().default(true),
    // SWAGGER_ROUTE_PREFIX 是 Swagger UI 的访问路径。
    // 默认是 /docs，所以本地一般访问 http://localhost:3000/docs
    SWAGGER_ROUTE_PREFIX: z.string().trim().min(1).default('/docs'),
});

const underPressureEnvSchema = z.object({
    // under-pressure 用来保护服务在事件循环、内存等指标过高时及时降级或拒绝流量。
    // RETRY_AFTER 告诉调用方：服务过载后建议多少秒后再重试。
    UNDER_PRESSURE_RETRY_AFTER: z.coerce.number().int().positive().default(30),
    // MAX_EVENT_LOOP_DELAY 用来限制事件循环延迟，过高说明 Node 主线程太忙。
    UNDER_PRESSURE_MAX_EVENT_LOOP_DELAY: z.coerce.number().int().positive().default(1_000),
    // MAX_HEAP_USED_BYTES 控制 V8 堆内存阈值；0 表示当前不启用这个阈值。
    UNDER_PRESSURE_MAX_HEAP_USED_BYTES: z.coerce.number().int().min(0).default(0),
    // MAX_RSS_BYTES 控制进程总占用内存阈值；0 表示当前不启用这个阈值。
    UNDER_PRESSURE_MAX_RSS_BYTES: z.coerce.number().int().min(0).default(0),
    // MAX_EVENT_LOOP_UTILIZATION 控制事件循环利用率阈值，越接近 1 说明越繁忙。
    UNDER_PRESSURE_MAX_EVENT_LOOP_UTILIZATION: z.coerce.number().min(0).max(1).default(0.98),
});

const cacheEnvSchema = z.object({
    // 当前是本地缓存 TTL。即使未来不接 Redis，这个配置也能控制内存缓存保留多久。
    CACHE_TTL_MS: z.coerce.number().int().positive().default(30_000),
});

const upstreamDefaultsEnvSchema = z.object({
    // 这一组是 BFF 调后端服务时最关键的默认策略：
    // 超时多久、失败后是否重试、多久重试一次、连续失败多少次后打开熔断器。
    // TIMEOUT_MS 表示单次下游请求最多等多久，超过就按超时处理。
    UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(1_500),
    // RETRIES 表示失败后最多自动再试几次。0 表示不重试。
    UPSTREAM_RETRIES: z.coerce.number().int().min(0).default(1),
    // RETRY_DELAY_MS 表示两次重试之间的间隔，避免失败后立刻疯狂重打下游。
    UPSTREAM_RETRY_DELAY_MS: z.coerce.number().int().positive().default(200),
    // CIRCUIT_BREAKER_THRESHOLD 表示连续失败多少次后，把熔断器切到 open。
    UPSTREAM_CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().int().positive().default(5),
    // CIRCUIT_BREAKER_RESET_MS 表示熔断器打开后，要过多久才允许再试探一次。
    UPSTREAM_CIRCUIT_BREAKER_RESET_MS: z.coerce.number().int().positive().default(10_000),
});

const upstreamEnvSchema = z.object({
    // 这里是具体后端服务地址。
    // optional() 表示它可以不填，这样本地开发时可以只接一部分后端。
    // LIVE_API_BASE_URL 是直播相关后端服务的基础地址。
    LIVE_API_BASE_URL: z.string().trim().optional(),
    // TRADE_API_BASE_URL 是交易相关后端服务的基础地址。
    TRADE_API_BASE_URL: z.string().trim().optional(),
});

// 对外仍然保留一个统一入口，方便 parse(process.env) 时一次完成校验。
// 这一步相当于把“分域维护”和“统一校验”两个目标同时兼顾了。
const envSchema = z.object({
    ...appEnvSchema.shape,
    ...serverEnvSchema.shape,
    ...fastifyEnvSchema.shape,
    ...corsEnvSchema.shape,
    ...rateLimitEnvSchema.shape,
    ...docsEnvSchema.shape,
    ...underPressureEnvSchema.shape,
    ...cacheEnvSchema.shape,
    ...upstreamDefaultsEnvSchema.shape,
    ...upstreamEnvSchema.shape,
});

const envValues = envSchema.parse(process.env);
const env: AppEnv = envValues.NODE_ENV;

// 这里开始从“环境变量校验结果 envValues”转换成“项目内部统一配置 appConfig”。
//
// 这一步为什么还要再做一次整理，而不是直接把 envValues 导出去：
// 1. envValues 更像“校验后的原始变量集合”，名字仍然是 HOST / PORT 这种环境变量风格。
// 2. appConfig 更像“项目内部真正消费的配置对象”，结构化更强，也更好理解。
// 3. 这一步可以顺手做一些项目级约定，比如字符串拆分、空字符串转 undefined、生产环境禁用 docs。
const appConfig: AppConfig = {
    // env 是整个项目里最基础的环境标识，很多运行期开关都会依赖它。
    env,
    server: {
        // host 决定服务实际监听在哪个地址。
        host: envValues.HOST,
        // port 决定服务监听端口。
        port: envValues.PORT,
    },
    fastify: {
        // 测试环境通常关闭 logger，避免测试输出过于吵杂。
        logger: env !== 'test',
        // logLevel 直接继承校验后的日志级别。
        logLevel: envValues.LOG_LEVEL,
        // requestIdHeader 告诉 Fastify 去哪个 header 里找现成的 requestId。
        requestIdHeader: envValues.REQUEST_ID_HEADER,
        // trustProxy 决定 Fastify 是否信任代理透传来的客户端信息。
        trustProxy: envValues.TRUST_PROXY,
    },
    cors: {
        // 配置文件里用逗号分隔最方便书写，这里统一转换成代码更容易消费的 string[]。
        allowedOrigins: envValues.CORS_ALLOWED_ORIGINS.split(',')
            .map((item) => item.trim())
            .filter(Boolean),
    },
    rateLimit: {
        // globalMax 是整站限流阈值。
        globalMax: envValues.RATE_LIMIT_MAX,
        // timeWindow 是整站限流时间窗口。
        timeWindow: envValues.RATE_LIMIT_WINDOW,
    },
    docs: {
        // Swagger 在本地 / 测试环境很有价值，但生产环境默认关闭更安全。
        // 所以这里不是单纯读取环境变量，而是附带了一条“项目约定规则”。
        enabled: envValues.SWAGGER_ENABLED && env !== 'production',
        // routePrefix 是 Swagger UI 的最终访问路径前缀。
        routePrefix: envValues.SWAGGER_ROUTE_PREFIX,
    },
    underPressure: {
        // retryAfter 是过载时建议客户端重试的等待秒数。
        retryAfter: envValues.UNDER_PRESSURE_RETRY_AFTER,
        // maxEventLoopDelay 是事件循环延迟阈值。
        maxEventLoopDelay: envValues.UNDER_PRESSURE_MAX_EVENT_LOOP_DELAY,
        // maxHeapUsedBytes 是堆内存使用阈值。
        maxHeapUsedBytes: envValues.UNDER_PRESSURE_MAX_HEAP_USED_BYTES,
        // maxRssBytes 是进程总内存占用阈值。
        maxRssBytes: envValues.UNDER_PRESSURE_MAX_RSS_BYTES,
        // maxEventLoopUtilization 是事件循环利用率阈值。
        maxEventLoopUtilization: envValues.UNDER_PRESSURE_MAX_EVENT_LOOP_UTILIZATION,
    },
    cache: {
        // ttlMs 是本地缓存默认保留时间，单位是毫秒。
        ttlMs: envValues.CACHE_TTL_MS,
    },
    upstreamDefaults: {
        // timeoutMs 是所有下游请求默认超时时间。
        timeoutMs: envValues.UPSTREAM_TIMEOUT_MS,
        // retries 是所有下游请求默认重试次数。
        retries: envValues.UPSTREAM_RETRIES,
        // retryDelayMs 是默认重试间隔。
        retryDelayMs: envValues.UPSTREAM_RETRY_DELAY_MS,
        // circuitBreakerThreshold 是默认熔断触发阈值。
        circuitBreakerThreshold: envValues.UPSTREAM_CIRCUIT_BREAKER_THRESHOLD,
        // circuitBreakerResetMs 是默认熔断恢复探测时间。
        circuitBreakerResetMs: envValues.UPSTREAM_CIRCUIT_BREAKER_RESET_MS,
    },
    upstream: {
        // 空字符串统一转成 undefined，避免下游注册逻辑把“空地址”当成有效配置。
        // 这样写后，后面的 UpstreamRegistry 就可以通过 if (baseUrl) 这种方式判断是否需要注册该下游。
        liveApiBaseUrl: envValues.LIVE_API_BASE_URL || undefined,
        tradeApiBaseUrl: envValues.TRADE_API_BASE_URL || undefined,
    },
};

export default appConfig;
