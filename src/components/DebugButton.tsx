"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function DebugButton() {
    const searchParams = useSearchParams();
    const [showDebug, setShowDebug] = useState(false);

    useEffect(() => {
        if (searchParams?.get("debug") !== null) {
            setShowDebug(true);
        }
    }, [searchParams]);

    if (!showDebug) return null;

    return (
        <div className="absolute bottom-4 right-4 z-50">
            <button
                onClick={async () => {
                    await fetch("/api/socket");
                    const { io } = await import("socket.io-client");
                    const socket = io({
                        path: "/api/socket-io",
                        addTrailingSlash: false,
                    });
                    socket.on("connect", () => {
                        socket.emit("disconnect-all");
                        setTimeout(() => socket.disconnect(), 100);
                    });
                }}
                className="px-4 py-2 bg-red-900/50 text-red-400 text-xs rounded hover:bg-red-900 transition-colors"
            >
                DEBUG: Disconnect All
            </button>
        </div>
    );
}
