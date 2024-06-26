const maxGuesses = 6;
let currentGuess = "";
let guessCount = 0;
let solution;
var timer;
var timeLeft = 120; // 2 minutes in seconds

window.onload = function() {
    fetchSolution();
};


function fetchSolution() {
    fetch("/get_solution/", { credentials: "same-origin", method: "GET" })
        .then((response) => {
            if (!response.ok) throw Error(response.statusText);
            return response.json();
        })
        .then((data) => {
            solution = data.solution;
            // Additional logic to start the game with this solution
        })
        .catch((error) => console.log(error));
}

document.addEventListener('DOMContentLoaded', () => {
    var socket = io();

    // Start button event listener
    document.getElementById('startButton').onclick = () => {
        socket.emit('start_game');
    };

    // Listening for timer updates from the server
    socket.on('update_timer', data => {
        document.getElementById('timer').innerHTML = data.time_left;
    });
});

socket.on('game_state', function(data) {
    if (data.time_left > 0) {
        timeLeft = data.time_left;
        startTimer();
    }
});

socket.on('game_started', function(data) {
    var startTime = new Date(data.start_time);
    var currentTime = new Date();
    var timeElapsed = Math.floor((currentTime - startTime) / 1000);
    timeLeft = Math.max(180 - timeElapsed, 0);
    startTimer();
});
socket.on('game_won', function(data) {
    // Update the message
    document.getElementById('winnerAnnouncement').textContent = `Game won by ${data.winner}! The correct word was: ${data.word}`;

    // Show the game won message
    document.getElementById('gameWonMessage').style.display = 'block';

    // Here, you can also handle any additional UI changes, like disabling game input
});

document.getElementById('startButton').addEventListener('click', function() {
    socket.emit('start_game');
});
function startTimer() {
    timer = setInterval(function() {
        timeLeft--;
        document.getElementById('timer').textContent = `Time left: ${timeLeft} seconds`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            // Handle end of game, no winner
        }
    }, 1000);
}
// Submit guess when the enter key is pressed
document.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        submitGuess();
    } else if (event.key === "Backspace") {
        deleteLastLetter();
    } else {
        const letter = event.key.toUpperCase();
        if (letter.length === 1 && letter >= 'A' && letter <= 'Z') {
            addLetter(letter);
        }
    }
});

function addLetter(letter) {
    if (currentGuess.length < 5) {
        currentGuess += letter;
        const cell = document.getElementById(`${username}-${guessCount}${currentGuess.length - 1}`);
        cell.textContent = letter;
    }
}

function deleteLastLetter() {
    if (currentGuess.length > 0) {
        const cell = document.getElementById(`${username}-${guessCount}${currentGuess.length - 1}`);
        cell.textContent = "";
        currentGuess = currentGuess.slice(0, -1);
    }
}

function submitGuess() {
    if (currentGuess.length != 5) {
        alert("Guess must be 5 letters!");
        return;
    }
    const data = {
        guess: currentGuess,
        username: username,
        solution: solution
    };

    // Send the data to the Flask server using fetch
    fetch('/submit_guess', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Success:', data);
        console.log('data is',data.result)
        if(data.result == "invalid")
        {
            console.log("Inside Failure If Statmenet")
            for (let i = 0; i < 5; i++) {
                document.getElementById(`${username}-${guessCount}${i}`).classList.add('always-shake');
            }
            // document.getElementById(`board-${username}`).classList.add('always-shake');
            // Remove the class after the animation ends
            setTimeout(function() {
                // document.getElementById(`board-${username}`).classList.remove('always-shake');
                for (let i = 0; i < 5; i++) {
                    document.getElementById(`${username}-${guessCount}${i}`).classList.remove('always-shake');
                }
            }, 500);
            return;
        }

        // Handle the valid response from the server  
        colorCodeGuess(currentGuess);
        currentGuess = "";
        guessCount++;
        
        if (currentGuess.toLowerCase() === solution.toLowerCase()) {
            socket.emit('submit_guess', { guess: currentGuess, username: username });
        }
        else {
            socket.emit('submit_multiplayer', {guess: currentGuess, username: username})
        }
        if (guessCount === maxGuesses) {
            alert("Game over! The word was: " + solution);
            fetchSolution();
            // Disable further input or reset the game
        }
        // Handle the response from the server  
        // ...
    })
    .catch((error) => {
        console.error('Error:', error);
    });

    // colorCodeGuess(currentGuess);
    //     // Construct the data to send

    // currentGuess = "";
    // guessCount++;
    
    // if (currentGuess.toLowerCase() === solution.toLowerCase()) {
    //     socket.emit('submit_guess', { guess: currentGuess, username: username });
    //     console.log("Confirmed Socket Answer Correct")
    // }
    // if (guessCount === maxGuesses) {
    //     alert("Game over! The word was: " + solution);
    //     // Disable further input or reset the game
    // }
}

function colorCodeGuess(guess) {
    for (let i = 0; i < 5; i++) {
        let cell = document.getElementById(`${username}-${guessCount}${i}`);
        let letter = guess[i];
        if (letter === solution[i]) {
            cell.classList.add("correct");
        } else if (solution.includes(letter)) {
            cell.classList.add("present");
        } else {
            cell.classList.add("absent");
        }
    }
}