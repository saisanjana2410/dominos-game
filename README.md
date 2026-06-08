# Chicken Foot House Rules

A browser-based implementation of **Chicken Foot Dominoes** built around a custom family rulebook.

Play through all **13 rounds** of a Double-Twelve domino set, manage chicken feet, use wild twelves strategically, and try to finish with the **lowest score** before the bot does.

---

## Live Demo

https://sanjanas-dominos.netlify.app/
---

## Features

* Full Double-Twelve domino set (91 tiles)
* Complete 13-round match progression
* Four-arm center opening double
* Custom "Wild 12" house rule
* Chicken Foot mechanics
* Smart bot opponent
* Interactive board with pan and zoom controls
* Match leaderboard for the current session
* Responsive design for desktop and mobile
* Built with vanilla HTML, CSS, and JavaScript

---

## House Rules Included

This version follows a specific family variation of Chicken Foot:

### Four-Armed Center Double

The opening double sits in the center and immediately creates four playable arms.

### Chicken Foot Doubles

Any double played after the opening double creates a Chicken Foot that must be completed before play can continue elsewhere.

### Wild Twelves

Every tile containing a **12** is wild except the **12-12** tile.

Wild tiles may be played on any open end and take on the value they are played against.

### Draw One, Then Pass

If a player has no legal move:

1. Draw one tile from the boneyard.
2. Play it if possible.
3. Otherwise pass.

### Scoring

At the end of each round:

* The player who empties their hand scores zero.
* Opponents add the remaining pips in their hand to their total score.
* Lowest cumulative score wins after 13 rounds.

---

## Controls

### Playing Tiles

1. Click a highlighted tile in your hand.
2. Click a highlighted open end on the board.

### Board Navigation

* Drag to pan around the table
* Scroll to zoom
* Use the zoom controls to zoom in, zoom out, or reset the view

---

## Technologies

* HTML5
* CSS3
* Vanilla JavaScript

No frameworks, build tools, accounts, databases, or external dependencies required.

---


## Future Ideas

* Two-player local mode
* Online multiplayer
* Difficulty settings
* Persistent leaderboard
* Statistics tracking
* Custom rule presets
* Sound effects and animations


