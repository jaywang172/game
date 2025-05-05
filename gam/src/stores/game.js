import { defineStore } from 'pinia'
import { ref, computed } from 'vue' // Import ref and computed for setup store syntax
import { cardDatabase } from '../data/cards.js' // Assuming cards.js is in src/data

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Helper to create a deep copy of card with a unique instance ID
let instanceCounter = 0;
function createCardInstance(cardId) {
    const baseCard = cardDatabase.find(c => c.id === cardId);
    if (!baseCard) return null;
    const health = baseCard.hasOwnProperty('health') ? baseCard.health : null;
    const attack = baseCard.hasOwnProperty('attack') ? baseCard.attack : null;
    const isCreature = baseCard.type === 'Creature';

    return {
        ...JSON.parse(JSON.stringify(baseCard)), // Deep copy
        instanceId: `inst-${instanceCounter++}`,
        currentHealth: health,
        currentAttack: attack,
        isFrozen: false,
        canAttack: false,
        effects: [], // Placeholder for buffs/debuffs
        ...(isCreature && {
            hasReincarnated: false,
            hasDivineShield: baseCard.mechanics?.includes('Divine Shield') ?? false,
            isSilenced: false // Add silenced flag
        })
    };
}

// Need to define where cardDatabase is. Let's assume src/data/cards.js for now.
// Ensure cardDatabase is imported correctly relative to this file (src/stores/game.js)
// Assuming 'src/data/cards.js' exists.
// import { cardDatabase } from '../data/cards.js';
// If cardDatabase is not loading, check the path.

