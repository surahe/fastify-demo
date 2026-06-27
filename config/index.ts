import dotenv from 'dotenv'
import { z } from 'zod'

// 启动时优先读取 .env，后面的 zod 校验直接消费 process.env。
dotenv.config()

export type AppEnv = 'development' | 'test' | 'production'

export interface AppConfig {
    env: AppEnv
    server: {
        host: string
        port: number
    }
    fastify: {
        logger: boolean
        logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
        requestIdHeader: string
        trustProxy: boolean
    }
    cors: {
        allowedOrigins: string[]
    }
    rateLimit: {
        globalMax: number
        timeWindow: string
    }
    docs: {
        enabled: boolean
        routePrefix: string
    }
    underPressure: {
        retryAfter: number
        maxEventLoopDelay: number
        maxHeapUsedBytes: number
        maxRssBytes: number
        maxEventLoopUtilization: number
    }
    cache: {
        ttlMs: number
    }
    upstreamDefaults: {
        timeoutMs: number
        retries: number
        retryDelayMs: number
        circuitBreakerThreshold: number
        circuitBreakerResetMs: number
    }
    upstream: {
        liveApiBaseUrl?: string
        tradeApiBaseUrl?: string
    }
}

const DEFAULT_HOST = '0.0.0.0'
const DEFAULT_PORT = 3000

// 先按配置域拆成多个小 schema，后面再合并成统一的 envSchema。
const appEnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
})

const serverEnvSchema = z.object({
    HOST: z.string().trim().min(1).default(DEFAULT_HOST),
    PORT: z.coerce.number().int().positive().default(DEFAULT_PORT)
})

const fastifyEnvSchema = z.object({
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    REQUEST_ID_HEADER: z.string().trim().min(1).default('x-request-id'),
    TRUST_PROXY: z.coerce.boolean().default(true)
})

const corsEnvSchema = z.object({
    CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173')
})

const rateLimitEnvSchema = z.object({
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_WINDOW: z.string().trim().min(1).default('1 minute')
})

const docsEnvSchema = z.object({
    SWAGGER_ENABLED: z.coerce.boolean().default(true),
    SWAGGER_ROUTE_PREFIX: z.string().trim().min(1).default('/docs')
})

const underPressureEnvSchema = z.object({
    UNDER_PRESSURE_RETRY_AFTER: z.coerce.number().int().positive().default(30),
    UNDER_PRESSURE_MAX_EVENT_LOOP_DELAY: z.coerce.number().int().positive().default(1_000),
    UNDER_PRESSURE_MAX_HEAP_USED_BYTES: z.coerce.number().int().min(0).default(0),
    UNDER_PRESSURE_MAX_RSS_BYTES: z.coerce.number().int().min(0).default(0),
    UNDER_PRESSURE_MAX_EVENT_LOOP_UTILIZATION: z.coerce.number().min(0).max(1).default(0.98)
})

const cacheEnvSchema = z.object({
    CACHE_TTL_MS: z.coerce.number().int().positive().default(30_000)
})

const upstreamDefaultsEnvSchema = z.object({
    UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(1_500),
    UPSTREAM_RETRIES: z.coerce.number().int().min(0).default(1),
    UPSTREAM_RETRY_DELAY_MS: z.coerce.number().int().positive().default(200),
    UPSTREAM_CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().int().positive().default(5),
    UPSTREAM_CIRCUIT_BREAKER_RESET_MS: z.coerce.number().int().positive().default(10_000)
})

const upstreamEnvSchema = z.object({
    LIVE_API_BASE_URL: z.string().trim().optional(),
    TRADE_API_BASE_URL: z.string().trim().optional()
})

// 对外仍然保留一个统一入口，方便 parse(process.env) 时一次完成校验。
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
    ...upstreamEnvSchema.shape
})

const envValues = envSchema.parse(process.env)
const env: AppEnv = envValues.NODE_ENV

// 对外只暴露整理后的配置对象，业务代码不直接读取 process.env。
const appConfig: AppConfig = {
    env,
    server: {
        host: envValues.HOST,
        port: envValues.PORT
    },
    fastify: {
        logger: env !== 'test',
        logLevel: envValues.LOG_LEVEL,
        requestIdHeader: envValues.REQUEST_ID_HEADER,
        trustProxy: envValues.TRUST_PROXY
    },
    cors: {
        allowedOrigins: envValues.CORS_ALLOWED_ORIGINS.split(',')
            .map((item) => item.trim())
            .filter(Boolean)
    },
    rateLimit: {
        globalMax: envValues.RATE_LIMIT_MAX,
        timeWindow: envValues.RATE_LIMIT_WINDOW
    },
    docs: {
        enabled: envValues.SWAGGER_ENABLED && env !== 'production',
        routePrefix: envValues.SWAGGER_ROUTE_PREFIX
    },
    underPressure: {
        retryAfter: envValues.UNDER_PRESSURE_RETRY_AFTER,
        maxEventLoopDelay: envValues.UNDER_PRESSURE_MAX_EVENT_LOOP_DELAY,
        maxHeapUsedBytes: envValues.UNDER_PRESSURE_MAX_HEAP_USED_BYTES,
        maxRssBytes: envValues.UNDER_PRESSURE_MAX_RSS_BYTES,
        maxEventLoopUtilization: envValues.UNDER_PRESSURE_MAX_EVENT_LOOP_UTILIZATION
    },
    cache: {
        ttlMs: envValues.CACHE_TTL_MS
    },
    upstreamDefaults: {
        timeoutMs: envValues.UPSTREAM_TIMEOUT_MS,
        retries: envValues.UPSTREAM_RETRIES,
        retryDelayMs: envValues.UPSTREAM_RETRY_DELAY_MS,
        circuitBreakerThreshold: envValues.UPSTREAM_CIRCUIT_BREAKER_THRESHOLD,
        circuitBreakerResetMs: envValues.UPSTREAM_CIRCUIT_BREAKER_RESET_MS
    },
    upstream: {
        liveApiBaseUrl: envValues.LIVE_API_BASE_URL || undefined,
        tradeApiBaseUrl: envValues.TRADE_API_BASE_URL || undefined
    }
}

export default appConfig
