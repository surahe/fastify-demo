import { ErrorCodes, type ErrorCode } from './error-codes';

/*
 * 这里定义项目里的“统一错误模型”。
 *
 * 为什么要封装成 AppError，而不是直接 throw new Error():
 * 1. 原生 Error 不带 HTTP statusCode，到了响应层还得额外判断。
 * 2. BFF 往往需要把错误码、是否暴露细节、附加信息一起带出去。
 * 3. 统一错误类型后，app.ts 可以在一个地方把所有业务错误收口。
 */

export interface AppErrorOptions {
    statusCode: number;
    code: ErrorCode;
    message: string;
    details?: unknown;
    expose?: boolean;
}

export class AppError extends Error {
    statusCode: number;
    code: ErrorCode;
    details?: unknown;
    expose: boolean;

    constructor(options: AppErrorOptions) {
        super(options.message);
        this.name = 'AppError';
        this.statusCode = options.statusCode;
        this.code = options.code;
        this.details = options.details;
        // expose 用来控制 details / message 是否适合暴露给前端。
        // 默认规则是：4xx 更偏客户端问题，可以暴露；5xx 更偏服务内部问题，默认不暴露。
        this.expose = options.expose ?? options.statusCode < 500;
    }
}

export class ConflictError extends AppError {
    // 409 一般表示资源冲突，比如重复提交、状态不允许变更等。
    constructor(message: string, details?: unknown) {
        super({
            statusCode: 409,
            code: ErrorCodes.conflict,
            message,
            details,
        });
        this.name = 'ConflictError';
    }
}

export class UpstreamTimeoutError extends AppError {
    // 下游调用超时：说明后端依赖响应太慢，而不是 BFF 自己的业务校验失败。
    constructor(service: string, details?: unknown) {
        super({
            statusCode: 504,
            code: ErrorCodes.upstreamTimeout,
            message: `${service} request timed out`,
            details,
        });
        this.name = 'UpstreamTimeoutError';
    }
}

export class UpstreamUnavailableError extends AppError {
    // 下游不可用：常见于网络错误、熔断打开或依赖服务挂掉。
    constructor(service: string, details?: unknown) {
        super({
            statusCode: 503,
            code: ErrorCodes.upstreamUnavailable,
            message: `${service} is temporarily unavailable`,
            details,
        });
        this.name = 'UpstreamUnavailableError';
    }
}

export class UpstreamBadResponseError extends AppError {
    // 下游确实返回了响应，但响应状态或结构不符合预期。
    constructor(service: string, details?: unknown) {
        super({
            statusCode: 502,
            code: ErrorCodes.upstreamBadResponse,
            message: `${service} returned an invalid response`,
            details,
        });
        this.name = 'UpstreamBadResponseError';
    }
}

export class TooManyRequestsError extends AppError {
    // 429 常用于表达当前请求频率过高，通常和限流、风控或网关策略有关。
    constructor(message = 'Too many requests', details?: unknown) {
        super({
            statusCode: 429,
            code: ErrorCodes.tooManyRequests,
            message,
            details,
        });
        this.name = 'TooManyRequestsError';
    }
}

export function isAppError(error: unknown): error is AppError {
    // 类型守卫的价值是：在统一错误处理器里可以安全访问 statusCode、code、details 等字段。
    return error instanceof AppError;
}
