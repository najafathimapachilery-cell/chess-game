const boardElement = document.getElementById("chess-board");
const statusElement = document.getElementById("status");

let board;
let currentPlayer;
let selectedSquare;
let gameOver;
let enPassantTarget;

const pieces = {

    white: {
        king: "♔",
        queen: "♕",
        rook: "♖",
        bishop: "♗",
        knight: "♘",
        pawn: "♙"
    },

    black: {
        king: "♚",
        queen: "♛",
        rook: "♜",
        bishop: "♝",
        knight: "♞",
        pawn: "♟"
    }
};


function createPiece(type, color) {

    return {
        type: type,
        color: color,
        hasMoved: false
    };
}


function resetGame() {

    board = [

        [
            createPiece("rook", "black"),
            createPiece("knight", "black"),
            createPiece("bishop", "black"),
            createPiece("queen", "black"),
            createPiece("king", "black"),
            createPiece("bishop", "black"),
            createPiece("knight", "black"),
            createPiece("rook", "black")
        ],

        [
            createPiece("pawn", "black"),
            createPiece("pawn", "black"),
            createPiece("pawn", "black"),
            createPiece("pawn", "black"),
            createPiece("pawn", "black"),
            createPiece("pawn", "black"),
            createPiece("pawn", "black"),
            createPiece("pawn", "black")
        ],

        [null, null, null, null, null, null, null, null],

        [null, null, null, null, null, null, null, null],

        [null, null, null, null, null, null, null, null],

        [null, null, null, null, null, null, null, null],

        [
            createPiece("pawn", "white"),
            createPiece("pawn", "white"),
            createPiece("pawn", "white"),
            createPiece("pawn", "white"),
            createPiece("pawn", "white"),
            createPiece("pawn", "white"),
            createPiece("pawn", "white"),
            createPiece("pawn", "white")
        ],

        [
            createPiece("rook", "white"),
            createPiece("knight", "white"),
            createPiece("bishop", "white"),
            createPiece("queen", "white"),
            createPiece("king", "white"),
            createPiece("bishop", "white"),
            createPiece("knight", "white"),
            createPiece("rook", "white")
        ]
    ];

    currentPlayer = "white";
    selectedSquare = null;
    gameOver = false;
    enPassantTarget = null;

    drawBoard();
    updateStatus();
}


function drawBoard() {

    boardElement.innerHTML = "";

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const square = document.createElement("div");

            square.classList.add("square");

            if ((row + col) % 2 === 0) {
                square.classList.add("white-square");
            } else {
                square.classList.add("black-square");
            }

            const piece = board[row][col];

            if (piece) {
                square.textContent =
                    pieces[piece.color][piece.type];
            }

            if (
                selectedSquare &&
                selectedSquare.row === row &&
                selectedSquare.col === col
            ) {
                square.classList.add("selected");
            }

            if (selectedSquare) {

                const moves = getLegalMoves(
                    selectedSquare.row,
                    selectedSquare.col
                );

                if (
                    moves.some(
                        move =>
                            move.row === row &&
                            move.col === col
                    )
                ) {
                    square.classList.add("valid");
                }
            }

            const currentPiece = board[row][col];

            if (
                currentPiece &&
                currentPiece.type === "king" &&
                isInCheck(currentPiece.color)
            ) {
                square.classList.add("check");
            }

            square.addEventListener(
                "click",
                function () {
                    handleSquareClick(row, col);
                }
            );

            boardElement.appendChild(square);
        }
    }
}


