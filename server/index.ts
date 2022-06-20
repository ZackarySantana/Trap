import path from "path";
import express from "express";
import compression from "compression";
import morgan from "morgan";
import { createRequestHandler } from "@remix-run/express";

import promMiddleware from "./metrics/prom";

const BUILD_DIR = path.join(process.cwd(), "build");

const app = express();

const metrics = process.env.ENABLE_METRICS ?? true;
if (metrics) {
    const metricsApp = express();

    app.use(
        promMiddleware({
            metricsPath: "/metrics",
            metricsApp: metricsApp,
            collectDefaultMetrics: true,
            autoregister: true,
            includeStatusCode: true,
            includePath: true,
            includeMethod: true,
            requestDurationBuckets: [0.1, 0.5, 1, 1.5],
            normalizePath: [
                ["^/account/.*/.*", "/account/#userid/.*"],
                ["^/build/.*", "/build/resource"],
            ],
        })
    );

    const metricsPort = process.env.METRICS_PORT || 9091;

    metricsApp.listen(metricsPort, () => {
        console.log(
            `✅ Metrics ready: http://localhost:${metricsPort}/metrics`
        );
    });
}

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// Remix fingerprints its assets so we can cache forever.
app.use(
    "/build",
    express.static("public/build", { immutable: true, maxAge: "1y" })
);

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("public", { maxAge: "1h" }));

app.use(morgan("tiny"));

app.all(
    "*",
    process.env.NODE_ENV === "development"
        ? (req, res, next) => {
              purgeRequireCache();

              return createRequestHandler({
                  build: require(BUILD_DIR),
                  mode: process.env.NODE_ENV,
              })(req, res, next);
          }
        : createRequestHandler({
              build: require(BUILD_DIR),
              mode: process.env.NODE_ENV,
          })
);
const port = process.env.PORT || 3000;

app.listen(port, () => {
    if (process.env.NODE_ENV == "development") {
        console.log(`Ash started on http://localhost:3000/`);
    } else {
        console.log("Ash started on port 3000");
    }
});

function purgeRequireCache() {
    // purge require cache on requests for "server side HMR" this won't let
    // you have in-memory objects between requests in development,
    // alternatively you can set up nodemon/pm2-dev to restart the server on
    // file changes, but then you'll have to reconnect to databases/etc on each
    // change. We prefer the DX of this, so we've included it for you by default
    for (let key in require.cache) {
        if (key.startsWith(BUILD_DIR)) {
            delete require.cache[key];
        }
    }
}
