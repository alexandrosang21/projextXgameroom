import { Server } from "socket.io";

interface GameState {
    players: {
        [id: string]: {
            id: string;
            role: "P1" | "P2";
            name: string;
            health: number;
            energy: number;
            isBlocking: boolean;
        };
    };
}

const gameState: GameState = {
    players: {},
};

export default function handler(req: any, res: any) {
    if (res.socket.server.io) {
        console.log("Socket is already running");
    } else {
        console.log("Socket is initializing");
        const io = new Server(res.socket.server, {
            path: "/api/socket",
            addTrailingSlash: false,
        });
        res.socket.server.io = io;

        io.on("connection", (socket) => {
            console.log("New connection:", socket.id);

            socket.on("join-game", (data: { name: string }) => {
                // Check occupied roles
                const occupiedRoles = Object.values(gameState.players).map(
                    (p) => p.role
                );
                let role: "P1" | "P2" | "SPECTATOR" = "SPECTATOR";

                if (!occupiedRoles.includes("P1")) role = "P1";
                else if (!occupiedRoles.includes("P2")) role = "P2";

                if (role !== "SPECTATOR") {
                    gameState.players[socket.id] = {
                        id: socket.id,
                        role,
                        name: data.name || `Player ${role}`,
                        health: 100,
                        energy: 0,
                        isBlocking: false,
                    };
                }

                // Emit to self
                socket.emit("init-game", { role, players: gameState.players });

                // Emit to others if they joined as a player
                if (role !== "SPECTATOR") {
                    socket.broadcast.emit("player-joined", {
                        id: socket.id,
                        role,
                        player: gameState.players[socket.id],
                    });
                }
            });

            socket.on("action", (data) => {
                socket.broadcast.emit("player-action", {
                    id: socket.id,
                    type: data.type,
                });
            });

            socket.on("update-state", (data) => {
                if (gameState.players[socket.id]) {
                    gameState.players[socket.id] = {
                        ...gameState.players[socket.id],
                        ...data,
                    };
                    socket.broadcast.emit("state-sync", {
                        id: socket.id,
                        state: data,
                    });
                }
            });

            socket.on("disconnect", () => {
                console.log("Disconnected:", socket.id);
                if (gameState.players[socket.id]) {
                    delete gameState.players[socket.id];
                    socket.broadcast.emit("player-left", { id: socket.id });
                }
            });
        });
    }
    res.end();
}