function handleSquareClick(row, col) {

    if (gameOver) {
        return;
    }

    const clickedPiece = board[row][col];


    if (selectedSquare === null) {

        if (
            clickedPiece &&
            clickedPiece.color === currentPlayer
        ) {

            selectedSquare = {
                row: row,
                col: col
            };

            drawBoard();
        }

        return;
    }


    if (
        clickedPiece &&
        clickedPiece.color === currentPlayer
    ) {

        selectedSquare = {
            row: row,
            col: col
        };

        drawBoard();

        return;
    }


    const legalMoves = getLegalMoves(
        selectedSquare.row,
        selectedSquare.col
    );

    const validMove = legalMoves.find(
        move =>
            move.row === row &&
            move.col === col
    );


    if (validMove) {

        makeMove(
            selectedSquare.row,
            selectedSquare.col,
            row,
            col,
            validMove
        );

        selectedSquare = null;

        currentPlayer =
            currentPlayer === "white"
                ? "black"
                : "white";

        drawBoard();

        checkGameStatus();

    } else {

        selectedSquare = null;

        drawBoard();
    }
}


function getLegalMoves(row, col) {

    const piece = board[row][col];

    if (!piece) {
        return [];
    }

    let moves =
        getPseudoLegalMoves(row, col, true);

    moves = moves.filter(move => {

        const testBoard = copyBoard();

        const oldBoard = board;

        board = testBoard;

        performMoveOnBoard(
            row,
            col,
            move.row,
            move.col,
            move
        );

        const stillInCheck =
            isInCheck(piece.color);

        board = oldBoard;

        return !stillInCheck;
    });

    return moves;
}


function getPseudoLegalMoves(
    row,
    col,
    includeSpecial
) {

    const piece = board[row][col];

    if (!piece) {
        return [];
    }

    const moves = [];


    // PAWN

    if (piece.type === "pawn") {

        const direction =
            piece.color === "white" ? -1 : 1;

        const startRow =
            piece.color === "white" ? 6 : 1;

        const nextRow = row + direction;

        if (
            isInside(nextRow, col) &&
            !board[nextRow][col]
        ) {

            moves.push({
                row: nextRow,
                col: col
            });

            const twoRow =
                row + direction * 2;

            if (
                row === startRow &&
                !board[twoRow][col]
            ) {

                moves.push({
                    row: twoRow,
                    col: col,
                    doublePawnMove: true
                });
            }
        }


        for (const dc of [-1, 1]) {

            const captureCol = col + dc;

            if (!isInside(nextRow, captureCol)) {
                continue;
            }

            const target =
                board[nextRow][captureCol];

            if (
                target &&
                target.color !== piece.color
            ) {

                moves.push({
                    row: nextRow,
                    col: captureCol
                });
            }


            if (
                includeSpecial &&
                enPassantTarget &&
                enPassantTarget.row === nextRow &&
                enPassantTarget.col === captureCol
            ) {

                moves.push({
                    row: nextRow,
                    col: captureCol,
                    enPassant: true
                });
            }
        }
    }


    // KNIGHT

    if (piece.type === "knight") {

        const knightMoves = [

            [-2, -1],
            [-2, 1],
            [-1, -2],
            [-1, 2],
            [1, -2],
            [1, 2],
            [2, -1],
            [2, 1]

        ];

        for (const [dr, dc] of knightMoves) {

            addMoveIfValid(
                moves,
                row + dr,
                col + dc,
                piece.color
            );
        }
    }


    // BISHOP

    if (piece.type === "bishop") {

        addSlidingMoves(
            moves,
            row,
            col,
            piece.color,

            [
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1]
            ]
        );
    }


    // ROOK

    if (piece.type === "rook") {

        addSlidingMoves(
            moves,
            row,
            col,
            piece.color,

            [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1]
            ]
        );
    }


    // QUEEN

    if (piece.type === "queen") {

        addSlidingMoves(
            moves,
            row,
            col,
            piece.color,

            [
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1],
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1]
            ]
        );
    }


    // KING

    if (piece.type === "king") {

        const kingMoves = [

            [-1, -1],
            [-1, 0],
            [-1, 1],
            [0, -1],
            [0, 1],
            [1, -1],
            [1, 0],
            [1, 1]

        ];

        for (const [dr, dc] of kingMoves) {

            addMoveIfValid(
                moves,
                row + dr,
                col + dc,
                piece.color
            );
        }


        if (
            includeSpecial &&
            !piece.hasMoved
        ) {

            if (
                canCastle(
                    row,
                    col,
                    "king"
                )
            ) {

                moves.push({
                    row: row,
                    col: col + 2,
                    castle: "king"
                });
            }


            if (
                canCastle(
                    row,
                    col,
                    "queen"
                )
            ) {

                moves.push({
                    row: row,
                    col: col - 2,
                    castle: "queen"
                });
            }
        }
    }

    return moves;
}


