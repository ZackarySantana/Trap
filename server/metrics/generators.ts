import Prometheus from "prom-client";

/**
 * @param prefix - metrics name prefix
 * request counter
 */
export function requestCountGenerator(labelNames: string[], prefix = "") {
    return new Prometheus.Counter({
        name: `${prefix}http_requests_total`,
        help: "Counter for total requests received",
        labelNames,
    });
}

/**
 * @param {!Array} buckets - array of numbers, representing the buckets for
 * @param prefix - metrics name prefix
 * request duration
 */
export function requestDurationGenerator(
    labelNames: string[],
    buckets: number[],
    prefix = ""
) {
    return new Prometheus.Histogram({
        name: `${prefix}http_request_duration_seconds`,
        help: "Duration of HTTP requests in seconds",
        labelNames,
        buckets,
    });
}

/**
 * @param {!Array} buckets - array of numbers, representing the buckets for
 * @param prefix - metrics name prefix
 * request length
 */
export function requestLengthGenerator(
    labelNames: string[],
    buckets: number[],
    prefix = ""
) {
    return new Prometheus.Histogram({
        name: `${prefix}http_request_length_bytes`,
        help: "Content-Length of HTTP request",
        labelNames,
        buckets,
    });
}

/**
 * @param {!Array} buckets - array of numbers, representing the buckets for
 * @param prefix - metrics name prefix
 * response length
 */
export function responseLengthGenerator(
    labelNames: string[],
    buckets: number[],
    prefix = ""
) {
    return new Prometheus.Histogram({
        name: `${prefix}http_response_length_bytes`,
        help: "Content-Length of HTTP response",
        labelNames,
        buckets,
    });
}

/**
 * @param prefix - metrics name prefix
 *  auth request counter
 */
export function requestAuthenticatedCountGenerator(
    labelNames: string[],
    prefix = ""
) {
    return new Prometheus.Counter({
        name: `${prefix}http_auth_requests_total`,
        help: "Counter for total authenticated requests received",
        labelNames,
    });
}

/**
 * @param {!Array} buckets - array of numbers, representing the buckets for
 * @param prefix - metrics name prefix
 * page view duration
 */
export function pageViewDurationGenerator(
    labelNames: string[],
    buckets: number[],
    prefix = ""
) {
    return new Prometheus.Histogram({
        name: `${prefix}page_view_duration`,
        help: "Duration of page views on route, unauthenticated",
        labelNames,
        buckets,
    });
}

/**
 * @param {!Array} buckets - array of numbers, representing the buckets for
 * @param prefix - metrics name prefix
 * page view duration
 */
export function pageViewAuthenticatedDurationGenerator(
    labelNames: string[],
    buckets: number[],
    prefix = ""
) {
    return new Prometheus.Histogram({
        name: `${prefix}page_view_auth_duration`,
        help: "Duration of page views on route, authenticated",
        labelNames,
        buckets,
    });
}

/**
 * @param {!Array} buckets - array of numbers, representing the buckets for
 * @param prefix - metrics name prefix
 * session view duration
 */
export function sessionViewDurationGenerator(
    labelNames: string[],
    buckets: number[],
    prefix = ""
) {
    return new Prometheus.Histogram({
        name: `${prefix}session_view_duration`,
        help: "Duration of session views across route, unauthenticated",
        labelNames,
        buckets,
    });
}

/**
 * @param {!Array} buckets - array of numbers, representing the buckets for
 * @param prefix - metrics name prefix
 * session view duration
 */
export function sessionViewAuthenticatedDurationGenerator(
    labelNames: string[],
    buckets: number[],
    prefix = ""
) {
    return new Prometheus.Histogram({
        name: `${prefix}session_view_auth_duration`,
        help: "Duration of session views across route, authenticated",
        labelNames,
        buckets,
    });
}
