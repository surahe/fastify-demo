export const ErrorCodes = {
    validation: 'VALIDATION_ERROR',
    notFound: 'NOT_FOUND',
    conflict: 'CONFLICT',
    upstreamTimeout: 'UPSTREAM_TIMEOUT',
    upstreamUnavailable: 'UPSTREAM_UNAVAILABLE',
    upstreamBadResponse: 'UPSTREAM_BAD_RESPONSE',
    tooManyRequests: 'TOO_MANY_REQUESTS',
    internal: 'INTERNAL_ERROR'
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]
