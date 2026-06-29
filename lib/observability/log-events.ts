export const LOG_EVENTS = {
    HTTP_ACCESS: 'http_access',
    HTTP_ERROR: 'http_error',
    SERVER_STARTED: 'server_started',
    SERVER_START_FAILED: 'server_start_failed',
    SERVICE_UNDER_PRESSURE: 'service_under_pressure',
    LIVE_AGGREGATE_DEGRADED: 'live_aggregate_degraded',
} as const;

export type LogEvent = (typeof LOG_EVENTS)[keyof typeof LOG_EVENTS];
