import { ErrorCodes, type ErrorCode } from './error-codes'

export interface AppErrorOptions {
    statusCode: number
    code: ErrorCode
    message: string
    details?: unknown
    expose?: boolean
}

export class AppError extends Error {
    statusCode: number
    code: ErrorCode
    details?: unknown
    expose: boolean

    constructor(options: AppErrorOptions) {
        super(options.message)
        this.name = 'AppError'
        this.statusCode = options.statusCode
        this.code = options.code
        this.details = options.details
        this.expose = options.expose ?? options.statusCode < 500
    }
}

export class ConflictError extends AppError {
    constructor(message: string, details?: unknown) {
        super({
            statusCode: 409,
            code: ErrorCodes.conflict,
            message,
            details
        })
        this.name = 'ConflictError'
    }
}

export class UpstreamTimeoutError extends AppError {
    constructor(service: string, details?: unknown) {
        super({
            statusCode: 504,
            code: ErrorCodes.upstreamTimeout,
            message: `${service} request timed out`,
            details
        })
        this.name = 'UpstreamTimeoutError'
    }
}

export class UpstreamUnavailableError extends AppError {
    constructor(service: string, details?: unknown) {
        super({
            statusCode: 503,
            code: ErrorCodes.upstreamUnavailable,
            message: `${service} is temporarily unavailable`,
            details
        })
        this.name = 'UpstreamUnavailableError'
    }
}

export class UpstreamBadResponseError extends AppError {
    constructor(service: string, details?: unknown) {
        super({
            statusCode: 502,
            code: ErrorCodes.upstreamBadResponse,
            message: `${service} returned an invalid response`,
            details
        })
        this.name = 'UpstreamBadResponseError'
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests', details?: unknown) {
        super({
            statusCode: 429,
            code: ErrorCodes.tooManyRequests,
            message,
            details
        })
        this.name = 'TooManyRequestsError'
    }
}

export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError
}
