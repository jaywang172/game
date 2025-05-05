export const cardDatabase = [
  // Creatures (10)
  {
    id: 1,
    name: '赤焰龍裔',
    type: 'Creature',
    cost: 6,
    attack: 5,
    health: 6,
    text: '戰吼：對所有敵方角色造成2點火焰傷害。',
    mechanics: ['Battlecry']
  },
  {
    id: 2,
    name: '深林守衛',
    type: 'Creature',
    cost: 3,
    attack: 2,
    health: 5,
    text: '嘲諷，每當受到攻擊時，恢復1點生命。',
    mechanics: ['Taunt', 'RegenerateOnDamage'] // Custom mechanic name
  },
  {
    id: 3,
    name: '亡語妖精',
    type: 'Creature',
    cost: 2,
    attack: 2,
    health: 1,
    text: '死亡之聲：抽一張卡。',
    mechanics: ['Deathrattle']
  },
  {
    id: 4,
    name: '破碎劍士',
    type: 'Creature',
    cost: 4,
    attack: 4,
    health: 3,
    text: '每當你打出一張法術卡，此牌獲得+1攻擊。',
    mechanics: ['SpellburstAttack'] // Custom mechanic name
  },
  {
    id: 5,
    name: '時間裂隙者',
    type: 'Creature',
    cost: 5,
    attack: 3,
    health: 4,
    text: '戰吼：使一個友方手下重置攻擊次數並可再次攻擊。',
    mechanics: ['Battlecry', 'WindfuryGrant'], // Custom mechanic name for effect
    requiresTarget: true,
    targetType: 'friendly_minion' // Specify target type
  },
  {
    id: 6,
    name: '迷霧狼群',
    type: 'Creature',
    cost: 4,
    attack: 2, // Attack per wolf
    health: 2, // Health per wolf
    text: '召喚兩隻2/2的狼。連擊：若上回合打出法術，召喚第三隻狼。', // Modified text slightly for clarity
    mechanics: ['Summon', 'Combo'] // Combo effect needs specific implementation
  },
  {
    id: 7,
    name: '黑鐵巨魔',
    type: 'Creature',
    cost: 7,
    attack: 7,
    health: 7,
    text: '無特殊能力。', // Explicitly stating no ability
    mechanics: []
  },
  {
    id: 8,
    name: '靈魂操縱者',
    type: 'Creature',
    cost: 5,
    attack: 3,
    health: 6,
    text: '亡語：隨機從敵方墓地召喚1個手下為你而戰。',
    mechanics: ['Deathrattle', 'ResurrectEnemyMinion'] // Custom mechanic name
  },
  {
    id: 9,
    name: '榮耀聖騎士',
    type: 'Creature',
    cost: 6,
    attack: 4,
    health: 7,
    text: '聖盾術、嘲諷。', // Simplified text based on mechanics
    mechanics: ['Divine Shield', 'Taunt']
  },
  {
    id: 10,
    name: '煉金狂徒',
    type: 'Creature',
    cost: 3,
    attack: 4,
    health: 2,
    text: '每當你使用消耗品類法術，+2攻擊直到回合結束。',
    mechanics: ['ConsumableSpellburstAttack'] // Custom mechanic name
  },

  // Spells (7)
  {
    id: 11,
    name: '寒霜爆裂',
    type: 'Spell',
    cost: 2,
    text: '對一個敵人造成3點傷害，並凍結該目標。',
    mechanics: ['Damage', 'Freeze'],
    requiresTarget: true,
    targetType: 'enemy_character' // Minion or Hero
  },
  {
    id: 12,
    name: '神秘轉移',
    type: 'Spell',
    cost: 4,
    text: '選擇一個手下與敵方一個手下，交換他們的位置與控制權。',
    mechanics: ['SwapControl'] // Custom mechanic name
  },
  {
    id: 13,
    name: '復甦儀式',
    type: 'Spell',
    cost: 6,
    text: '從你的墓地復活一個隨機手下。',
    mechanics: ['ResurrectFriendlyMinion'] // Custom mechanic name
  },
  {
    id: 14,
    name: '烈焰護罩',
    type: 'Spell',
    cost: 3,
    text: '賦予一個友方手下「每當受到攻擊，對攻擊者造成3點傷害」效果。',
    mechanics: ['Enchantment', 'DamageOnAttacked'] // Custom mechanic name
  },
  {
    id: 15,
    name: '秘能脈衝',
    type: 'Spell',
    cost: 1,
    text: '下回合獲得額外兩點魔力。',
    mechanics: ['GainManaNextTurn'] // Custom mechanic name
  },
  {
    id: 16,
    name: '時間封印',
    type: 'Spell',
    cost: 5,
    text: '本回合結束後，敵方無法行動1回合。',
    mechanics: ['SkipEnemyTurn'] // Custom mechanic name
  },
  {
    id: 17,
    name: '暗影束縛',
    type: 'Spell',
    cost: 2,
    text: '沉默一個敵方手下，並使其無法攻擊直到你下回合。',
    mechanics: ['Silence', 'CannotAttackNextTurn'], // Custom mechanic name
    requiresTarget: true,
    targetType: 'enemy_minion'
  },

  // Artifacts (3)
  {
    id: 18,
    name: '災厄法球',
    type: 'Artifact',
    cost: 5,
    durability: null, // Or some indicator of persistence if needed
    text: '每回合開始時，隨機對所有角色造成1點傷害。',
    mechanics: ['StartOfTurnDamage'] // Custom mechanic name
  },
  {
    id: 19,
    name: '秘銀護符',
    type: 'Artifact',
    cost: 3,
    durability: null,
    text: '所有友方手下獲得「第一次死亡後回復1點生命並重生」。',
    mechanics: ['Aura', 'ReincarnateOnDeath'] // Custom mechanic name
  },
  {
    id: 20,
    name: '古代計時器',
    type: 'Artifact',
    cost: 4,
    durability: 3, // Lasts 3 turns
    text: '所有你的卡牌費用-1（最多至1），持續3回合。',
    mechanics: ['Aura', 'CostReduction', 'LimitedDuration'] // Custom mechanic names
  }
]; 