export const useGameStore = defineStore('game', () => {
  // --- State ---
  const turn = ref(1);
  const activePlayer = ref('player'); // 'player' or 'opponent'
  const selectedCardInstanceId = ref(null); // ID of the card selected in hand
  const selectedAttackerInstanceId = ref(null); // For creatures on board attacking
  const targetingMode = ref(null); // null, 'card', 'attack'
  const opponentThinking = ref(false); // To disable UI during opponent turn

  const player = ref({
    deck: [],
    hand: [],
    board: [],
    artifactSlot: null, // Add artifact slot
    hero: { hp: 30, armor: 0, maxHp: 30 },
    mana: { current: 7, max: 7 }, // Keep the 7 mana for testing
    graveyard: [],
    fatigue: 1,
    playedCardThisTurn: false,
    playedCardLastTurn: false // Track for Combo
  });

  const opponent = ref({
    deck: [],
    hand: [],
    board: [],
    artifactSlot: null, // Add artifact slot
    hero: { hp: 30, armor: 0, maxHp: 30 },
    mana: { current: 0, max: 0 },
    graveyard: [],
    fatigue: 1,
    playedCardThisTurn: false,
    playedCardLastTurn: false // Track for Combo
  });

  // --- Helper Functions ---
  function _findEntity(instanceId) {
      const pMinion = player.value.board.find(m => m.instanceId === instanceId);
      if (pMinion) return { entity: pMinion, owner: 'player', type: 'minion' };
      const oMinion = opponent.value.board.find(m => m.instanceId === instanceId);
      if (oMinion) return { entity: oMinion, owner: 'opponent', type: 'minion' };
      // Could add heroes later if needed
      return null;
  }

  function _dealDamage(targetInfo, damageAmount, sourceInfo) {
      console.log(`[Damage] Dealing ${damageAmount} damage from ${sourceInfo?.entity?.name ?? 'unknown'} to ${targetInfo.type} ${targetInfo.owner} ${targetInfo?.instanceId ?? 'hero'}`);
      let targetEntity = null;
      if (targetInfo.type === 'minion') {
          const targetPlayer = targetInfo.owner === 'player' ? player.value : opponent.value;
          targetEntity = targetPlayer.board.find(m => m.instanceId === targetInfo.instanceId);
      } else if (targetInfo.type === 'hero') {
          targetEntity = targetInfo.owner === 'player' ? player.value.hero : opponent.value.hero;
      }

      if (!targetEntity) {
          console.error("[Damage] Target entity not found:", targetInfo);
          return;
      }

      // Check for Divine Shield on Minions
      if (targetInfo.type === 'minion' && targetEntity.hasDivineShield) {
          console.log(`[Divine Shield] ${targetEntity.name} loses Divine Shield.`);
          targetEntity.hasDivineShield = false;
          // Damage is negated
          // Check deaths just in case losing shield triggers something? Unlikely now.
          // _checkDeaths(); // Probably not needed here
          return; // Stop damage calculation
      }

      if (targetInfo.type === 'hero') {
          let damageLeft = damageAmount;
          if (targetEntity.armor > 0) {
              const armorDamage = Math.min(damageLeft, targetEntity.armor);
              targetEntity.armor -= armorDamage;
              damageLeft -= armorDamage;
              console.log(`[Damage] Target hero armor reduced to ${targetEntity.armor}`);
          }
          if (damageLeft > 0) {
              targetEntity.hp -= damageLeft;
              console.log(`[Damage] Target hero HP reduced to ${targetEntity.hp}`);
          }
      } else { // Minion
          targetEntity.currentHealth -= damageAmount;
          console.log(`[Damage] Target minion ${targetEntity.name} HP reduced to ${targetEntity.currentHealth}`);

          // --- Trigger "On Damaged" effects --- 
          // Card #2: RegenerateOnDamage
          if (targetEntity.mechanics?.includes('RegenerateOnDamage')) {
              // Heal 1, simple version (no max health check for now)
              if (targetEntity.currentHealth > 0) { // Don't regenerate if already dead from this damage
                  targetEntity.currentHealth += 1;
                  console.log(`[RegenerateOnDamage] ${targetEntity.name} regenerates 1 HP to ${targetEntity.currentHealth}.`);
              }
          }
          // TODO: Add checks for other "on damaged" effects (e.g., Enrage)
      }

      // Check for death after damage
      _checkDeaths();

      // TODO: Trigger damage events (e.g., Enrage)
  }

  function _checkDeaths() {
      let somethingDied = false;
      const deathrattlesToResolve = []; // Collect deathrattles before resolving

      // Check player board
      player.value.board = player.value.board.filter(minion => {
          if (minion.currentHealth <= 0) {
              // Check for Reincarnate (Artifact #19)
              const ownerArtifact = player.value.artifactSlot;
              if (ownerArtifact?.id === 19 && !minion.hasReincarnated) {
                  console.log(`[Reincarnate] Player minion ${minion.name} reincarnates due to ${ownerArtifact.name}.`);
                  minion.currentHealth = 1;
                  minion.hasReincarnated = true;
                  // Reset other statuses? Maybe clear effects? For now just reset health.
                  return true; // Keep the minion on the board
              } else {
                  // Dies normally
                  console.log(`[Death] Player minion ${minion.name} died.`);
                  player.value.graveyard.push(minion);
                  if (minion.mechanics?.includes('Deathrattle')) {
                      deathrattlesToResolve.push({ card: minion, owner: 'player' });
                  }
                  somethingDied = true; // Mark that a minion was actually removed
                  return false; // Remove from board
              }
          }
          return true;
      });
      // Check opponent board
       opponent.value.board = opponent.value.board.filter(minion => {
          if (minion.currentHealth <= 0) {
              // Check for Reincarnate (Artifact #19)
              const ownerArtifact = opponent.value.artifactSlot;
               if (ownerArtifact?.id === 19 && !minion.hasReincarnated) {
                  console.log(`[Reincarnate] Opponent minion ${minion.name} reincarnates due to ${ownerArtifact.name}.`);
                  minion.currentHealth = 1;
                  minion.hasReincarnated = true;
                  return true; // Keep the minion on the board
              } else {
                  // Dies normally
                  console.log(`[Death] Opponent minion ${minion.name} died.`);
                  opponent.value.graveyard.push(minion);
                  if (minion.mechanics?.includes('Deathrattle')) {
                      deathrattlesToResolve.push({ card: minion, owner: 'opponent' });
                  }
                  somethingDied = true; // Mark that a minion was actually removed
                  return false; // Remove from board
              }
          }
          return true;
      });

      // Resolve collected deathrattles *after* all dead minions are removed (and reincarnations checked)
      if (deathrattlesToResolve.length > 0) {
          console.log(`[Deathrattle] Resolving ${deathrattlesToResolve.length} deathrattles...`);
          deathrattlesToResolve.forEach(({ card, owner }) => {
              _resolveDeathrattle(card, owner);
          });
          // Since deathrattles can summon or deal damage, check deaths again
          // Avoid infinite loops: add a depth counter if necessary, but for now, one re-check is likely sufficient.
          console.log(`[Deathrattle] Re-checking deaths after resolution.`);
          _checkDeaths(); // Recursive call - potential danger, monitor carefully
          return; // Exit the current _checkDeaths call to prevent duplicate hero checks below
      }

      // Check heroes (only if no deathrattles caused a recursive call)
      if (player.value.hero.hp <= 0) {
          console.log("[Death] Player hero died! Game Over!");
          // TODO: Set game over state
      }
       if (opponent.value.hero.hp <= 0) {
          console.log("[Death] Opponent hero died! You Win!");
          // TODO: Set game over state
      }

      if (somethingDied) {
          console.log("[Death] Minions removed from board.");
          // TODO: Trigger global death events if any
      }
  }

  function _resolveDeathrattle(card, owner) {
      console.log(`[Deathrattle] Resolving for ${card.name} (ID: ${card.id}) from ${owner}`);
      const playerBoard = owner === 'player' ? player.value.board : opponent.value.board;
      const opponentGraveyard = owner === 'player' ? opponent.value.graveyard : player.value.graveyard;

      switch (card.id) {
          case 3: // 亡語妖精 (Deathrattle Fairy)
              console.log(`[Deathrattle] ${owner} drawing a card.`);
              drawCard(owner);
              break;

          case 8: // 靈魂操縱者 (Soul Manipulator)
              const potentialMinions = opponentGraveyard.filter(c => c.type === 'Creature');
              if (potentialMinions.length > 0 && playerBoard.length < 7) {
                  const randomIndex = Math.floor(Math.random() * potentialMinions.length);
                  const minionToResurrect = potentialMinions[randomIndex];

                  // Remove from opponent's graveyard
                  const graveIndex = opponentGraveyard.findIndex(c => c.instanceId === minionToResurrect.instanceId);
                  if (graveIndex !== -1) {
                      opponentGraveyard.splice(graveIndex, 1);
                  }

                  // Create a fresh instance and add to owner's board
                  const newInstance = createCardInstance(minionToResurrect.id); // Use base ID
                  if (newInstance) {
                      newInstance.canAttack = false; // Summoning sickness applies
                      playerBoard.push(newInstance);
                      console.log(`[Deathrattle] ${owner} resurrected ${newInstance.name} (Instance: ${newInstance.instanceId}) from opponent's graveyard.`);
                  } else {
                      console.error(`[Deathrattle] Failed to create instance for resurrection (ID: ${minionToResurrect.id})`);
                  }
              } else {
                  console.log(`[Deathrattle] Soul Manipulator found no valid targets in opponent's graveyard or ${owner}'s board is full.`);
              }
              break;

          // Add other deathrattles here
          default:
              console.log(`[Deathrattle] No specific effect defined for ${card.name} (ID: ${card.id})`);
      }
  }

  // --- Card Effect Resolvers ---

  function _resolveBattlecry(card, owner, targetInfo) {
      console.log(`[Battlecry] Resolving for ${card.name} (ID: ${card.id}) played by ${owner}`);
      const sourceInfo = { entity: card, owner: owner, type: 'minion' }; // For damage source

      switch (card.id) {
          case 1: // 赤焰龍裔 (Redflame Dragonspawn)
              const targetOwner = owner === 'player' ? 'opponent' : 'player';
              const targets = [];
              // Target opponent's minions
              if (targetOwner === 'opponent') {
                  opponent.value.board.forEach(minion => targets.push({ type: 'minion', owner: 'opponent', instanceId: minion.instanceId }));
                  targets.push({ type: 'hero', owner: 'opponent' });
              } else { // Target player's minions
                  player.value.board.forEach(minion => targets.push({ type: 'minion', owner: 'player', instanceId: minion.instanceId }));
                  targets.push({ type: 'hero', owner: 'player' });
              }
              console.log(`[Battlecry] 赤焰龍裔 targets:`, targets);
              targets.forEach(target => {
                  _dealDamage(target, 2, sourceInfo); // Deal 2 damage
              });
              break;

          case 5: // 時間裂隙者 (Time Riftwalker)
              // TODO: Requires target selection. Log for now.
              console.log(`[Battlecry] 時間裂隙者 requires target selection (Not implemented yet).`);
              if (!targetInfo || targetInfo.type !== 'minion' || targetInfo.owner !== owner) {
                  console.error(`[Battlecry] Invalid target for 時間裂隙者:`, targetInfo);
                  return;
              }
              const targetMinion = _findEntity(targetInfo.instanceId);
              if (targetMinion && targetMinion.entity) {
                  targetMinion.entity.canAttack = true; // Allow to attack again
                  // TODO: Need a way to track attacks per turn for Windfury-like effects
                  // For now, just setting canAttack = true allows one more attack if it hasn't attacked.
                  // If it *has* attacked, this won't grant an *extra* attack without more logic.
                  console.log(`[Battlecry] ${targetMinion.entity.name} can attack again.`);
              } else {
                  console.error(`[Battlecry] Target minion ${targetInfo.instanceId} not found for 時間裂隙者.`);
              }
              break;

          // Add other battlecries here
          default:
              console.log(`[Battlecry] No specific effect defined for ${card.name} (ID: ${card.id})`);
      }
       // Check for deaths caused by Battlecry immediately
       _checkDeaths();
  }

  function _resolveSpellEffect(card, owner, targetInfo) {
      console.log(`[Spell] Resolving ${card.name} (ID: ${card.id}) played by ${owner}. Target:`, targetInfo);
      const sourceInfo = { entity: card, owner: owner, type: 'spell' }; // For damage source

      switch (card.id) {
          case 11: // 寒霜爆裂 (Frost Blast)
              if (!targetInfo) {
                  console.error(`[Spell] Frost Blast requires a target!`);
                  return; // Should have been caught earlier
              }
              // Validate target type (enemy character)
              const targetIsEnemy = targetInfo.owner !== owner;
              const targetIsCharacter = targetInfo.type === 'minion' || targetInfo.type === 'hero';
              if (!targetIsEnemy || !targetIsCharacter) {
                  console.error(`[Spell] Invalid target type for Frost Blast:`, targetInfo);
                  return; // Should have been caught earlier by UI/targeting logic
              }

              console.log(`[Spell] Frost Blast targeting ${targetInfo.type} ${targetInfo.owner} ${targetInfo.instanceId ?? 'hero'}`);
              _dealDamage(targetInfo, 3, sourceInfo);
              // Implement Freeze mechanic
              const targetEntityData = targetInfo.type === 'minion' ? _findEntity(targetInfo.instanceId) : null;
              const targetHero = targetInfo.type === 'hero' ? (targetInfo.owner === 'player' ? player.value.hero : opponent.value.hero) : null;

              if (targetEntityData?.entity) {
                  targetEntityData.entity.isFrozen = true;
                  console.log(`[Freeze] Minion ${targetEntityData.entity.name} is now frozen.`);
              } else if (targetHero && targetInfo.type === 'hero') {
                  // Freezing heroes currently has no effect, but we can track it.
                  // We might need an isFrozen flag on the hero object itself.
                  // For now, just log it.
                  console.log(`[Freeze] ${targetInfo.owner} hero is now frozen (effect not implemented).`);
                  // Example if hero had flag: targetHero.isFrozen = true;
              } else {
                  console.warn(`[Freeze] Could not find target to freeze after Frost Blast damage:`, targetInfo);
              }
              break;

          case 14: // 烈焰護罩 (Flame Ward)
              if (!targetInfo || targetInfo.type !== 'minion' || targetInfo.owner !== owner) {
                   console.error(`[Spell] Invalid target for Flame Ward: Must be a friendly minion. Target:`, targetInfo);
                   return;
              }
              const targetMinionData = _findEntity(targetInfo.instanceId);
              if (!targetMinionData) {
                   console.error(`[Spell] Target minion ${targetInfo.instanceId} not found for Flame Ward.`);
                   return;
              }
              const targetMinion = targetMinionData.entity;
              // Define the effect object
              const flameWardEffect = {
                  id: 'flame_ward_effect', // Unique ID for this type of effect
                  sourceCardId: 14, // ID of the card that granted the effect
                  trigger: 'onAttacked', // When does this trigger?
                  action: 'dealDamage', // What does it do?
                  value: 3, // How much damage?
                  target: 'attacker' // Who does it target?
              };
              // Add the effect to the minion
              if (!targetMinion.effects) targetMinion.effects = []; // Ensure effects array exists
              targetMinion.effects.push(flameWardEffect);
              console.log(`[Spell] Applied Flame Ward effect to ${targetMinion.name}.`);
              break;

          // Add other spell effects here
          default:
              console.log(`[Spell] No specific effect defined for ${card.name} (ID: ${card.id})`);
      }

      // Check for deaths caused by the spell
      _checkDeaths();
  }

  // --- Helper Functions ---
  function _getEffectiveCost(card, owner) {
      if (!card) return 0; // Should not happen

      const playerState = owner === 'player' ? player.value : opponent.value;
      const artifact = playerState.artifactSlot;

      if (artifact?.id === 20 && artifact.remainingDuration > 0) {
          const reducedCost = Math.max(1, card.cost - 1);
          // console.log(`[Cost] ${card.name} base cost ${card.cost}, reduced to ${reducedCost} by ${artifact.name}`);
          return reducedCost;
      }
      return card.cost;
  }

  // --- Actions ---

  function initializeDecks() {
      // Check if cardDatabase is loaded
      if (!cardDatabase || cardDatabase.length === 0) {
          console.error("Card database is empty or not loaded!");
          return;
      }
      const allCardIds = cardDatabase.map(c => c.id);
      // Simple deck: just shuffle all available cards for now
      const pDeckIds = [...allCardIds];
      const oDeckIds = [...allCardIds];

      player.value.deck = shuffle(pDeckIds.map(id => createCardInstance(id)).filter(Boolean)); // Filter out nulls if card not found
      opponent.value.deck = shuffle(oDeckIds.map(id => createCardInstance(id)).filter(Boolean));
      player.value.fatigue = 1;
      opponent.value.fatigue = 1;
      instanceCounter = 0;
  }

  function drawCard(targetPlayer) {
      console.log('[drawCard] Called for:', targetPlayer);
      const target = targetPlayer === 'player' ? player.value : opponent.value;

      console.log('[drawCard] Deck length:', target.deck.length, 'Hand length:', target.hand.length);
      if (target.deck.length > 0) {
          if (target.hand.length < 10) {
              const drawnCard = target.deck.shift();
              if (drawnCard) {
                  target.hand.push(drawnCard);
                  console.log('[drawCard] Card drawn and pushed:', drawnCard?.name ?? '[Card Undefined]'); // Safer logging
              }
          } else {
              target.deck.shift(); // Burn card
              console.log(`${targetPlayer} burned a card (hand full)`);
          }
      } else {
          target.hero.hp -= target.fatigue;
          console.log(`${targetPlayer} took ${target.fatigue} fatigue damage`);
          target.fatigue++;
      }
  }

 function startGame() {
    initializeDecks();
    turn.value = 1;
    activePlayer.value = 'player';
    player.value.mana = { current: 7, max: 7 };
    opponent.value.mana = { current: 0, max: 0 };
    player.value.hand = [];
    opponent.value.hand = [];
    player.value.board = [];
    opponent.value.board = [];
    player.value.graveyard = [];
    opponent.value.graveyard = [];
    player.value.hero = { hp: 30, armor: 0, maxHp: 30 };
    opponent.value.hero = { hp: 30, armor: 0, maxHp: 30 };
    player.value.playedCardThisTurn = false;
    opponent.value.playedCardThisTurn = false;
    player.value.playedCardLastTurn = false;
    opponent.value.playedCardLastTurn = false;

    // Initial draw
    for (let i = 0; i < 3; i++) { drawCard('player'); }
    for (let i = 0; i < 4; i++) { drawCard('opponent'); }

     player.value.board.forEach(c => c.canAttack = true);
     opponent.value.board.forEach(c => c.canAttack = true);

    console.log("Game Started!");
 }

 function endTurn() {
     const currentPlayer = activePlayer.value === 'player' ? player.value : opponent.value;
     const nextPlayer = activePlayer.value === 'player' ? opponent.value : player.value;
     const currentPlayerName = activePlayer.value;
     const nextPlayerName = activePlayer.value === 'player' ? 'opponent' : 'player';

     console.log(`[Turn End] Ending ${currentPlayerName}'s turn ${turn.value}.`);

     // Reset statuses for the player whose turn just ended
     currentPlayer.board.forEach(minion => {
         if (minion) {
             minion.canAttack = true; // Generally reset attack readiness
         }
     });
     currentPlayer.playedCardThisTurn = false;
     if (currentPlayerName === 'player') {
        selectedCardInstanceId.value = null;
        selectedAttackerInstanceId.value = null;
        targetingMode.value = null;
     }

     // --- Start of Turn Sequence ---
     // Switch active player
     activePlayer.value = nextPlayerName;

     // Determine turn number
     if (activePlayer.value === 'player') {
         turn.value++;
         console.log(`[Turn Start] Player turn ${turn.value} beginning.`);
     } else {
         console.log(`[Turn Start] Opponent turn ${turn.value} beginning.`);
     }

     // Update Combo tracking state *before* resetting playedCardThisTurn
     nextPlayer.playedCardLastTurn = currentPlayer.playedCardThisTurn;
     console.log(`[Turn Start] ${nextPlayerName} played card last turn: ${nextPlayer.playedCardLastTurn}`);

     // --- Start of Turn Effects for the NEW active player ---
     console.log(`[Turn Start] Processing start-of-turn effects for ${nextPlayerName}.`);
     const startingPlayerArtifact = nextPlayer.artifactSlot;

     // Artifact #20: Ancient Chronometer (Duration Check - Before Mana/Draw)
     // Check duration *before* applying its effect potentially on the draw/mana phase (though mana is simpler)
     if (startingPlayerArtifact?.id === 20) {
         if (startingPlayerArtifact.remainingDuration !== undefined) { // Check if property exists
             startingPlayerArtifact.remainingDuration--;
              console.log(`[Artifact] ${startingPlayerArtifact.name} duration reduced to ${startingPlayerArtifact.remainingDuration}.`);
              if (startingPlayerArtifact.remainingDuration <= 0) {
                  console.log(`[Artifact] ${startingPlayerArtifact.name} has expired and is destroyed.`);
                  nextPlayer.graveyard.push(startingPlayerArtifact);
                  nextPlayer.artifactSlot = null;
                  // Re-assign startingPlayerArtifact to null so later checks don't use the expired one
                  // startingPlayerArtifact = null; // This won't work as it's a const copy
                  // Instead, subsequent checks just need to re-evaluate nextPlayer.artifactSlot if needed
              }
         }
     }

     // Artifact #18: Orb of Calamity
     if (nextPlayer.artifactSlot?.id === 18) { // Re-check artifact slot in case #20 just expired
         const artifact = nextPlayer.artifactSlot;
         console.log(`[Artifact] ${artifact.name} triggers! Dealing 1 damage to all characters.`);
         const targets = [];
         player.value.board.forEach(m => targets.push({ type: 'minion', owner: 'player', instanceId: m.instanceId }));
         opponent.value.board.forEach(m => targets.push({ type: 'minion', owner: 'opponent', instanceId: m.instanceId }));
         targets.push({ type: 'hero', owner: 'player' });
         targets.push({ type: 'hero', owner: 'opponent' });

         const sourceInfo = { entity: startingPlayerArtifact, owner: nextPlayerName, type: 'artifact' };
         targets.forEach(target => {
             _dealDamage(target, 1, sourceInfo);
         });
          _checkDeaths(); // Check deaths immediately after artifact damage
     }

     // Reset minion statuses (Unfreeze) for the player whose turn is starting
     nextPlayer.board.forEach(minion => {
         if (minion) {
             minion.isFrozen = false; // Unfreeze at start of turn
             // Summoning sickness handled when played, canAttack reset at end of *their* turn
         }
     });

     // Update mana for the new active player (moved before draw)
     if (nextPlayer.mana.max < 10) {
         nextPlayer.mana.max++;
     }
     nextPlayer.mana.current = nextPlayer.mana.max;

     // Draw card for the new active player
     drawCard(nextPlayerName);

     console.log(`[endTurn] Turn ${turn.value} (${activePlayer.value}'s turn) starting.`);
 
     // --- Trigger Opponent AI --- If now opponent's turn
     if (activePlayer.value === 'opponent') {
         opponentThinking.value = true;
         // Delay AI actions slightly
         setTimeout(() => {
             opponentTurn();
         }, 1000); // 1 second delay
     }
 }

 // --- Opponent AI Actions ---
 async function opponentTurn() {
     console.log("[AI] Opponent turn starting...");

     // 1. Play Cards Phase (simple: play first possible creature)
     console.log("[AI] Playing cards phase...");
     await opponentPlayCards();

     // Introduce delay between phases
     await new Promise(resolve => setTimeout(resolve, 500));

     // 2. Attack Phase
     console.log("[AI] Attacking phase...");
     await opponentAttackPhase();

     // Introduce delay before ending turn
      await new Promise(resolve => setTimeout(resolve, 500));

     // 3. End Turn
     console.log("[AI] Ending turn...");
     opponentThinking.value = false;
     if (activePlayer.value === 'opponent') { // Check if still opponent's turn (game might have ended)
        endTurn();
     }
 }

 async function opponentPlayCards() {
     let playableCardFound = true;
     while (playableCardFound) {
         playableCardFound = false;
         let bestCardToPlay = null;
         let bestCardIndex = -1;

         // Find the first playable *creature* card
         for (let i = 0; i < opponent.value.hand.length; i++) {
             const card = opponent.value.hand[i];
             if (card.type === 'Creature' && opponent.value.mana.current >= card.cost && opponent.value.board.length < 7) {
                 bestCardToPlay = card;
                 bestCardIndex = i;
                 playableCardFound = true;
                 break; // Play the first one found for simplicity
             }
         }

         if (bestCardToPlay) {
             console.log(`[AI] Found playable card: ${bestCardToPlay.name}`);
             opponentPlayCard(bestCardIndex, bestCardToPlay);
             // Delay slightly between playing multiple cards
             await new Promise(resolve => setTimeout(resolve, 500));
         } else {
              console.log("[AI] No more playable creature cards found.");
         }
         // Loop continues if a card was played, to see if more can be played
     }
 }

 async function opponentPlayCard(cardIndex, cardToPlay) {
     // Check if the opponent can afford the card first
     const costToPay = _getEffectiveCost(cardToPlay, 'opponent'); // Use effective cost
     if (opponent.value.mana.current < costToPay) {
         console.error(`[AI Error] Tried to play card ${cardToPlay.name} with cost ${costToPay} but only have ${opponent.value.mana.current} mana.`);
         // This shouldn't happen if opponentPlayCards checks correctly, but good safeguard.
         return; 
     }
     opponent.value.mana.current -= costToPay; // Deduct effective cost
     opponent.value.hand.splice(cardIndex, 1);

     // Special Handling for Summon Cards (Before Board Placement)
     if (cardToPlay.id === 6) { // 迷霧狼群 (Mistwolf Pack)
         console.log(`[Opponent Action] ${cardToPlay.name} is a Summon card. Resolving summon effect.`);
         _resolveSummonEffect(cardToPlay, 'opponent');
         opponent.value.graveyard.push(cardToPlay); // Card goes to graveyard after summoning
     } else {
         // Regular Card Placement
         if (cardToPlay.type === 'Creature') {
             if (opponent.value.board.length < 7) {
                 opponent.value.board.push(cardToPlay);
                 console.log(`[Opponent Action] Played creature ${cardToPlay.name} (Instance: ${cardToPlay.instanceId})`);
                 // TRIGGER BATTLECRY if applicable
                 // AI targeting for battlecries is complex, handle non-targeted for now
                 if (cardToPlay.mechanics?.includes('Battlecry')) {
                     // Need AI targeting logic here for targeted battlecries
                      _resolveBattlecry(cardToPlay, 'opponent', null); // Pass null target for now
                 }
             } else {
                 console.log(`[Opponent] Board full, could not play ${cardToPlay.name}`);
                 opponent.value.graveyard.push(cardToPlay); // Or discard? Add to grave for now
             }
         } else if (cardToPlay.type === 'Spell') {
             console.log(`[Opponent] Played spell ${cardToPlay.name}`);
             // Need AI targeting logic for spells
             _resolveSpellEffect(cardToPlay, 'opponent', null); // Pass null target for now
             opponent.value.graveyard.push(cardToPlay);
             _triggerSpellburst('opponent'); // Trigger spellburst after spell resolves
         } else if (cardToPlay.type === 'Artifact') {
             console.log(`[Opponent] Played artifact ${cardToPlay.name}`);
             // Equip artifact
             if (opponent.value.artifactSlot) {
                 console.log(`[Opponent] Replacing existing artifact: ${opponent.value.artifactSlot.name}`);
                 opponent.value.graveyard.push(opponent.value.artifactSlot);
             }
             opponent.value.artifactSlot = cardToPlay;
             console.log(`[Opponent] ${cardToPlay.name} equipped.`);
             // Set initial duration if applicable
             if (cardToPlay.id === 20) { // Ancient Chronometer
                 if (typeof cardToPlay.durability !== 'number') {
                      console.warn(`[Opponent] Artifact ${cardToPlay.name} has invalid durability: ${cardToPlay.durability}. Setting duration to 0.`);
                      cardToPlay.remainingDuration = 0;
                  } else {
                     cardToPlay.remainingDuration = cardToPlay.durability;
                  }
                 console.log(`[Opponent] ${cardToPlay.name} starting with duration ${cardToPlay.remainingDuration}.`);
             }
         }
     }
     opponent.value.playedCardThisTurn = true;
 }

 async function opponentAttackPhase() {
     const attackers = opponent.value.board.filter(m => m.canAttack && m.currentAttack > 0 && !m.isFrozen);
     console.log(`[AI] Found ${attackers.length} potential attackers.`);

     for (const attacker of attackers) {
         // Simple target logic: prioritize player hero, then random minion
         let targetInfo = { type: 'hero', owner: 'player' }; // Default target: player hero

         // TODO: Add check for player Taunt minions
         const playerTaunts = player.value.board.filter(m => m.mechanics?.includes('Taunt'));
         let validTargets = [];

         if (playerTaunts.length > 0) {
            validTargets = playerTaunts.map(m => ({ type: 'minion', owner: 'player', instanceId: m.instanceId }));
            console.log(`[AI] Player has Taunt minions. Valid targets:`, validTargets);
         } else {
             // Can target hero or any minion
             validTargets.push({ type: 'hero', owner: 'player' });
             validTargets.push(...player.value.board.map(m => ({ type: 'minion', owner: 'player', instanceId: m.instanceId })));
             console.log(`[AI] No Taunts. Valid targets:`, validTargets);
         }

         if (validTargets.length > 0) {
             // Choose a target - prioritize hero if possible among valid targets
             const heroTarget = validTargets.find(t => t.type === 'hero');
             if (heroTarget) {
                 targetInfo = heroTarget;
             } else {
                 // No hero target possible (e.g., taunt), choose random valid minion target
                 targetInfo = validTargets[Math.floor(Math.random() * validTargets.length)];
             }

             console.log(`[AI] Attacker ${attacker.name} (ID: ${attacker.instanceId}) choosing target:`, targetInfo);
             opponentAttack(attacker.instanceId, targetInfo);

             // Delay between attacks
             await new Promise(resolve => setTimeout(resolve, 500));
         } else {
             console.log(`[AI] Attacker ${attacker.name} has no valid targets.`);
         }

          // Check if attacker died during attack before proceeding
         if (!_findEntity(attacker.instanceId)) {
             console.log(`[AI] Attacker ${attacker.name} died during attack sequence.`);
             continue; // Move to next potential attacker
         }
     }
     console.log("[AI] Attack phase finished.");
 }

 function opponentAttack(attackerInstanceId, targetInfo) {
     console.info(`[executeAttack] Attacker: ${attackerInstanceId}, Target:`, targetInfo);
     const attackerData = _findEntity(attackerInstanceId);
     const targetEntityData = targetInfo.type === 'minion' ? _findEntity(targetInfo.instanceId) : null;
     const targetHero = targetInfo.type === 'hero' ? (targetInfo.owner === 'player' ? player.value.hero : opponent.value.hero) : null;

     if (!attackerData || attackerData.owner !== 'opponent') {
         console.error("[executeAttack] Invalid attacker:", attackerInstanceId);
         return;
     }
      if (targetInfo.type === 'minion' && (!targetEntityData || targetEntityData.owner !== 'player')) {
         console.error("[executeAttack] Invalid target minion:", targetInfo);
         return;
     }
       if (targetInfo.type === 'hero' && targetInfo.owner !== 'player') {
          console.error("[executeAttack] Invalid target hero (opponent attacking itself?)");
          return;
      }

     const attacker = attackerData.entity;
     const target = targetEntityData ? targetEntityData.entity : targetHero;

     console.log(`[executeAttack] ${attacker.name} (${attacker.currentAttack}/${attacker.currentHealth}) attacking ${target?.name ?? targetInfo.owner + ' hero'} (${target?.currentHealth ?? target?.hp ?? '?'}/${target?.health ?? target?.maxHp ?? '?'})`);

     // Damage calc
     if (attacker.currentAttack > 0) {
         _dealDamage(targetInfo, attacker.currentAttack, attackerData);

         // --- Trigger Target's "On Attacked" effects (AFTER taking damage) ---
         // Check if the target (minion) still exists after taking damage
         const targetAfterDamageData = targetInfo.type === 'minion' ? _findEntity(targetInfo.instanceId) : null;
         if (targetAfterDamageData?.entity) {
             const targetMinion = targetAfterDamageData.entity;
             targetMinion.effects?.forEach(effect => {
                 if (effect.trigger === 'onAttacked' && effect.action === 'dealDamage' && effect.target === 'attacker') {
                      console.log(`[Effect Trigger] ${targetMinion.name}'s effect (${effect.id}) triggers on attacker.`);
                      // Target the original attacker
                      const attackerTargetInfo = { type: 'minion', owner: attackerData.owner, instanceId: attackerInstanceId };
                      const damageSourceInfo = { entity: targetMinion, owner: targetInfo.owner, type: 'minion_effect' };
                      _dealDamage(attackerTargetInfo, effect.value, damageSourceInfo);
                 }
             });
         }
         // --- End On Attacked Effects --- 
     }
     // Attacker takes damage from target (if target is minion and has attack > 0)
     if (targetInfo.type === 'minion' && target.currentAttack > 0) {
         _dealDamage({ type: 'minion', owner: 'player', instanceId: attackerInstanceId }, target.currentAttack, targetEntityData);
     }

     // Mark attacker as having attacked
      const attackerAfterDamage = _findEntity(attackerInstanceId);
      if(attackerAfterDamage) {
          attackerAfterDamage.entity.canAttack = false;
      } else {
          console.log(`[AI Attack] Attacker ${attacker.name} died during attack.`);
      }
     console.log("[executeAttack] Attack finished.");
 }

  function selectCard(instanceId) {
      const card = player.value.hand.find(c => c.instanceId === instanceId);
      if (!card) {
          console.error("Selected card not found in hand");
          return;
      }

      if (card.cost > player.value.mana.current) {
          console.log("Not enough mana to select this card");
          selectedCardInstanceId.value = null; // Deselect if not enough mana
          targetingMode.value = null;
          return;
      }

      // Check if the card requires targeting
      if (card.requiresTarget) {
          console.log(`Card ${card.name} requires target (${card.targetType}). Entering targeting mode.`);
          selectedCardInstanceId.value = instanceId;
          selectedAttackerInstanceId.value = null; // Clear attacker selection
          targetingMode.value = 'card'; // Set mode for UI
          // The UI should now highlight valid targets based on card.targetType
      } else {
          // Play immediately if no target needed
          console.log(`Card ${card.name} does not require target. Playing immediately.`);
          selectedCardInstanceId.value = instanceId; // Select it briefly
          playSelectedCard(); // Play without target
          // playSelectedCard will clear selection and targeting mode
      }
  }

  function playSelectedCard(targetInfo = null) {
    console.info("[Player Action] Play Card called. Selected ID:", selectedCardInstanceId.value, "Target:", targetInfo);

    if (!selectedCardInstanceId.value) {
        console.log("No card selected to play.");
        return;
    }

    // Find card instance in hand
    const cardIndex = player.value.hand.findIndex(c => c.instanceId === selectedCardInstanceId.value);
    if (cardIndex === -1) {
        console.error("[Player Action] Selected card not found in hand! ID:", selectedCardInstanceId.value);
        selectedCardInstanceId.value = null; // Clear invalid selection
        targetingMode.value = null;
        return;
    }
    const cardToPlay = player.value.hand[cardIndex];

    // Calculate cost *before* checking mana again
    const costToPay = _getEffectiveCost(cardToPlay, 'player');

    // 3. Re-check turn and mana (should be guaranteed by selection logic, but good practice)
    if (activePlayer.value !== 'player') {
        console.warn("[Player Action] Not your turn!");
        selectedCardInstanceId.value = null;
        targetingMode.value = null;
        return;
    }
    // Check against the calculated costToPay
    if (player.value.mana.current < costToPay) {
        console.warn(`[Player Action] Not enough mana (state changed after selection?) Cost: ${costToPay}, Have: ${player.value.mana.current}`);
        selectedCardInstanceId.value = null;
        targetingMode.value = null;
        return;
    }

    // 4. Specific checks based on card type
    if (cardToPlay.type === 'Creature') {
        if (player.value.board.length >= 7) {
            console.warn("[Player Action] Board is full!");
            // Don't clear selection, allow trying again (e.g., trade first)
            return;
        }
    }
    // TODO: Check for valid target if targetingMode is active

    // 5. Execute Play
    console.info(`[Player Action] Executing play for: ${cardToPlay.name} (Paying ${costToPay} mana)`);
    player.value.mana.current -= costToPay; // Deduct effective cost
    player.value.hand.splice(cardIndex, 1);

    // --- Special Handling for Summon Cards (Before Board Placement) ---
    if (cardToPlay.id === 6) { // 迷霧狼群 (Mistwolf Pack)
        console.log(`[Player Action] ${cardToPlay.name} is a Summon card. Resolving summon effect.`);
        _resolveSummonEffect(cardToPlay, 'player');
        player.value.graveyard.push(cardToPlay); // Card goes to graveyard after summoning
    } else {
        // --- Regular Card Placement --- 
        switch (cardToPlay.type) {
            case 'Creature':
                cardToPlay.canAttack = false; // Summoning sickness
                player.value.board.push(cardToPlay);
                console.info(`[Player Action] Creature ${cardToPlay.name} moved to board.`);
                // Trigger Battlecry if applicable, passing target info
                if (cardToPlay.mechanics?.includes('Battlecry')) {
                    _resolveBattlecry(cardToPlay, 'player', targetInfo);
                }
                break;
            case 'Spell':
                console.info(`[Player Action] Spell ${cardToPlay.name} cast.`);
                // Resolve spell effect, passing target info
                _resolveSpellEffect(cardToPlay, 'player', targetInfo);
                _triggerSpellburst('player'); // Trigger spellburst after spell resolves
                player.value.graveyard.push(cardToPlay); // Spells go to graveyard after use
                break;
            case 'Artifact':
                console.info(`[Player Action] Artifact ${cardToPlay.name} played.`);
                // Check if replacing an existing artifact
                if (player.value.artifactSlot) {
                    console.info(`[Player Action] Replacing existing artifact: ${player.value.artifactSlot.name}`);
                    player.value.graveyard.push(player.value.artifactSlot); // Move old artifact to graveyard
                }
                player.value.artifactSlot = cardToPlay; // Equip the new artifact
                console.info(`[Player Action] ${cardToPlay.name} equipped.`);
                // Set initial duration if applicable
                if (cardToPlay.id === 20) { // Ancient Chronometer
                    // Check if durability exists and is a number
                    if (typeof cardToPlay.durability !== 'number') {
                        console.warn(`[Player Action] Artifact ${cardToPlay.name} has invalid durability: ${cardToPlay.durability}. Setting duration to 0.`);
                        cardToPlay.remainingDuration = 0;
                    } else {
                        cardToPlay.remainingDuration = cardToPlay.durability;
                    }
                    console.log(`[Player Action] ${cardToPlay.name} starting with duration ${cardToPlay.remainingDuration}.`);
                }
                // Aura effects apply passively (cost reduction handled by getEffectiveCost)
                break;
        }
    }

    player.value.playedCardThisTurn = true;
    selectedCardInstanceId.value = null; // Clear selection after playing
    targetingMode.value = null;
    console.info("[Player Action] Card played successfully.");

    // TODO: Check for game end conditions
}

  function selectAttacker(instanceId) {
      if (activePlayer.value !== 'player') return;

      const attacker = player.value.board.find(m => m.instanceId === instanceId);
      if (!attacker) {
          console.warn("[selectAttacker] Attacker not found on board:", instanceId);
          return;
      }

      // Check if attacker can attack
      if (!attacker.canAttack) {
          console.info(`[selectAttacker] Minion ${attacker.name} cannot attack (summoning sickness or already attacked).`);
          return;
      }
       if (attacker.isFrozen) {
           console.info(`[selectAttacker] Minion ${attacker.name} is frozen.`);
           return;
       }
        if (attacker.currentAttack <= 0) {
           console.info(`[selectAttacker] Minion ${attacker.name} has 0 attack.`);
           return;
       }

      // Cancel card selection if selecting attacker
      selectedCardInstanceId.value = null;

      if (selectedAttackerInstanceId.value === instanceId) {
          // Clicked again -> Deselect
          console.info(`[selectAttacker] Deselected attacker: ${attacker.name}`);
          selectedAttackerInstanceId.value = null;
          targetingMode.value = null;
      } else {
          console.info(`[selectAttacker] Selected attacker: ${attacker.name}`);
          selectedAttackerInstanceId.value = instanceId;
          targetingMode.value = 'attack';
      }
  }

  function selectAttackTarget(targetInfo) { // targetInfo = { type: 'minion'/'hero', owner: 'player'/'opponent', instanceId?: string }
    console.info("[selectAttackTarget] Target selected:", targetInfo);

    if (targetingMode.value !== 'attack' || !selectedAttackerInstanceId.value) {
        console.warn("[selectAttackTarget] Not in attack targeting mode or no attacker selected.");
        return;
    }

    const attackerData = _findEntity(selectedAttackerInstanceId.value);
    if (!attackerData || attackerData.owner !== 'player') {
        console.error("[selectAttackTarget] Selected attacker invalid or not found.");
        selectedAttackerInstanceId.value = null;
        targetingMode.value = null;
        return;
    }

    // --- Taunt Check --- Find opponent taunt minions
    const opponentTaunts = opponent.value.board.filter(m => m.mechanics?.includes('Taunt') && m.currentHealth > 0);

    if (opponentTaunts.length > 0) {
        // If taunts exist, the target MUST be one of them
        const isTargetTaunt = targetInfo.type === 'minion' && opponentTaunts.some(t => t.instanceId === targetInfo.instanceId);
        if (!isTargetTaunt) {
            console.warn("[selectAttackTarget] Must target a Taunt minion!");
            return; // Invalid target
        }
        console.log("[selectAttackTarget] Target is a valid Taunt minion.");
    } else {
        console.log("[selectAttackTarget] No Taunt minions on opponent board.");
    }
    // --- End Taunt Check ---

    // Prevent attacking friendly targets (usually)
    if (targetInfo.owner === 'player') {
        console.warn("[selectAttackTarget] Cannot target friendly units (usually).");
        return;
    }

    // Execute the attack
    executeAttack(selectedAttackerInstanceId.value, targetInfo);

    // Reset selection after attack
    selectedAttackerInstanceId.value = null;
    targetingMode.value = null;
}

 function executeAttack(attackerInstanceId, targetInfo) {
     console.info(`[executeAttack] Attacker: ${attackerInstanceId}, Target:`, targetInfo);
     const attackerData = _findEntity(attackerInstanceId);
     const targetEntityData = targetInfo.type === 'minion' ? _findEntity(targetInfo.instanceId) : null;
     const targetHero = targetInfo.type === 'hero' ? (targetInfo.owner === 'player' ? player.value.hero : opponent.value.hero) : null;

     if (!attackerData) {
         console.error("[executeAttack] Attacker not found!");
         return;
     }
     if (targetInfo.type === 'minion' && !targetEntityData) {
         console.error("[executeAttack] Target minion not found!");
         return;
     }
      if (targetInfo.type === 'hero' && !targetHero) {
         console.error("[executeAttack] Target hero not found!");
         return;
     }

     const attacker = attackerData.entity;
     const target = targetEntityData ? targetEntityData.entity : targetHero;

     console.log(`[executeAttack] ${attacker.name} (${attacker.currentAttack}/${attacker.currentHealth}) attacking ${target?.name ?? targetInfo.owner + ' hero'} (${target?.currentHealth ?? target?.hp ?? '?'}/${target?.health ?? target?.maxHp ?? '?'})`);

     // Damage calculation (simple, no weapon interaction yet)
     // Target takes damage from attacker
     if (attacker.currentAttack > 0) {
         _dealDamage(targetInfo, attacker.currentAttack, attackerData);

         // --- Trigger Target's "On Attacked" effects (AFTER taking damage) ---
         // Check if the target (minion) still exists after taking damage
         const targetAfterDamageData = targetInfo.type === 'minion' ? _findEntity(targetInfo.instanceId) : null;
         if (targetAfterDamageData?.entity) {
             const targetMinion = targetAfterDamageData.entity;
             targetMinion.effects?.forEach(effect => {
                 if (effect.trigger === 'onAttacked' && effect.action === 'dealDamage' && effect.target === 'attacker') {
                      console.log(`[Effect Trigger] ${targetMinion.name}'s effect (${effect.id}) triggers on attacker.`);
                      // Target the original attacker
                      const attackerTargetInfo = { type: 'minion', owner: attackerData.owner, instanceId: attackerInstanceId };
                      const damageSourceInfo = { entity: targetMinion, owner: targetInfo.owner, type: 'minion_effect' };
                      _dealDamage(attackerTargetInfo, effect.value, damageSourceInfo);
                 }
             });
         }
         // --- End On Attacked Effects --- 
     }
     // Attacker takes damage from target (if target is minion and has attack > 0)
     if (targetInfo.type === 'minion' && target.currentAttack > 0) {
         _dealDamage({ type: 'minion', owner: 'player', instanceId: attackerInstanceId }, target.currentAttack, targetEntityData);
     }

     // Mark attacker as having attacked
      const attackerAfterDamage = _findEntity(attackerInstanceId);
      if(attackerAfterDamage) {
          attackerAfterDamage.entity.canAttack = false;
      } else {
          console.log(`[AI Attack] Attacker ${attacker.name} died during attack.`);
      }
     console.log("[executeAttack] Attack finished.");
 }

  // --- Card Targeting Actions ---

  function selectCardTarget(targetInfo) {
      if (targetingMode.value !== 'card' || !selectedCardInstanceId.value) {
          console.log("Not in card targeting mode or no card selected.");
          return;
      }

      const card = player.value.hand.find(c => c.instanceId === selectedCardInstanceId.value);
      if (!card) {
          console.error("Selected card for targeting not found!");
          cancelSelection(); // Try to cancel state
          return;
      }

      // TODO: Validate if targetInfo matches card.targetType
      console.log(`Target selected for ${card.name}:`, targetInfo);

      playSelectedCard(targetInfo); // Pass the target info
  }

  function cancelSelection() {
      console.log("Selection cancelled.");
      selectedCardInstanceId.value = null;
      selectedAttackerInstanceId.value = null;
      targetingMode.value = null;
  }

  // --- Triggered Effects --- 

  function _triggerSpellburst(owner) {
      console.log(`[Spellburst] Checking for Spellburst effects for ${owner}.`);
      const board = owner === 'player' ? player.value.board : opponent.value.board;
      let triggered = false;

      board.forEach(minion => {
          if (minion.mechanics?.includes('SpellburstAttack')) { // Card #4
               if (minion.currentHealth > 0) { // Only trigger if alive
                  minion.currentAttack += 1;
                  triggered = true;
                  console.log(`[Spellburst] ${minion.name} triggers! Attack increased to ${minion.currentAttack}.`);
                  // TODO: Add visual indicator or animation cue?
               }
          }
           // TODO: Add logic for #10 ConsumableSpellburstAttack (temporary buff)
      });

      if (triggered) {
           console.log(`[Spellburst] Spellburst effects resolved for ${owner}.`);
      }
  }

  // --- Return state, actions, and getters ---
  return {
    turn,
    activePlayer,
    selectedCardInstanceId, // Expose selected card ID
    selectedAttackerInstanceId, // Expose attacker ID
    targetingMode,
    player,
    opponent,
    opponentThinking, // Expose thinking state
    startGame,
    selectCard, // Add selectCard action
    selectCardTarget, // Expose target selection
    playSelectedCard, // Use this action for playing
    endTurn,
    selectAttacker, // Expose selectAttacker
    selectAttackTarget, // Expose selectAttackTarget
    cancelSelection, // Expose cancel
    getPlayerHand: computed(() => player.value.hand),
    getOpponentHandCount: computed(() => opponent.value.hand.length),
    getPlayerBoard: computed(() => player.value.board),
    getOpponentBoard: computed(() => opponent.value.board),
    getPlayerMana: computed(() => player.value.mana),
    getOpponentMana: computed(() => opponent.value.mana),
    getPlayerHero: computed(() => player.value.hero),
    getOpponentHero: computed(() => opponent.value.hero),
    getPlayerArtifact: computed(() => player.value.artifactSlot),
    getOpponentArtifact: computed(() => opponent.value.artifactSlot),
  }
}); 