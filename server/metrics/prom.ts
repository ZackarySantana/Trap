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

const { normalizeStatusCode, normalizePath } = require("./normalizers");

const defaultOptions = {
    metricsPath: "/metrics",
    metricsApp: null,
    authenticate: null,
    collectDefaultMetrics: true,
    collectGCMetrics: false,
    // buckets for response time from 0.05s to 2.5s
    // these are arbitrary values since i dont know any better ¯\_(ツ)_/¯
    requestDurationBuckets: Prometheus.exponentialBuckets(0.05, 1.75, 8),
    requestLengthBuckets: [] as number[],
    responseLengthBuckets: [] as number[],
    pageViewDurationBuckets: [] as number[],
    sessionViewDurationBuckets: [] as number[],
    extraMasks: [] as string[],
    customLabels: [] as string[],
    normalizeStatus: true,
    prefix: "",
};

export default (userOptions = {}) => {
    const options = { ...defaultOptions, ...userOptions };
    const originalLabels = ["route", "method", "status"];
    options.customLabels = [...originalLabels, ...options.customLabels];
    options.customLabels = [...options.customLabels];
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
        const originalRoute = new URL(url || "/").pathname;
        // will replace ids from the route with `#val` placeholder this serves to
        // measure the same routes, e.g., /image/id1, and /image/id2, will be
        // treated as the same route
        const route = normalizePath(originalRoute, options.extraMasks);

        if (route !== metricsPath) {
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
            if (
                req.headers.cookie &&
                req.headers.cookie.includes("__session")
            ) {
                requestAuthCount.inc(labels);
            } else {
                requestCount.inc(labels);
            }
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
        const route = normalizePath(data.path, options.extraMasks);

        const labels = { route };

        // Count authorized and unauthorized requests
        if (req.headers.cookie && req.headers.cookie.includes("__session")) {
            pageViewAuthDuration.observe(labels, Number(data.timeSpent));
        } else {
            pageViewDuration.observe(labels, Number(data.timeSpent));
        }

        res.send({ status: "done" });
    });

    app.use("/analytics/session-view", bodyParser.text(), (req, res) => {
        let data = JSON.parse(req.body);

        // Count authorized and unauthorized requests
        if (req.headers.cookie && req.headers.cookie.includes("__session")) {
            sessionViewAuthDuration.observe({}, Number(data.timeSpent));
        } else {
            sessionViewDuration.observe({}, Number(data.timeSpent));
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
