export function normalizePaths(pathname: string, normalizePaths: string[][]) {
    for (let normPath of normalizePaths) {
        pathname = normalizePath(pathname, normPath[0], normPath[1]);
    }
    return pathname;
}

export function normalizePath(
    pathname: string,
    normalizePath: string,
    placeholder: string
) {
    return pathname.replace(RegExp(normalizePath), placeholder);
}

/**
 * Normalizes http status codes.
 *
 * Returns strings in the format (2|3|4|5)XX.
 *
 * @param {!number} status - status code of the requests
 * @returns {string} the normalized status code.
 */
export function normalizeStatusCode(status: number) {
    if (status >= 200 && status < 300) {
        return "2XX";
    }

    if (status >= 300 && status < 400) {
        return "3XX";
    }

    if (status >= 400 && status < 500) {
        return "4XX";
    }

    return "5XX";
}
