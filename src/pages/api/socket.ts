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

            // --- TIC TAC TOE TYPES ---
interface TicTacToeState {
    board: (string | null)[];
    xIsNext: boolean;
    winner: string | null; // 'X', 'O', 'DRAW', or null
    players: {
        X: string | null; // socket.id
        O: string | null; // socket.id
    };
    gameStarter: "X" | "O"; // Track who started the current game
}

// --- GLOBAL STATE ---
const gameState = {
    fight: {
        players: {},
    } as FightRoomState,
    piano: {
        activeNotes: {},
    } as PianoRoomState,
    tictactoe: {
        board: Array(9).fill(null),
        xIsNext: true,
        winner: null,
        players: { X: null, O: null },
        gameStarter: "X",
    } as TicTacToeState,
};

const checkWinner = (squares: (string | null)[]) => {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a];
        }
    }
    return null;
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
    if (!res.socket.server.io) {
        console.log("Socket is initializing");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const httpServer: any = res.socket.server;
        const io = new Server(httpServer, {
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

            // --- TIC TAC TOE EVENTS ---
            socket.on("join-tictactoe", () => {
                socket.join("tictactoe-room");

                // Sanity Check: Fix invalid state where X and O are same
                if (
                    gameState.tictactoe.players.X &&
                    gameState.tictactoe.players.X ===
                        gameState.tictactoe.players.O
                ) {
                    console.warn(
                        "[TicTacToe] CRITICAL: Found same player as X and O. Resetting O."
                    );
                    gameState.tictactoe.players.O = null;
                }

                // Assign Role
                let role: "X" | "O" | "SPECTATOR" = "SPECTATOR";

                if (gameState.tictactoe.players.X === socket.id) {
                    role = "X";
                } else if (gameState.tictactoe.players.O === socket.id) {
                    role = "O";
                } else if (!gameState.tictactoe.players.X) {
                    gameState.tictactoe.players.X = socket.id;
                    role = "X";
                } else if (!gameState.tictactoe.players.O) {
                    // Ensure we don't assign O if we are somehow already X (redundant but safe)
                    if (gameState.tictactoe.players.X !== socket.id) {
                        gameState.tictactoe.players.O = socket.id;
                        role = "O";
                    }
                }

                console.log(
                    `[TicTacToe] Join: ${socket.id} assigned ${role}. Current players:`,
                    gameState.tictactoe.players
                );

                socket.emit("tictactoe-init", {
                    role,
                    state: gameState.tictactoe,
                });

                io.to("tictactoe-room").emit(
                    "tictactoe-update",
                    gameState.tictactoe
                );
            });

            socket.on("tictactoe-move", (index: number) => {
                const { board, xIsNext, winner, players } = gameState.tictactoe;

                // Validation
                if (winner || board[index]) return;
                if (xIsNext && socket.id !== players.X) return;
                if (!xIsNext && socket.id !== players.O) return;

                // Execute Move
                const newBoard = [...board];
                newBoard[index] = xIsNext ? "X" : "O";
                gameState.tictactoe.board = newBoard;
                gameState.tictactoe.xIsNext = !xIsNext;

                // Check Win
                const gameWinner = checkWinner(newBoard);
                if (gameWinner) {
                    gameState.tictactoe.winner = gameWinner;
                } else if (!newBoard.includes(null)) {
                    gameState.tictactoe.winner = "DRAW";
                }

                io.to("tictactoe-room").emit(
                    "tictactoe-update",
                    gameState.tictactoe
                );
            });

            socket.on("tictactoe-reset", () => {
                // Swap starter
                const nextStarter = gameState.tictactoe.gameStarter === "X" ? "O" : "X";
                gameState.tictactoe.gameStarter = nextStarter;
                
                gameState.tictactoe.board = Array(9).fill(null);
                gameState.tictactoe.xIsNext = nextStarter === "X"; // If X starts, xIsNext is true. If O starts, xIsNext is false (O moves first)
                gameState.tictactoe.winner = null;
                
                io.to("tictactoe-room").emit(
                    "tictactoe-update",
                    gameState.tictactoe
                );
            });

            socket.on("disconnect-all", () => {
                console.log("Disconnecting ALL sockets...");
                io.sockets.sockets.forEach((s) => {
                    s.disconnect(true);
                });
                // Reset all game states
                gameState.fight.players = {};
                gameState.piano.activeNotes = {};
                gameState.tictactoe = {
                    board: Array(9).fill(null),
                    xIsNext: true,
                    winner: null,
                    players: { X: null, O: null },
                    gameStarter: "X",
                };
            });

            // --- DISCONNECT ---
            socket.on("disconnect", () => {
                console.log("Disconnected:", socket.id);

                // Handle Fight Disconnect
                if (gameState.fight.players[socket.id]) {
                    delete gameState.fight.players[socket.id];
                    io.to("fight-room").emit("player-left", { id: socket.id });
                }

                // Handle Tic Tac Toe Disconnect
                // Use independent checks to handle case where one socket held both roles (bug fix)
                let updated = false;
                if (gameState.tictactoe.players.X === socket.id) {
                    gameState.tictactoe.players.X = null;
                    updated = true;
                }
                if (gameState.tictactoe.players.O === socket.id) {
                    gameState.tictactoe.players.O = null;
                    updated = true;
                }

                if (updated) {
                    io.to("tictactoe-room").emit(
                        "tictactoe-update",
                        gameState.tictactoe
                    );
                }
            });
        });
    }
    res.end();
};

export default ioHandler;
