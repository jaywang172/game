# Card Game Project

A turn-based card game built with Vue.js and Pinia.

## How to Play

1.  **Start Game:** Click the "New Game" button to begin. Both players start with a set amount of health, mana, and draw their initial hand.
2.  **Your Turn:**
    *   You gain mana, draw a card, and your minions capable of attacking are ready.
    *   **Playing Cards:** Click on a card in your hand.
        *   **Creatures:** Click the player's board area to summon the creature.
        *   **Spells:** If the spell requires a target (indicated visually or by card text), click on a valid target (minion or hero). If it doesn't require a target, clicking the card plays it immediately.
        *   **Artifacts:** Click the player's artifact zone to equip the artifact.
        *   You can only play cards if you have enough mana. The cost is deducted upon playing.
    *   **Attacking:**
        *   Click on one of your ready minions on the board to select it as an attacker.
        *   Click on a valid enemy target (minion or the opponent's hero) to perform the attack. Minions with **Taunt** must be attacked first.
        *   Minions generally cannot attack the turn they are played unless they have a special ability like **Charge** (not yet implemented) or are granted an extra attack (e.g., by Time Rift Wielder).
    *   **Ending Turn:** Click the "End Turn" button when you have finished your actions.
3.  **Opponent's Turn:** The AI opponent will take its turn, playing cards and attacking. Their actions will be visualized on the board.
4.  **Winning/Losing:** The game ends when one hero's health drops to 0 or below.

## Features

*   Player vs AI gameplay
*   Turn-based system with mana progression.
*   Card drawing, playing, and targeting.
*   Diverse card types: Creatures, Spells, Artifacts.
*   Implemented card mechanics:
    *   **Battlecry:** Effect triggers when played from hand.
    *   **Deathrattle:** Effect triggers when the minion is destroyed.
    *   **Taunt:** Enemy minions must attack minions with Taunt.
    *   **Divine Shield:** Negates the first source of damage taken.
    *   **Freeze:** Affected unit cannot attack for one turn.
    *   **Combo:** Additional effect if another card was played this turn.
    *   **Spellburst:** One-time effect after you cast a spell.
    *   **Silence:** Removes card text, enchantments, and current effects.
    *   Regeneration/Triggered Effects (e.g., on damage, on minion death).
*   Artifact system with ongoing or triggered effects.
*   Fatigue system when the deck runs out.

## Technical Details & Algorithms

*   **Frontend:** Vue.js 3 (Composition API) for reactive UI components.
*   **State Management:** Pinia is used to manage the complex game state centrally (`game.js` store). This includes player/opponent hands, boards, decks, mana, hero status, etc.
*   **Card Database:** Card definitions are stored in a simple JavaScript object (`cards.js`).
*   **Card Instances:** `createCardInstance` function generates unique copies of cards for gameplay, assigning unique IDs and tracking state (damage, effects, etc.).
*   **Shuffling:** Uses the Fisher-Yates (Knuth) shuffle algorithm for randomizing deck order at the start of the game.
*   **AI Logic:**
    *   **Card Playing:** The AI (`opponentPlayCards`) iterates through its hand, playing cards it can afford, prioritizing creatures and then spells/artifacts based on simple heuristics (currently plays if mana allows).
    *   **Attacking:** The AI (`opponentAttackPhase`) identifies its available attackers and potential targets. It prioritizes attacking **Taunt** minions first. If no taunts exist, it currently selects targets somewhat randomly (can be improved).
*   **Game Logic:** Core game actions (drawing, dealing damage, checking deaths, resolving effects) are handled by functions within the Pinia store.
*   **Effect Resolution:** Card mechanics like Battlecry, Deathrattle, Spellburst, etc., are resolved by dedicated functions (`_resolveBattlecry`, `_resolveDeathrattle`, `_triggerSpellburst`) called at appropriate points in the game flow (e.g., after a card is played, after combat, at the end of a turn).
*   **Targeting System:** Implemented through `targetingMode` state, allowing the UI to differentiate between selecting a card, selecting an attacker, and selecting a target for an attack or spell.

## Getting Started

(Instructions on how to set up and run the project will be added later)
