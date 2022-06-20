import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";

import { requireUser } from "~/auth/session.server";
import { useUser } from "~/utils";

export const loader: LoaderFunction = async ({ request }) => {
    const user = await requireUser(request);

    return json(user);
};

export default function PH() {
    const user = useUser();
    const d = useLoaderData();

    return (
        <>
            <nav>
                <Link to="/">Project Health</Link>
                <Link to={`/patches/${user.id}`}>My Patches</Link>
                <Link to={`/hosts/${user.id}`}>My Hosts</Link>
                <Link to="/">More</Link>
            </nav>
            <Outlet />
        </>
    );
}
