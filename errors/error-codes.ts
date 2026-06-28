/*
 * 这里集中放“对外可识别”的错误码常量。
 *
 * 为什么不用到处直接写字符串：
 * 1. 避免手误，比如 NOT_FOUND / NOTFOUND / not_found 混着写。
 * 2. 前后端联调时，错误码通常比 message 更稳定，适合作为判断依据。
 * 3. 以后需要补业务错误码时，也能在同一个地方扩展。
 */

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
