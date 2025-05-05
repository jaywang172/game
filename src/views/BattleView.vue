console.log('[End Turn] About to call drawCard for:', nextPlayerName); 

{
  id: 'flame_ward_effect', // Unique ID for this type of effect
  sourceCardId: 14, // ID of the card that granted the effect
  trigger: 'onAttacked', // When does this trigger?
  action: 'dealDamage', // What does it do?
  value: 3, // How much damage?
  target: 'attacker' // Who does it target?
  // Might need duration, counters, etc. for other effects
} 

// --- Utility: Apply Silence ---
function _applySilence(targetMinion) {
    if (!targetMinion || targetMinion.isSilenced) return; // Cannot silence already silenced or non-existent target

    console.log(`[Silence] Applying Silence to ${targetMinion.name} (Instance: ${targetMinion.instanceId})`);

    targetMinion.isSilenced = true;

    // Find base card data for stat reset
    const baseCard = cardDatabase.find(c => c.id === targetMinion.id);
    if (baseCard) {
        // Reset Attack to base
        targetMinion.currentAttack = baseCard.attack;
        console.log(`[Silence] ${targetMinion.name} attack reset to ${baseCard.attack}`);
        // Reset Health, respecting current damage
        const baseHealth = baseCard.health ?? targetMinion.currentHealth; // Use current health if base health is missing
        targetMinion.currentHealth = Math.min(targetMinion.currentHealth, baseHealth);
        console.log(`[Silence] ${targetMinion.name} health set to ${targetMinion.currentHealth} (base: ${baseHealth})`);
    } else {
        console.warn(`[Silence] Could not find base card data for ID: ${targetMinion.id}`);
    }

    // Clear statuses and effects
    targetMinion.isFrozen = false;
    targetMinion.hasDivineShield = false; // Explicitly remove even if mechanic remains in array
    targetMinion.hasReincarnated = false;
    targetMinion.effects = []; // Remove all enchantments/temporary effects

    console.log(`[Silence] ${targetMinion.name} statuses and effects cleared.`);

    // Note: Inherent mechanics (Taunt, Deathrattle etc. in the mechanics array) are negated by checking the isSilenced flag elsewhere.
} 