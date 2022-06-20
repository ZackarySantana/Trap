import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, Outlet } from "@remix-run/react";

import { requireUser } from "~/auth/session.server";
import { useUser } from "~/auth/utils";

export const loader: LoaderFunction = async ({ request }) => {
    const user = await requireUser(request);

    return json(user);
};

export default function PH() {
    const user = useUser();

    return (
        <>
            <nav>
                <Link to="/">Project Health</Link>
                <Link to={`/patches/${user.id}`}>My Patches</Link>
                <Link to={`/hosts/${user.id}`}>My Hosts</Link>
                <Link to="/">More</Link>
                <Form action="/logout" method="post">
                    <button type="submit">Logout</button>
                </Form>
            </nav>
            <Outlet />
        </>
    );
}
