import express from "express";
import Prometheus from "prom-client";
import ResponseTime from "response-time";
import bodyParser from "body-parser";

import {
    requestCountGenerator,
    requestDurationGenerator,
    requestLengthGenerator,
    responseLengthGenerator,
    requestAuthenticatedCountGenerator,
    pageViewDurationGenerator,
    sessionViewDurationGenerator,
    pageViewAuthenticatedDurationGenerator,
    sessionViewAuthenticatedDurationGenerator,
} from "./generators";

import { normalizeStatusCode, normalizePaths } from "./normalizers";

const defaultOptions = {
    metricsPath: "/metrics",
    metricsApp: null,
    authenticate: null,
    collectDefaultMetrics: true,
    collectGCMetrics: false,
    requestDurationBuckets: [
        ...linearBuckets(0, 0.1, 10),
        ...linearBuckets(1.5, 1, 5),
        ...linearBuckets(10, 5, 3),
    ],
    requestLengthBuckets: [...linearBuckets(0, 5, 20)],
    responseLengthBuckets: [...linearBuckets(0, 5, 20)],
    pageViewDurationBuckets: [...linearBuckets(0, 1, 100)],
    sessionViewDurationBuckets: [...linearBuckets(0, 2, 100)],
    normalizePaths: [] as string[][],
    ignorePaths: [] as string[],
    customLabels: [] as string[],
    normalizeStatus: true,
    prefix: "",
};

export default (userOptions = {}) => {
    const options = { ...defaultOptions, ...userOptions };
    const originalLabels = ["route", "method", "status"];
    options.customLabels = [...originalLabels, ...options.customLabels];
    const { metricsPath, metricsApp, normalizeStatus } = options;

    const app = express();
    app.disable("x-powered-by");

    const requestDuration = requestDurationGenerator(
        options.customLabels,
        options.requestDurationBuckets,
        options.prefix
    );
    const requestCount = requestCountGenerator(
        options.customLabels,
        options.prefix
    );
    const requestLength = requestLengthGenerator(
        options.customLabels,
        options.requestLengthBuckets,
        options.prefix
    );
    const responseLength = responseLengthGenerator(
        options.customLabels,
        options.responseLengthBuckets,
        options.prefix
    );
    const requestAuthCount = requestAuthenticatedCountGenerator(
        options.customLabels,
        options.prefix
    );
    const pageViewDuration = pageViewDurationGenerator(
        options.customLabels,
        options.pageViewDurationBuckets,
        options.prefix
    );
    const pageViewAuthDuration = pageViewAuthenticatedDurationGenerator(
        options.customLabels,
        options.pageViewDurationBuckets,
        options.prefix
    );
    const sessionViewDuration = sessionViewDurationGenerator(
        options.customLabels,
        options.sessionViewDurationBuckets,
        options.prefix
    );
    const sessionViewAuthDuration = sessionViewAuthenticatedDurationGenerator(
        options.customLabels,
        options.sessionViewDurationBuckets,
        options.prefix
    );

    /**
     * Corresponds to the R(equest rate), E(error rate), and D(uration of requests),
     * of the RED metrics.
     */
    const redMiddleware = ResponseTime((req, res, time) => {
        const { url, method } = req;
        const route = normalizePaths(url ?? "", options.normalizePaths);

        // Don't count metrics for metrics path
        if (route === metricsPath) {
            return;
        }

        // Don't do metrics for any ignored paths
        if (matchesAny(route, options.ignorePaths)) {
            return;
        }

        const status = normalizeStatus
            ? normalizeStatusCode(res.statusCode)
            : res.statusCode.toString();

        const labels = { route, method, status };

        // observe normalizing to seconds
        requestDuration.observe(labels, time / 1000);

        // observe request length
        if (options.requestLengthBuckets.length) {
            const reqLength = req.headers["content-length"];
            if (reqLength) {
                requestLength.observe(labels, Number(reqLength));
            }
        }

        // observe response length
        if (options.responseLengthBuckets.length) {
            const resLength = res.getHeader("content-length");
            if (resLength) {
                responseLength.observe(labels, Number(resLength));
            }
        }

        // Count authorized and unauthorized requests
        if (req.headers.cookie && req.headers.cookie.includes("__session")) {
            requestAuthCount.inc(labels);
        } else {
            requestCount.inc(labels);
        }
    });

    if (options.collectDefaultMetrics) {
        // when this file is required, we will start to collect automatically
        // default metrics include common cpu and head usage metrics that can be
        // used to calculate saturation of the service
        Prometheus.collectDefaultMetrics({
            prefix: options.prefix,
        });
    }

    if (options.collectGCMetrics) {
        // if the option has been turned on, we start collecting garbage
        // collector metrics too. using try/catch because the dependency is
        // optional and it could not be installed
        try {
            /* eslint-disable global-require */
            /* eslint-disable import/no-extraneous-dependencies */
            const gcStats = require("prometheus-gc-stats");
            /* eslint-enable import/no-extraneous-dependencies */
            /* eslint-enable global-require */
            const startGcStats = gcStats(Prometheus.register, {
                prefix: options.prefix,
            });
            startGcStats();
        } catch (err) {
            // the dependency has not been installed, skipping
        }
    }

    app.use(redMiddleware);

    app.use("/analytics/page-view", bodyParser.text(), (req, res) => {
        let data = JSON.parse(req.body);
        const route = normalizePaths(data.path, options.normalizePaths);

        const labels = { route };

        // Count authorized and unauthorized requests
        if (req.headers.cookie && req.headers.cookie.includes("__session")) {
            pageViewAuthDuration.observe(labels, Number(data.timeSpent / 1000));
        } else {
            pageViewDuration.observe(labels, Number(data.timeSpent / 1000));
        }

        res.send({ status: "done" });
    });

    app.use("/analytics/session-view", bodyParser.text(), (req, res) => {
        let data = JSON.parse(req.body);

        // Count authorized and unauthorized requests
        if (req.headers.cookie && req.headers.cookie.includes("__session")) {
            sessionViewAuthDuration.observe({}, Number(data.timeSpent / 1000));
        } else {
            sessionViewDuration.observe({}, Number(data.timeSpent / 1000));
        }

        res.send({ status: "done" });
    });

    /**
     * Metrics route to be used by prometheus to scrape metrics
     */
    const routeApp = metricsApp || app;
    routeApp.get(metricsPath, async (req, res) => {
        res.set("Content-Type", Prometheus.register.contentType);
        return res.end(await Prometheus.register.metrics());
    });

    return app;
};

function linearBuckets(start: number, width: number, count: number) {
    const buckets = [] as number[];

    for (let i = 0; i < count; ++i) {
        buckets.push(Number((start + width * i).toFixed(3)));
    }

    return buckets;
}

function matchesAny(pathname: string, toMatches: string[]) {
    for (let toMatch of toMatches) {
        if (matches(pathname, toMatch)) {
            return true;
        }
    }
    return false;
}

function matches(pathname: string, toMatch: string) {
    const matched = pathname.match(RegExp(toMatch));
    return matched ? matched.length > 0 : false;
}
