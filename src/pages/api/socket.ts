import { Server } from "socket.io";
import { NextApiRequest } from "next";
import { NextApiResponseServerIO } from "@/types/next";

// --- FIGHTING GAME TYPES ---
interface PlayerState {
    id: string;
    role: "P1" | "P2" | "SPECTATOR";
    name: string;
    health: number;
    energy: number;
    isBlocking: boolean;
    action: string | null;
    kills: number;
    deaths: number;
    lives: number;
}

interface FightRoomState {
    players: { [id: string]: PlayerState };
}

// --- PIANO GAME TYPES ---
interface PianoRoomState {
    activeNotes: { [note: string]: string[] }; // note -> list of userIds
}

// --- GLOBAL STATE ---
const gameState = {
    fight: {
        players: {},
    } as FightRoomState,
    piano: {
        activeNotes: {},
    } as PianoRoomState,
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
    if (!res.socket.server.io) {
        console.log("Socket is initializing");
        const io = new Server(res.socket.server, {
            path: "/api/socket-io",
            addTrailingSlash: false,
            pingTimeout: 60000,
            pingInterval: 25000,
            cors: {
                origin: "*",
            },
        });
        res.socket.server.io = io;

        io.on("connection", (socket) => {
            console.log("New connection:", socket.id);

            // --- FIGHTING GAME EVENTS ---
            socket.on("join-fight", (data: { name: string }) => {
                socket.join("fight-room");

                // Check occupied roles
                const occupiedRoles = Object.values(
                    gameState.fight.players
                ).map((p) => p.role);
                let role: "P1" | "P2" | "SPECTATOR" = "SPECTATOR";

                if (!occupiedRoles.includes("P1")) role = "P1";
                else if (!occupiedRoles.includes("P2")) role = "P2";

                if (role !== "SPECTATOR") {
                    gameState.fight.players[socket.id] = {
                        id: socket.id,
                        role,
                        name: data.name || `Player ${role}`,
                        health: 100,
                        energy: 0,
                        isBlocking: false,
                        action: null,
                        kills: 0,
                        deaths: 0,
                        lives: 10,
                    };
                }

                // Emit to self
                socket.emit("init-game", {
                    role,
                    players: gameState.fight.players,
                });

                // Emit to others in fight room
                if (role !== "SPECTATOR") {
                    socket.to("fight-room").emit("player-joined", {
                        id: socket.id,
                        role,
                        player: gameState.fight.players[socket.id],
                    });
                }
            });

            socket.on("action", (data) => {
                socket.to("fight-room").emit("player-action", {
                    id: socket.id,
                    type: data.type,
                });
            });

            socket.on("update-state", (data) => {
                if (gameState.fight.players[socket.id]) {
                    gameState.fight.players[socket.id] = {
                        ...gameState.fight.players[socket.id],
                        ...data,
                    };
                    socket.to("fight-room").emit("state-sync", {
                        id: socket.id,
                        state: data,
                    });
                }
            });

            socket.on("player-died", () => {
                const victimId = socket.id;
                const victim = gameState.fight.players[victimId];

                if (victim) {
                    // Find killer (the other non-spectator player)
                    const killerId = Object.keys(gameState.fight.players).find(
                        (id) =>
                            id !== victimId &&
                            gameState.fight.players[id].role !== "SPECTATOR"
                    );

                    // Update Stats
                    victim.deaths += 1;
                    victim.lives -= 1;

                    if (killerId && gameState.fight.players[killerId]) {
                        gameState.fight.players[killerId].kills += 1;
                    }

                    // Broadcast updated stats
                    io.to("fight-room").emit("state-sync", {
                        id: victimId,
                        state: { deaths: victim.deaths, lives: victim.lives },
                    });

                    if (killerId) {
                        io.to("fight-room").emit("state-sync", {
                            id: killerId,
                            state: {
                                kills: gameState.fight.players[killerId].kills,
                            },
                        });
                    }

                    // Handle Respawn or Game Over
                    if (victim.lives > 0) {
                        // Start Countdown
                        let count = 3;
                        const countdownInterval = setInterval(() => {
                            io.to("fight-room").emit("countdown", { count });
                            count--;
                            if (count < 0) {
                                clearInterval(countdownInterval);
                                // Respawn Logic
                                gameState.fight.players[victimId].health = 100;
                                gameState.fight.players[victimId].energy = 0;
                                io.to("fight-room").emit("state-sync", {
                                    id: victimId,
                                    state: { health: 100, energy: 0 },
                                });
                                io.to("fight-room").emit("countdown", {
                                    count: 0,
                                }); // GO!
                            }
                        }, 1000);
                    } else {
                        // Game Over
                        io.to("fight-room").emit("game-over", {
                            winner: killerId
                                ? gameState.fight.players[killerId].role
                                : "DRAW",
                        });
                    }
                }
            });

            // --- PIANO GAME EVENTS ---
            socket.on("join-piano", () => {
                socket.join("piano-room");
                console.log(`Socket ${socket.id} joined piano-room`);
            });

            socket.on("play-note", (data: { note: string }) => {
                socket.to("piano-room").emit("play-note", {
                    note: data.note,
                    playerId: socket.id,
                });
            });

            // --- DISCONNECT ---
            socket.on("disconnect", () => {
                console.log("Disconnected:", socket.id);

                // Handle Fight Disconnect
                if (gameState.fight.players[socket.id]) {
                    delete gameState.fight.players[socket.id];
                    io.to("fight-room").emit("player-left", { id: socket.id });
                }

                // Handle Piano Disconnect (if we tracked state)
            });
        });
    }
    res.end();
};

export default ioHandler;
