"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import * as Tone from "tone";
import Fighter from "./Fighter";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PlayerState {
    id: string;
    role: "P1" | "P2";
    name: string;
    health: number;
    energy: number;
    isBlocking: boolean;
    action: string | null;
}

export default function Arena() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [playerName, setPlayerName] = useState("");
    const [isJoined, setIsJoined] = useState(false);
    const [myRole, setMyRole] = useState<"P1" | "P2" | "SPECTATOR">(
        "SPECTATOR"
    );
    const [players, setPlayers] = useState<{ [id: string]: PlayerState }>({});
    const [gameStatus, setGameStatus] = useState<
        "WAITING" | "FIGHTING" | "GAME_OVER"
    >("WAITING");
    const [winner, setWinner] = useState<"P1" | "P2" | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const playersRef = useRef<{ [id: string]: PlayerState }>({}); // Ref to track latest players state
    const synthRef = useRef<Tone.PolySynth | null>(null);

    // Keep playersRef synced with players state
    useEffect(() => {
        playersRef.current = players;
    }, [players]);

    // ... (Sound Effects function remains same) ...
    const playSound = (type: "ATTACK" | "BLOCK" | "HIT" | "KO") => {
        if (Tone.context.state !== "running") Tone.start();
        if (!synthRef.current) return;

        switch (type) {
            case "ATTACK":
                synthRef.current.triggerAttackRelease(["C2", "E2"], "16n");
                break;
            case "BLOCK":
                synthRef.current.triggerAttackRelease(["G1"], "8n");
                break;
            case "HIT":
                synthRef.current.triggerAttackRelease(["A1", "C2"], "8n");
                break;
            case "KO":
                synthRef.current.triggerAttackRelease(
                    ["C1", "G1", "C2", "G2"],
                    "1n"
                );
                break;
        }
    };

    const [isConnecting, setIsConnecting] = useState(false);

    const joinGame = async () => {
        if (!playerName.trim() || isConnecting || socketRef.current) return;
        setIsConnecting(true);

        try {
            await fetch("/api/socket");

            if (socketRef.current) return;

            const socketInstance = io({
                path: "/api/socket-io",
                addTrailingSlash: false,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });

            socketInstance.on("connect", () => {
                console.log("Connected to arena");
                socketInstance.emit("join-fight", { name: playerName });
                setIsConnecting(false);
            });

            socketInstance.on("init-game", (data) => {
                setMyRole(data.role);
                setPlayers(data.players);
                setIsJoined(true);
                if (Object.keys(data.players).length >= 2)
                    setGameStatus("FIGHTING");
            });

            socketInstance.on("player-joined", (data) => {
                setPlayers((prev) => {
                    const next = { ...prev, [data.id]: data.player };
                    if (Object.keys(next).length >= 2)
                        setGameStatus("FIGHTING");
                    return next;
                });
            });

            socketInstance.on("player-left", (data) => {
                console.log("Player left:", data.id);
                setPlayers((prev) => {
                    const next = { ...prev };
                    delete next[data.id];
                    return next;
                });
                setGameStatus("WAITING");
            });

            socketInstance.on("player-action", (data) => {
                handleRemoteAction(data);
            });

            socketInstance.on("state-sync", (data) => {
                setPlayers((prev) => ({
                    ...prev,
                    [data.id]: { ...prev[data.id], ...data.state },
                }));
            });

            socketInstance.on("game-over", (data) => {
                setGameStatus("GAME_OVER");
                setWinner(data.winner);
                playSound("KO");
            });

            socketInstance.on("disconnect", (reason) => {
                console.log("Socket disconnected:", reason);
                setIsConnecting(false);
            });

            socketInstance.on("connect_error", (error) => {
                console.error("Socket connection error:", error);
                setIsConnecting(false);
            });

            socketRef.current = socketInstance;
            setSocket(socketInstance);
            synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
        } catch (error) {
            console.error("Failed to join game:", error);
            setIsConnecting(false);
        }
    };

    useEffect(() => {
        return () => {
            socketRef.current?.disconnect();
            synthRef.current?.dispose();
        };
    }, []);

    const handleRemoteAction = (data: { id: string; type: string }) => {
        // Use ref to get latest state
        const currentPlayers = playersRef.current;
        const actor = currentPlayers[data.id];
        if (!actor) return;

        // Update actor animation
        setPlayers((prev) => ({
            ...prev,
            [data.id]: {
                ...prev[data.id],
                action: data.type === "BLOCK_START" ? "BLOCK" : data.type,
            },
        }));

        // Clear animation after delay
        if (data.type !== "BLOCK_START") {
            setTimeout(() => {
                setPlayers((prev) => ({
                    ...prev,
                    [data.id]: { ...prev[data.id], action: null },
                }));
            }, 300);
        }

        // Handle Combat Logic (Client-side simulation for responsiveness)
        if (data.type === "ATTACK" || data.type === "SPECIAL") {
            playSound("ATTACK");

            // Check if I am the target
            const myId = socketRef.current?.id;
            if (myId && myId !== data.id) {
                const me = currentPlayers[myId];
                if (me) {
                    // Calculate Damage
                    let damage = data.type === "SPECIAL" ? 35 : 10;
                    if (me.isBlocking) {
                        damage = Math.floor(damage * 0.2); // 80% reduction
                        playSound("BLOCK");
                    } else {
                        playSound("HIT");
                        // Trigger Hit Animation on me
                        setPlayers((prev) => ({
                            ...prev,
                            [myId]: { ...prev[myId], action: "HIT" },
                        }));
                        setTimeout(() => {
                            setPlayers((prev) => ({
                                ...prev,
                                [myId]: { ...prev[myId], action: null },
                            }));
                        }, 300);
                    }

                    // Update My Health
                    const newHealth = Math.max(0, me.health - damage);

                    // Update Local State
                    setPlayers((prev) => ({
                        ...prev,
                        [myId]: { ...prev[myId], health: newHealth },
                    }));

                    // Sync my new state
                    socketRef.current?.emit("update-state", {
                        health: newHealth,
                    });

                    // Check KO
                    if (newHealth === 0) {
                        setGameStatus("GAME_OVER");
                        setWinner(actor.role);
                        playSound("KO");
                        socketRef.current?.emit("action", { type: "DIE" }); // Broadcast my death
                    }
                }
            }
        }
    };

    // Keyboard Controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameStatus !== "FIGHTING" || myRole === "SPECTATOR") return;
            if (e.repeat) return;

            const myId = socketRef.current?.id;
            if (!myId) return;

            switch (e.key.toLowerCase()) {
                case "a": // Attack
                    socketRef.current?.emit("action", { type: "ATTACK" });
                    // Local feedback
                    setPlayers((prev) => ({
                        ...prev,
                        [myId]: {
                            ...prev[myId],
                            action: "ATTACK",
                            energy: Math.min(100, prev[myId].energy + 5),
                        },
                    }));
                    socketRef.current?.emit("update-state", {
                        energy: Math.min(100, players[myId].energy + 5),
                    });
                    setTimeout(
                        () =>
                            setPlayers((prev) => ({
                                ...prev,
                                [myId]: { ...prev[myId], action: null },
                            })),
                        200
                    );
                    break;

                case "s": // Block
                    socketRef.current?.emit("action", { type: "BLOCK_START" });
                    socketRef.current?.emit("update-state", {
                        isBlocking: true,
                    });
                    setPlayers((prev) => ({
                        ...prev,
                        [myId]: {
                            ...prev[myId],
                            action: "BLOCK",
                            isBlocking: true,
                        },
                    }));
                    break;

                case "d": // Special
                    if (players[myId].energy >= 50) {
                        socketRef.current?.emit("action", { type: "SPECIAL" });
                        setPlayers((prev) => ({
                            ...prev,
                            [myId]: {
                                ...prev[myId],
                                action: "SPECIAL",
                                energy: prev[myId].energy - 50,
                            },
                        }));
                        socketRef.current?.emit("update-state", {
                            energy: players[myId].energy - 50,
                        });
                        setTimeout(
                            () =>
                                setPlayers((prev) => ({
                                    ...prev,
                                    [myId]: { ...prev[myId], action: null },
                                })),
                            500
                        );
                    }
                    break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (gameStatus !== "FIGHTING" || myRole === "SPECTATOR") return;
            const myId = socketRef.current?.id;
            if (!myId) return;

            if (e.key.toLowerCase() === "s") {
                socketRef.current?.emit("action", { type: "BLOCK_END" });
                socketRef.current?.emit("update-state", { isBlocking: false });
                setPlayers((prev) => ({
                    ...prev,
                    [myId]: { ...prev[myId], action: null, isBlocking: false },
                }));
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [gameStatus, myRole, players]);

    if (!isJoined) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 text-center">
                    <h2 className="text-2xl font-bold mb-6 text-white">
                        Enter the Arena
                    </h2>
                    <input
                        type="text"
                        placeholder="Your Fighter Name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-white mb-4 focus:ring-2 focus:ring-primary outline-none"
                        onKeyDown={(e) => e.key === "Enter" && joinGame()}
                    />
                    <button
                        onClick={joinGame}
                        disabled={!playerName.trim()}
                        className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                        JOIN FIGHT
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center relative">
            {/* Status Overlay */}
            {gameStatus === "WAITING" && (
                <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center">
                    <div className="text-center animate-pulse">
                        <h2 className="text-4xl font-bold text-white mb-4">
                            WAITING FOR OPPONENT...
                        </h2>
                        <p className="text-slate-400">
                            Share the URL to invite a fighter
                        </p>
                    </div>
                </div>
            )}

            {/* Back to Hub */}
            <Link
                href="/"
                className="absolute top-4 left-4 z-50 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-6 h-6" />
                <span className="font-bold">HUB</span>
            </Link>

            {gameStatus === "GAME_OVER" && (
                <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-6xl font-black text-yellow-500 mb-4">
                            K.O.
                        </h2>
                        <p className="text-2xl text-white mb-8">
                            {winner === myRole ? "YOU WIN!" : "YOU LOSE!"}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-8 py-4 bg-primary text-white font-bold rounded-full hover:scale-105 transition-transform"
                        >
                            REMATCH
                        </button>
                    </div>
                </div>
            )}

            {/* Arena Floor */}
            <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />

            {/* Fighters */}
            <div className="flex justify-between items-end w-full max-w-4xl px-12 pb-24 z-10">
                {Object.values(players).map((player) => (
                    <Fighter
                        key={player.id}
                        role={player.role}
                        name={player.name}
                        isSelf={player.role === myRole}
                        health={player.health}
                        energy={player.energy}
                        action={player.action}
                    />
                ))}
            </div>

            {/* Controls Guide */}
            <div className="absolute bottom-8 flex gap-8 text-slate-500 text-sm font-mono">
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border border-slate-600 rounded flex items-center justify-center mb-1">
                        A
                    </div>
                    <span>ATTACK</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border border-slate-600 rounded flex items-center justify-center mb-1">
                        S
                    </div>
                    <span>BLOCK</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border border-slate-600 rounded flex items-center justify-center mb-1">
                        D
                    </div>
                    <span>SPECIAL</span>
                </div>
            </div>
        </div>
    );
}
