import { Link, Outlet } from "@remix-run/react";

export default function PH() {

    const user = 

    return (
        <>
            <nav>
                <Link to="/">Project Health</Link>
                <Link to={`/patches/${userID}`}>My Patches</Link>
                <Link to={`/hosts/${userID}`}>My Hosts</Link>
                <Link to="/">More</Link>
            </nav>
            <Outlet />
        </>
    );
}
