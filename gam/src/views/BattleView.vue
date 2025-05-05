<template>
  <div class="battle" :style="{ backgroundImage: `url('/${backgroundImage}')` }" @click="handleBackgroundClick" :class="{ 'opponent-turn': game.activePlayer === 'opponent' }">
    <!-- Opponent's Area -->
    <div class="opponent-area player-zone">
      <div class="hand-zone">Opponent Hand ({{ game.opponent.hand.length }})</div> <!-- Show opponent hand count -->
      <div class="hero-zone opponent-hero" @click.stop="handleTargetClick({ type: 'hero', owner: 'opponent' })">
        Opponent Hero<br>
        HP: {{ game.opponent.hero.hp }} / Armor: {{ game.opponent.hero.armor }} <br>
        Mana: {{ game.opponent.mana.current }} / {{ game.opponent.mana.max }}
      </div>
      <div class="artifact-zone">
        <Card v-if="game.opponent.artifactSlot" :cardData="game.opponent.artifactSlot" :isPlayable="false" />
        <span v-else>Artifact</span> <!-- Placeholder text -->
      </div>
      <div class="deck-zone">Opponent Deck ({{ game.opponent.deck.length }})</div>
      <div class="board-zone opponent-board">
         Opponent Board
        <Card
            v-for="card in game.opponent.board"
            :key="card.instanceId"
            :cardData="card"
            isOnBoard
            :isOwnedByPlayer="false"
            @select-target="handleTargetClick"
         />
      </div>
    </div>

    <!-- Player's Area -->
    <div class="player-area player-zone">
      <div class="board-zone player-board" @click.stop="handleBoardClick">
          Player Board
        <Card
            v-for="card in game.player.board"
            :key="card.instanceId"
            :cardData="card"
            isOnBoard
            :isOwnedByPlayer="true"
            :isAttacking="game.selectedAttackerInstanceId === card.instanceId"
            @select-attacker="handleSelectAttacker"
         />
      </div>
      <div class="hero-zone player-hero">
         Player Hero<br>
         HP: {{ game.player.hero.hp }} / Armor: {{ game.player.hero.armor }} <br>
         Mana: {{ game.player.mana.current }} / {{ game.player.mana.max }}
      </div>
      <div class="artifact-zone" @click.stop="handleArtifactZoneClick">
          <Card v-if="game.player.artifactSlot" :cardData="game.player.artifactSlot" :isPlayable="false" />
          <span v-else>Artifact</span> <!-- Placeholder text -->
      </div>
      <div class="deck-zone">Player Deck ({{ game.player.deck.length }})</div>
      <div class="hand-zone">
         <Card
           v-for="card in playerHand"
           :key="card.instanceId"
           :cardData="card"
           :isPlayable="isCardPlayable(card) && !game.opponentThinking"
           :isSelected="game.selectedCardInstanceId === card.instanceId"
           @select-card="handleSelectCard"
         />
      </div>
    </div>

    <!-- Maybe End Turn button or other central elements -->
    <div class="center-area">
       <button @click="game.endTurn" :disabled="game.activePlayer !== 'player' || game.opponentThinking">
           End Turn ({{ game.activePlayer === 'player' ? 'Your Turn' : "Opponent's Turn" }})
       </button>
       <button @click="game.startGame" :disabled="game.opponentThinking">New Game</button>
        <div v-if="game.opponentThinking" class="thinking-indicator">Opponent is thinking...</div>
    </div>
  </div>
</template>

<script setup>
// Use <script setup> for cleaner Composition API usage
import { ref, onMounted, computed } from 'vue'
import Card from '../components/Card.vue' // Relative path from gam/src/views
import { useGameStore } from '../stores/game.js' // Relative path from gam/src/views

const backgroundImage = ref('ChatGPT Image 2025年5月2日 下午09_34_43.png'); // Updated filename

// Get the game store instance
const game = useGameStore();

// Compute player hand from store
const playerHand = computed(() => game.player.hand);
// Optional: computed properties for other parts of the state if needed
// const playerBoard = computed(() => game.player.board);
// const opponentBoard = computed(() => game.opponent.board);

// Function to check if a card is playable (basic check)
function isCardPlayable(card) {
  return game.activePlayer === 'player' && game.player.mana.current >= card.cost;
}

// Handler for selecting a card in hand
function handleSelectCard(cardInstanceId) {
  game.selectCard(cardInstanceId);
}

// Handler for clicking player board (for playing creatures from hand)
function handleBoardClick() {
    console.log("Board clicked");
    if (game.selectedCardInstanceId) {
        const selectedCard = playerHand.value.find(c => c.instanceId === game.selectedCardInstanceId);
        if (selectedCard && selectedCard.type === 'Creature') {
             console.log(`Attempting to play creature ${selectedCard.name} to board.`);
             game.playSelectedCard();
        } else if (selectedCard) {
            console.log(`Selected card ${selectedCard.name} (${selectedCard.type}) cannot be played onto the board this way.`);
        }
    } else {
        console.log("Board clicked with no card selected.");
    }
}

// Handler for clicking artifact zone (for playing artifacts from hand)
function handleArtifactZoneClick() {
    console.log("Artifact zone clicked");
    if (game.selectedCardInstanceId) {
        const selectedCard = playerHand.value.find(c => c.instanceId === game.selectedCardInstanceId);
        if (selectedCard && selectedCard.type === 'Artifact') {
             console.log(`Attempting to play artifact ${selectedCard.name}.`);
             game.playSelectedCard(); // Play the selected artifact
        } else if (selectedCard) {
             console.log(`Selected card ${selectedCard.name} (${selectedCard.type}) cannot be played as an artifact.`);
        }
    } else {
        console.log("Artifact zone clicked with no card selected.");
    }
}

