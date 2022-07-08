import { useLocation } from "@remix-run/react";
import { useEffect, useRef } from "react";

export default function Analytics() {
    const location = useLocation();
    const firstRender = useRef(false);

    const oldLocation = useRef(location.pathname);
    const pageViewStartTime = useRef(Date.now());

    const locations = useRef<String[]>([]);
    const sessionViewStartTime = useRef(Date.now());

    const sendPageViewAnalytics = () => {
        navigator.sendBeacon(
            "/analytics/page-view",
            JSON.stringify({
                timeSpent: Date.now() - pageViewStartTime.current,
                path: oldLocation.current,
            })
        );
    };

    const sendSessionViewAnalytics = () => {
        navigator.sendBeacon(
            "/analytics/session-view",
            JSON.stringify({
                timeSpent: Date.now() - sessionViewStartTime.current,
                paths: locations.current,
            })
        );
    };

    const resetSessionViewAnalytics = () => {
        locations.current = [];
        sessionViewStartTime.current = Date.now();
    };

    const resetPageViewAnalytics = (local: string) => {
        oldLocation.current = local;
        pageViewStartTime.current = Date.now();
    };

    useEffect(() => {
        const analyticsHandler = function () {
            if (document.visibilityState == "hidden") {
                sendPageViewAnalytics();
                sendSessionViewAnalytics();
            } else {
                resetPageViewAnalytics(location.pathname);
                resetSessionViewAnalytics();
            }
        };
        window.addEventListener("visibilitychange", analyticsHandler);
        return () =>
            window.removeEventListener("visibilitychange", analyticsHandler);
    }, [location.pathname]);

    useEffect(() => {
        locations.current.push(location.pathname);
        if (!firstRender.current) {
            firstRender.current = true;
            return;
        }
        sendPageViewAnalytics();
        resetPageViewAnalytics(location.pathname);
    }, [location.pathname]);
    return <></>;
}