function addMoveIfValid(
    moves,
    row,
    col,
    color
) {

    if (!isInside(row, col)) {
        return;
    }

    const target = board[row][col];

    if (
        !target ||
        target.color !== color
    ) {

        moves.push({
            row: row,
            col: col
        });
    }
}


function addSlidingMoves(
    moves,
    row,
    col,
    color,
    directions
) {

    for (const [dr, dc] of directions) {

        let r = row + dr;
        let c = col + dc;

        while (isInside(r, c)) {

            const target = board[r][c];

            if (!target) {

                moves.push({
                    row: r,
                    col: c
                });

            } else {

                if (target.color !== color) {

                    moves.push({
                        row: r,
                        col: c
                    });
                }

                break;
            }

            r += dr;
            c += dc;
        }
    }
}


function isInside(row, col) {

    return (
        row >= 0 &&
        row < 8 &&
        col >= 0 &&
        col < 8
    );
}


function makeMove(
    fromRow,
    fromCol,
    toRow,
    toCol,
    move
) {

    performMoveOnBoard(
        fromRow,
        fromCol,
        toRow,
        toCol,
        move
    );
}


function performMoveOnBoard(
    fromRow,
    fromCol,
    toRow,
    toCol,
    move
) {

    const piece =
        board[fromRow][fromCol];


    // En passant

    if (move.enPassant) {

        const captureRow =
            piece.color === "white"
                ? toRow + 1
                : toRow - 1;

        board[captureRow][toCol] = null;
    }


    // Castling

    if (move.castle) {

        if (move.castle === "king") {

            board[toRow][5] =
                board[toRow][7];

            board[toRow][7] = null;

            if (board[toRow][5]) {
                board[toRow][5].hasMoved = true;
            }

        } else {

            board[toRow][3] =
                board[toRow][0];

            board[toRow][0] = null;

            if (board[toRow][3]) {
                board[toRow][3].hasMoved = true;
            }
        }
    }


    board[toRow][toCol] = piece;

    board[fromRow][fromCol] = null;

    piece.hasMoved = true;


    // Promotion

    if (
        piece.type === "pawn" &&
        (toRow === 0 || toRow === 7)
    ) {

        piece.type = "queen";
    }
}


function canCastle(
    row,
    col,
    side
) {

    const piece = board[row][col];

    if (
        !piece ||
        piece.type !== "king"
    ) {
        return false;
    }

    if (isInCheck(piece.color)) {
        return false;
    }


    const rookCol =
        side === "king" ? 7 : 0;

    const rook = board[row][rookCol];


    if (
        !rook ||
        rook.type !== "rook" ||
        rook.color !== piece.color ||
        rook.hasMoved
    ) {
        return false;
    }


    const between =
        side === "king"
            ? [5, 6]
            : [1, 2, 3];


    for (const c of between) {

        if (board[row][c]) {
            return false;
        }
    }


    const kingPath =
        side === "king"
            ? [5, 6]
            : [3, 2];


    for (const c of kingPath) {

        if (
            isSquareAttacked(
                row,
                c,
                piece.color === "white"
                    ? "black"
                    : "white"
            )
        ) {
            return false;
        }
    }

    return true;
}


function isInCheck(color) {

    const kingPosition =
        findKing(color);

    if (!kingPosition) {
        return true;
    }

    const enemy =
        color === "white"
            ? "black"
            : "white";

    return isSquareAttacked(
        kingPosition.row,
        kingPosition.col,
        enemy
    );
}