// Handler for clicking player minion on board
function handleSelectAttacker(instanceId) {
    console.log("Player minion clicked - select attacker:", instanceId);
    game.selectAttacker(instanceId);
}

// Unified handler for clicking any potential target (opponent minion or hero)
function handleTargetClick(targetInfo) { // targetInfo from Card emit or hero click
    if (game.targetingMode === 'attack') {
        console.log("Target clicked while attacking:", targetInfo);
        game.selectAttackTarget(targetInfo);
    } else if (game.targetingMode === 'card') {
        console.log("Target clicked for card effect:", targetInfo);
        // TODO: game.playSelectedCard(targetInfo);
    } else {
        console.log("Target clicked with no action pending:", targetInfo);
    }
}

// Handler for clicking the background (to deselect card or attacker)
function handleBackgroundClick() {
    if (game.selectedCardInstanceId) {
        console.log("Background clicked, deselecting card.");
        game.selectCard(null);
    }
    if (game.selectedAttackerInstanceId) {
        console.log("Background clicked, deselecting attacker.");
        game.selectAttacker(null); // Call selectAttacker with null to deselect
    }
}

// Start the game when the component is mounted
onMounted(() => {
  game.startGame();
});

</script>

<style scoped>
.battle {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-size: cover;
  background-position: center;
  color: white;
  padding: 10px;
}

.player-zone {
  flex-grow: 1;
  display: grid;
  grid-template-areas:
    "hand hand hand deck ."
    "board board board hero artifact";
  grid-template-columns: auto auto auto 70px 70px;
  grid-template-rows: 80px auto;
  gap: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.3);
  margin-bottom: 8px;
}

/* Place grid items */
.opponent-area .hand-zone { grid-area: hand; background-color: rgba(0, 0, 255, 0.1); }
.opponent-area .hero-zone { grid-area: hero; background-color: rgba(0, 0, 255, 0.2); }
.opponent-area .artifact-zone { grid-area: artifact; background-color: rgba(128, 0, 128, 0.2); }
.opponent-area .deck-zone { grid-area: deck; background-color: rgba(0, 0, 255, 0.3); }
.opponent-area .board-zone { grid-area: board; background-color: rgba(0, 0, 255, 0.4); }

/* Reverse grid areas for the player */
.player-area {
  grid-template-areas:
    "board board board hero artifact"
    "hand hand hand deck .";
}

.player-area .hand-zone,
.opponent-area .hand-zone,
.player-area .board-zone,
.opponent-area .board-zone {
  /* Common styles for zones containing cards */
  display: flex;
  /* flex-wrap: wrap; Keep wrap for board, disable for hand below */
  justify-content: center;
  align-items: center; /* Align items vertically */
  gap: 4px; /* Reduced gap between cards */
  padding: 4px; /* Reduced padding */
  min-height: 80px; /* Adjusted min-height */
}

.player-area .hand-zone {
  grid-area: hand;
  background-color: rgba(255, 0, 0, 0.1);
  overflow-x: auto;
  flex-wrap: nowrap; /* Ensure hand cards don't wrap */
  justify-content: flex-start;
  align-items: flex-end; /* Align cards to the bottom of the hand zone */
  padding-bottom: 0; /* Remove bottom padding if aligning to bottom */
}

.player-area .board-zone,
.opponent-area .board-zone {
    flex-wrap: wrap; /* Allow board cards to wrap if needed */
    align-items: center; /* Center cards vertically on board */
    min-height: 150px; /* Ensure board has enough height */
}

.player-area .hero-zone { grid-area: hero; background-color: rgba(255, 0, 0, 0.2); }
.player-area .deck-zone { grid-area: deck; background-color: rgba(255, 0, 0, 0.3); }
.player-area .artifact-zone { grid-area: artifact; background-color: rgba(128, 0, 128, 0.4); }

.center-area {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-area button {
    margin: 0 10px;
    padding: 10px 15px;
}

/* Adjust hero/deck zone text alignment */
.hero-zone, .deck-zone {
    text-align: center;
    font-size: 0.9em;
    padding: 5px;
    border: 1px solid rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column; /* Stack text lines */
}

/* Style artifact zone */
.artifact-zone {
    border: 1px solid rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px; /* Match hand height */
    padding: 4px;
}

.opponent-hero,
.opponent-board .card {
    cursor: pointer; /* Indicate opponent units are targetable */
    /* Add potential targeting highlight on hover when attackTargetingMode is active */
}

.opponent-hero:hover,
.opponent-board .card:hover {
    /* Example hover effect when targeting */
    /* filter: brightness(1.2); */
}

.opponent-turn {
    /* Optional: slightly dim the player's side or add overlay during opponent's turn */
    /* filter: brightness(0.9); */
}

.thinking-indicator {
    margin-left: 20px;
    font-style: italic;
    color: #ccc;
}

/* Make player cards unclickable during opponent's turn */
.opponent-turn .player-area .card,
.opponent-turn .player-area .hero-zone,
.opponent-turn .player-area .artifact-zone,
.opponent-turn .player-area .deck-zone {
    pointer-events: none;
}

</style> 