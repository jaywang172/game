<template>
  <div :class="[
    'card',
     cardData.type.toLowerCase(),
     { 'playable': isPlayable },
     { 'selected': isSelected },
     { 'on-board': isOnBoard },
     { 'can-attack': isOnBoard && cardData.canAttack },
     { 'is-attacking': isAttacking },
     { 'has-taunt': hasTaunt }
     ]"
     @click="onClick">
    <div v-if="hasTaunt" class="taunt-indicator">🛡️</div>
    <div class="card-header">
      <span class="cost">{{ cardData.cost }}</span>
      <span class="name">{{ cardData.name }}</span>
    </div>
    <div class="card-image">
      <!-- Placeholder for card art -->
      <img v-if="cardArtUrl" :src="cardArtUrl" alt="Card Art">
      <div v-else class="image-placeholder"></div>
    </div>
    <div class="card-text">
      <p>{{ cardData.text }}</p>
    </div>
    <div class="card-stats" v-if="cardData.type === 'Creature'">
      <span class="attack">{{ cardData.attack }}</span>
      <span class="health">{{ cardData.health }}</span>
    </div>
     <div class="card-stats durability" v-if="cardData.type === 'Artifact' && cardData.durability">
        <span class="durability-icon">⏳</span> <!-- Simple icon -->
      <span class="durability-value">{{ cardData.durability }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Card',
  props: {
    cardData: {
      type: Object,
      required: true
    },
    isPlayable: {
      type: Boolean,
      default: false
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    isOnBoard: { type: Boolean, default: false },
    isOwnedByPlayer: { type: Boolean, default: false },
    isAttacking: { type: Boolean, default: false },
  },
  emits: ['select-card', 'select-attacker', 'select-target'],
  computed: {
    // Placeholder for getting actual card art URL later
    cardArtUrl() {
      // Example: return `/card-art/${this.cardData.id}.jpg`;
      return null; // Return null for now to show placeholder
    },
    hasTaunt() {
      return this.cardData.mechanics?.includes('Taunt');
    }
  },
  methods: {
    onClick() {
      if (this.isOnBoard) {
        if (this.isOwnedByPlayer) {
          this.$emit('select-attacker', this.cardData.instanceId);
        } else {
          this.$emit('select-target', { type: 'minion', owner: 'opponent', instanceId: this.cardData.instanceId });
        }
      } else {
        this.$emit('select-card', this.cardData.instanceId);
      }
    }
  }
}
</script>

<style scoped>
.card {
  border: 2px solid #a0a0a0;
  border-radius: 10px;
  width: 120px;
  background-color: #e0e0e0;
  padding: 8px;
  margin: 4px;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  font-family: sans-serif;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease;
}

.card:hover {
  transform: scale(1.05);
}

.card.creature { background-color: #f0dcc4; border-color: #8b4513; }
.card.spell { background-color: #c4e1f0; border-color: #4682b4; }
.card.artifact { background-color: #d8bfd8; border-color: #8a2be2; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.cost {
  font-size: 1.3em;
  font-weight: bold;
  color: #fff;
  background-color: #007bff;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: -4px;
  left: -4px;
  border: 2px solid white;
}

.name {
  font-size: 0.8em;
  font-weight: bold;
  text-align: center;
  flex-grow: 1;
  margin-left: 26px;
  margin-right: 5px;
  color: #000;
}

.card-image {
  height: 65px;
  background-color: #ccc;
  margin-bottom: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.card-image img {
  max-width: 100%;
  max-height: 100%;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  background-color: #bbb;
  border: 1px dashed #999;
}

.card-text {
  font-size: 0.7em;
  background-color: rgba(255, 255, 255, 0.6);
  padding: 4px;
  border-radius: 5px;
  min-height: 30px;
  margin-bottom: 22px;
}

.card-text p {
  margin: 0;
  color: #000;
}

.card-stats {
  position: absolute;
  bottom: 4px;
  width: calc(100% - 16px);
  display: flex;
  justify-content: space-between;
}

.attack, .health, .durability-value {
  font-size: 1.1em;
  font-weight: bold;
  color: #fff;
  background-color: #dc3545;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid white;
}

.health { background-color: #28a745; }

.durability {
    justify-content: flex-end;
}

.durability-value {
    background-color: #6c757d;
}

.durability-icon {
    margin-right: 2px;
    font-size: 1em;
}

.card.playable {
  box-shadow: 0 0 10px 3px #0f0;
  cursor: pointer;
}

.card.selected {
    outline: 2px solid #00ffff;
    box-shadow: 0 0 12px 4px #00ffff;
    transform: scale(1.06);
}

.card:not(.playable) {
    /* Optionally add styles for non-playable cards, e.g., slightly dimmed */
    /* filter: grayscale(50%); */
}

.card.on-board {
    margin: 2px;
}

.card.can-attack {
    border: 3px solid #2eff31;
    cursor: crosshair;
}

.card.is-attacking {
    border: 3px solid #ff312e;
    outline: 2px solid #ff312e;
    box-shadow: 0 0 15px 5px #ff312e;
    transform: scale(1.08);
}

.card.has-taunt {
    /* Add a distinct style, maybe a thicker border or background pattern */
    /* border-style: dashed; */
}

.taunt-indicator {
    position: absolute;
    bottom: 25px; /* Position above stats */
    left: 50%;
    transform: translateX(-50%);
    font-size: 1.5em;
    opacity: 0.7;
    pointer-events: none; /* Don't interfere with clicks */
    text-shadow: 1px 1px 2px black;
}

/* Adjust card-text margin if taunt indicator overlaps */
.card-text {
    /* ... existing styles ... */
   /* margin-bottom: 40px; Increased margin if taunt indicator is tall */
}

</style> 