function findKing(color) {

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const piece = board[row][col];

            if (
                piece &&
                piece.type === "king" &&
                piece.color === color
            ) {

                return {
                    row: row,
                    col: col
                };
            }
        }
    }

    return null;
}


function isSquareAttacked(
    row,
    col,
    attackingColor
) {

    for (let r = 0; r < 8; r++) {

        for (let c = 0; c < 8; c++) {

            const piece = board[r][c];

            if (
                !piece ||
                piece.color !== attackingColor
            ) {
                continue;
            }


            // Pawn

            if (piece.type === "pawn") {

                const direction =
                    attackingColor === "white"
                        ? -1
                        : 1;

                if (
                    r + direction === row &&
                    Math.abs(c - col) === 1
                ) {

                    return true;
                }
            }


            // Knight

            if (piece.type === "knight") {

                const dr =
                    Math.abs(r - row);

                const dc =
                    Math.abs(c - col);

                if (
                    (dr === 2 && dc === 1) ||
                    (dr === 1 && dc === 2)
                ) {

                    return true;
                }
            }


            // King

            if (piece.type === "king") {

                if (
                    Math.max(
                        Math.abs(r - row),
                        Math.abs(c - col)
                    ) === 1
                ) {

                    return true;
                }
            }


            // Rook, Bishop, Queen

            if (
                piece.type === "rook" ||
                piece.type === "bishop" ||
                piece.type === "queen"
            ) {

                const dr = row - r;
                const dc = col - c;

                let validDirection = false;


                if (piece.type === "rook") {

                    validDirection =
                        dr === 0 ||
                        dc === 0;
                }


                if (piece.type === "bishop") {

                    validDirection =
                        Math.abs(dr) ===
                        Math.abs(dc);
                }


                if (piece.type === "queen") {

                    validDirection =
                        dr === 0 ||
                        dc === 0 ||
                        Math.abs(dr) ===
                        Math.abs(dc);
                }


                if (validDirection) {

                    const stepRow =
                        Math.sign(dr);

                    const stepCol =
                        Math.sign(dc);

                    let testRow =
                        r + stepRow;

                    let testCol =
                        c + stepCol;

                    let blocked = false;


                    while (
                        testRow !== row ||
                        testCol !== col
                    ) {

                        if (
                            board[testRow][testCol]
                        ) {

                            blocked = true;
                            break;
                        }

                        testRow += stepRow;
                        testCol += stepCol;
                    }


                    if (!blocked) {
                        return true;
                    }
                }
            }
        }
    }

    return false;
}


function checkGameStatus() {

    const moves =
        getAllLegalMoves(currentPlayer);


    if (moves.length === 0) {

        if (isInCheck(currentPlayer)) {

            const winner =
                currentPlayer === "white"
                    ? "Black"
                    : "White";

            statusElement.textContent =
                "Checkmate! " +
                winner +
                " wins!";

        } else {

            statusElement.textContent =
                "Stalemate! Draw!";
        }

        gameOver = true;

        return;
    }


    if (isInCheck(currentPlayer)) {

        statusElement.textContent =
            capitalize(currentPlayer) +
            " is in check!";

    } else {

        statusElement.textContent =
            capitalize(currentPlayer) +
            "'s turn";
    }
}


function getAllLegalMoves(color) {

    const allMoves = [];

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const piece = board[row][col];

            if (
                piece &&
                piece.color === color
            ) {

                const moves =
                    getLegalMoves(row, col);

                for (const move of moves) {

                    allMoves.push(move);
                }
            }
        }
    }

    return allMoves;
}


function copyBoard() {

    return board.map(row =>
        row.map(piece =>
            piece
                ? { ...piece }
                : null
        )
    );
}


function updateStatus() {

    statusElement.textContent =
        capitalize(currentPlayer) +
        "'s turn";
}


function capitalize(text) {

    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );
}


resetGame();
