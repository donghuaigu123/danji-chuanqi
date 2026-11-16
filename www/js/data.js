/* ============================================================
 * 单机传奇 1.76 复古 —— 游戏数据表
 * 参考盛大 1.76 版本：三职业、经典技能、装备、怪物、地图、任务
 * ============================================================ */
(function (global) {
  'use strict';

  // ---------- 职业 ----------
  const CLASSES = {
    warrior: {
      key: 'warrior', name: '战士', color: '#e8b13a',
      base: { hp: 120, mp: 20, atk: 8, matk: 2, tao: 1, def: 5, mdef: 3, speed: 2.4 },
      growth: { hp: 22, mp: 3, atk: 2.4, matk: 0.5, tao: 0.3, def: 1.2, mdef: 0.8 },
      skills: ['basicSword', 'attackSword', 'assassinSword', 'halfMoon', 'fierceFire', 'charge'],
      desc: '近身物理攻击，血厚防高，后期霸道'
    },
    mage: {
      key: 'mage', name: '法师', color: '#4ea8ff',
      base: { hp: 70, mp: 60, atk: 4, matk: 9, tao: 1, def: 2, mdef: 5, speed: 2.6 },
      growth: { hp: 10, mp: 12, atk: 0.8, matk: 2.6, tao: 0.3, def: 0.5, mdef: 1.2 },
      skills: ['fireball', 'lightning', 'greatFireball', 'hellLight', 'iceRoar', 'magicShield'],
      desc: '远程魔法群攻，升级飞快，脆弱需走位'
    },
    taoist: {
      key: 'taoist', name: '道士', color: '#5fd08a',
      base: { hp: 90, mp: 40, atk: 6, matk: 4, tao: 7, def: 3, mdef: 4, speed: 2.5 },
      growth: { hp: 15, mp: 8, atk: 1.2, matk: 1, tao: 2.2, def: 0.8, mdef: 1 },
      skills: ['heal', 'spiritStrike', 'poison', 'soulFire', 'summonSkeleton', 'groupHeal'],
      desc: '召唤神兽、施毒疗伤，攻守兼备全能'
    }
  };

  // ---------- 技能 ----------
  // type: passive | melee | ranged | aoe | heal | summon | buff | poison
  const SKILLS = {
    // 战士
    basicSword: { name: '基本剑术', icon: '剑', cls: 'warrior', type: 'passive', level: 1, mp: 0, cd: 0, power: 1.0, desc: '提高攻击命中率，被动提升攻击力 10%' },
    attackSword: { name: '攻杀剑术', icon: '杀', cls: 'warrior', type: 'melee', level: 7, mp: 4, cd: 2.0, power: 1.5, desc: '破坏力强大的剑术，造成 150% 伤害' },
    assassinSword: { name: '刺杀剑术', icon: '刺', cls: 'warrior', type: 'melee', level: 15, mp: 6, cd: 3.0, power: 1.9, desc: '隔位攻击，造成 190% 伤害并忽视部分防御' },
    halfMoon: { name: '半月弯刀', icon: '月', cls: 'warrior', type: 'aoe', level: 25, mp: 10, cd: 5.0, power: 1.3, radius: 70, desc: '攻击身前扇形范围内多个敌人' },
    fierceFire: { name: '烈火剑法', icon: '火', cls: 'warrior', type: 'melee', level: 35, mp: 14, cd: 7.0, power: 3.2, desc: '召唤烈火附于武器，造成 320% 恐怖伤害' },
    charge: { name: '野蛮冲撞', icon: '撞', cls: 'warrior', type: 'aoe', level: 30, mp: 8, cd: 8.0, power: 1.0, radius: 60, stun: 1.5, desc: '冲撞周围敌人并使其眩晕' },
    // 法师
    fireball: { name: '火球术', icon: '炎', cls: 'mage', type: 'ranged', level: 1, mp: 4, cd: 0.8, power: 1.2, color: '#ff7b3a', desc: '发射火球攻击单个目标' },
    lightning: { name: '雷电术', icon: '雷', cls: 'mage', type: 'ranged', level: 11, mp: 9, cd: 1.6, power: 2.1, color: '#ffe45e', desc: '从天而降的雷电，高伤害单体攻击' },
    greatFireball: { name: '大火球', icon: '焰', cls: 'mage', type: 'aoe', level: 20, mp: 14, cd: 3.0, power: 1.5, radius: 55, color: '#ff5a2a', desc: '大范围爆裂火焰，攻击多个敌人' },
    hellLight: { name: '地狱雷光', icon: '电', cls: 'mage', type: 'aoe', level: 30, mp: 22, cd: 5.0, power: 1.8, radius: 90, color: '#b98cff', desc: '以自身为中心的强力雷电风暴' },
    iceRoar: { name: '冰咆哮', icon: '冰', cls: 'mage', type: 'aoe', level: 35, mp: 30, cd: 6.0, power: 2.4, radius: 110, color: '#7fe6ff', slow: 0.5, desc: '呼啸寒冰，大范围伤害并减速敌人' },
    magicShield: { name: '魔法盾', icon: '盾', cls: 'mage', type: 'buff', level: 25, mp: 18, cd: 12.0, duration: 10, desc: '形成魔法盾，减少受到的伤害 40%' },
    // 道士
    heal: { name: '治愈术', icon: '愈', cls: 'taoist', type: 'heal', level: 1, mp: 5, cd: 1.5, power: 18, desc: '恢复自身或友方生命值' },
    spiritStrike: { name: '精神力战法', icon: '灵', cls: 'taoist', type: 'passive', level: 9, mp: 0, cd: 0, power: 1.15, desc: '提高攻击命中与道术伤害' },
    poison: { name: '施毒术', icon: '毒', cls: 'taoist', type: 'poison', level: 14, mp: 6, cd: 3.0, power: 6, duration: 8, desc: '使目标持续中毒掉血并降低防御' },
    soulFire: { name: '灵魂火符', icon: '符', cls: 'taoist', type: 'ranged', level: 18, mp: 8, cd: 1.2, power: 1.4, color: '#ff5b8a', desc: '以灵魂力量凝聚火符远程攻击' },
    summonSkeleton: { name: '召唤骷髅', icon: '骷', cls: 'taoist', type: 'summon', level: 19, mp: 20, cd: 2.0, desc: '召唤骷髅宝宝协同作战' },
    groupHeal: { name: '群体治愈术', icon: '群', cls: 'taoist', type: 'heal', level: 33, mp: 26, cd: 8.0, power: 40, aoe: true, desc: '大范围治疗自身与周围友方' }
  };

  // ---------- 物品/装备 ----------
  // slot: weapon/helmet/armor/necklace/ring/bracer/belt/boots/consumable/material
  // rarity: 普通(白) 精良(蓝) 稀有(紫) 极品(橙) 传说(红)
  const RARITY = {
    common: { name: '普通', color: '#d8d8d8', mult: 1.0 },
    fine: { name: '精良', color: '#5aa9ff', mult: 1.5 },
    rare: { name: '稀有', color: '#c06bff', mult: 2.2 },
    epic: { name: '极品', color: '#ff9b2f', mult: 3.2 },
    legend: { name: '传说', color: '#ff4d4d', mult: 4.5 }
  };

  const ITEMS = {
    // 武器
    woodenSword: { name: '木剑', slot: 'weapon', rarity: 'common', atk: 3, level: 1, icon: '木', desc: '新手练习用的木剑' },
    bronzeSword: { name: '青铜剑', slot: 'weapon', rarity: 'common', atk: 6, level: 5, icon: '剑', desc: '青铜打造的基础武器' },
    ironSword: { name: '铁剑', slot: 'weapon', rarity: 'common', atk: 10, level: 10, icon: '铁', desc: '坚硬的铁制长剑' },
    jingzhongyue: { name: '井中月', slot: 'weapon', rarity: 'fine', atk: 18, level: 20, icon: '月', desc: '战士中期利器，攻击稳定' },
    judgement: { name: '裁决之杖', slot: 'weapon', rarity: 'rare', atk: 32, level: 30, icon: '裁', desc: '战士梦寐以求的神兵，攻击变态' },
    dragonSword: { name: '龙纹剑', slot: 'weapon', rarity: 'epic', atk: 45, tao: 8, level: 38, icon: '龙', desc: '道士专属神剑，附带强大道术' },
    boneStaff: { name: '骨玉权杖', slot: 'weapon', rarity: 'rare', matk: 28, level: 30, icon: '骨', desc: '法师高阶武器，魔法攻击强劲' },
    soulStaff: { name: '嗜魂法杖', slot: 'weapon', rarity: 'epic', matk: 42, level: 38, icon: '魂', desc: '法师传说级法杖，魔法毁灭之力' },
    '屠龙': { name: '屠龙', slot: 'weapon', rarity: 'legend', atk: 68, level: 45, icon: '屠', desc: '传奇第一神兵，攻击天下无敌' },
    // 头盔
    clothHat: { name: '布帽', slot: 'helmet', rarity: 'common', def: 1, mdef: 1, level: 1, icon: '帽', desc: '普通布帽' },
    bronzeHelmet: { name: '青铜头盔', slot: 'helmet', rarity: 'common', def: 3, level: 10, icon: '盔', desc: '青铜头盔' },
    ghostHelmet: { name: '幽灵头盔', slot: 'helmet', rarity: 'rare', def: 6, mdef: 5, level: 30, icon: '幽', desc: '幽灵骑士的头盔' },
    // 衣服
    clothArmor: { name: '布衣', slot: 'armor', rarity: 'common', def: 2, mdef: 2, level: 1, icon: '衣', desc: '粗布衣服' },
    lightArmor: { name: '轻型盔甲', slot: 'armor', rarity: 'common', def: 6, level: 10, icon: '甲', desc: '轻甲，战士法师皆可穿' },
    heavyArmor: { name: '重型盔甲', slot: 'armor', rarity: 'fine', def: 12, level: 20, icon: '重', desc: '厚重盔甲，战士专属' },
    ghostRobe: { name: '幽灵战衣', slot: 'armor', rarity: 'rare', def: 15, mdef: 15, level: 30, icon: '袍', desc: '攻守兼备的幽灵战衣' },
    // 项链
    boneNecklace: { name: '骨链', slot: 'necklace', rarity: 'common', atk: 1, level: 5, icon: '链', desc: '兽骨串成的项链' },
    blueNecklace: { name: '蓝宝石项链', slot: 'necklace', rarity: 'fine', matk: 6, level: 20, icon: '宝', desc: '蕴含魔力的蓝宝石' },
    // 戒指
    copperRing: { name: '铜戒指', slot: 'ring', rarity: 'common', def: 1, level: 5, icon: '戒', desc: '普通的铜戒指' },
    coralRing: { name: '珊瑚戒指', slot: 'ring', rarity: 'fine', atk: 5, level: 20, icon: '珊', desc: '攻击加成戒指' },
    // 手镯
    leatherBracer: { name: '皮手镯', slot: 'bracer', rarity: 'common', def: 1, level: 5, icon: '镯', desc: '皮制护腕' },
    // 腰带 & 鞋
    leatherBelt: { name: '皮带', slot: 'belt', rarity: 'common', def: 1, level: 10, icon: '带', desc: '皮质腰带' },
    leatherBoots: { name: '皮靴', slot: 'boots', rarity: 'common', def: 1, speed: 0.3, level: 10, icon: '靴', desc: '普通皮靴' },
    // 消耗品
    goldPotion: { name: '金创药', slot: 'consumable', rarity: 'common', icon: '药', effect: 'hp', value: 60, level: 1, desc: '恢复 60 点生命，可堆叠', stack: true },
    manaPotion: { name: '魔法药', slot: 'consumable', rarity: 'common', icon: '魔', effect: 'mp', value: 50, level: 1, desc: '恢复 50 点魔法，可堆叠', stack: true },
    sunWater: { name: '太阳水', slot: 'consumable', rarity: 'fine', icon: '水', effect: 'hp', value: 150, level: 1, desc: '恢复 150 点生命', stack: true },
    // 材料
    goldOre: { name: '金矿石', slot: 'material', rarity: 'common', icon: '矿', level: 1, desc: '锻造材料，可在武器店出售' }
  };

  // ---------- 地图 ----------
  // 每张地图: id, name, color(地面基调), wallColor, level(推荐等级), width,height(格), monsters[], npcs[], boss
  const MAPS = {
    bichi: {
      id: 'bichi', name: '比奇城', ground: '#3a3428', wall: '#5a5040', level: 1,
      w: 40, h: 40, safe: true,
      monsters: [],
      npcs: ['elder', 'weaponShop', 'potionShop', 'smith', 'teleporter'],
      portals: [{ to: 'woma', x: 36, y: 36, name: '沃玛森林' }, { to: 'centipede', x: 36, y: 4, name: '蜈蚣洞' }]
    },
    woma: {
      id: 'woma', name: '沃玛森林', ground: '#243a22', wall: '#2f4a2b', level: 8,
      w: 48, h: 48,
      monsters: [
        { id: 'chicken', w: 30 }, { id: 'deer', w: 25 }, { id: 'orc', w: 25 }, { id: 'scarecrow', w: 20 }
      ],
      npcs: [],
      portals: [{ to: 'bichi', x: 4, y: 4, name: '比奇城' }, { to: 'zuma', x: 44, y: 44, name: '祖玛寺庙', level: 20 }]
    },
    centipede: {
      id: 'centipede', name: '蜈蚣洞', ground: '#3a2f2a', wall: '#4a3830', level: 15,
      w: 48, h: 48,
      monsters: [
        { id: 'orc', w: 20 }, { id: 'centipede', w: 45 }, { id: 'zombie', w: 35 }
      ],
      npcs: [],
      portals: [{ to: 'bichi', x: 4, y: 4, name: '比奇城' }, { to: 'shabak', x: 44, y: 4, name: '沙巴克', level: 30 }]
    },
    zuma: {
      id: 'zuma', name: '祖玛寺庙', ground: '#39323c', wall: '#4d4252', level: 28,
      w: 50, h: 50,
      monsters: [
        { id: 'zombie', w: 25 }, { id: 'zumaGuard', w: 45 }, { id: 'zumaArcher', w: 30 }
      ],
      npcs: [],
      portals: [{ to: 'woma', x: 4, y: 4, name: '沃玛森林' }, { to: 'chiyue', x: 46, y: 46, name: '赤月峡谷', level: 40 }]
    },
    shabak: {
      id: 'shabak', name: '沙巴克', ground: '#40342c', wall: '#58432f', level: 35,
      w: 50, h: 50,
      monsters: [
        { id: 'zumaGuard', w: 30 }, { id: 'whitePig', w: 40 }, { id: 'redMoonMonster', w: 30 }
      ],
      npcs: ['guildMaster'],
      portals: [{ to: 'centipede', x: 4, y: 46, name: '蜈蚣洞' }]
    },
    chiyue: {
      id: 'chiyue', name: '赤月峡谷', ground: '#3a2020', wall: '#542626', level: 45,
      w: 52, h: 52,
      monsters: [
        { id: 'redMoonMonster', w: 40 }, { id: 'bloodZombie', w: 35 }
      ],
      npcs: [],
      portals: [{ to: 'zuma', x: 4, y: 4, name: '祖玛寺庙' }],
      boss: 'chiyueDemon', bossAt: { x: 44, y: 44 }
    }
  };

  // ---------- 怪物 ----------
  // ai: passive(被动) | aggressive(主动) ; boss
  const MONSTERS = {
    chicken: { name: '鸡', hp: 30, atk: 4, def: 0, exp: 8, gold: 4, speed: 1.2, ai: 'passive', level: 1, color: '#d8c84a', size: 13, ranged: false, drops: [{ id: 'goldPotion', p: 0.25 }] },
    deer: { name: '鹿', hp: 55, atk: 7, def: 1, exp: 14, gold: 7, speed: 1.8, ai: 'passive', level: 3, color: '#a9763f', size: 16, ranged: false, drops: [{ id: 'goldPotion', p: 0.3 }, { id: 'bronzeSword', p: 0.05 }] },
    scarecrow: { name: '稻草人', hp: 70, atk: 10, def: 2, exp: 20, gold: 9, speed: 1.0, ai: 'aggressive', level: 5, color: '#c9a24a', size: 15, ranged: false, drops: [{ id: 'goldPotion', p: 0.3 }, { id: 'clothArmor', p: 0.08 }] },
    orc: { name: '半兽人', hp: 100, atk: 14, def: 3, exp: 30, gold: 13, speed: 1.5, ai: 'aggressive', level: 8, color: '#7f9a4a', size: 17, ranged: false, drops: [{ id: 'goldPotion', p: 0.35 }, { id: 'manaPotion', p: 0.3 }, { id: 'ironSword', p: 0.06 }] },
    centipede: { name: '蜈蚣', hp: 150, atk: 20, def: 5, exp: 48, gold: 20, speed: 2.0, ai: 'aggressive', level: 13, color: '#b5452f', size: 15, ranged: false, drops: [{ id: 'goldPotion', p: 0.4 }, { id: 'manaPotion', p: 0.4 }, { id: 'jingzhongyue', p: 0.05 }] },
    zombie: { name: '僵尸', hp: 210, atk: 26, def: 7, exp: 70, gold: 28, speed: 1.3, ai: 'aggressive', level: 18, color: '#6f8f7f', size: 17, ranged: false, drops: [{ id: 'sunWater', p: 0.2 }, { id: 'blueNecklace', p: 0.06 }, { id: 'heavyArmor', p: 0.05 }] },
    zumaGuard: { name: '祖玛卫士', hp: 340, atk: 38, def: 12, exp: 120, gold: 48, speed: 1.2, ai: 'aggressive', level: 26, color: '#8a7fa8', size: 19, ranged: false, drops: [{ id: 'sunWater', p: 0.3 }, { id: 'coralRing', p: 0.1 }, { id: 'judgement', p: 0.04 }] },
    zumaArcher: { name: '祖玛弓箭手', hp: 240, atk: 34, def: 8, exp: 100, gold: 42, speed: 1.4, ai: 'aggressive', level: 25, color: '#9e90b8', size: 17, ranged: true, drops: [{ id: 'manaPotion', p: 0.4 }, { id: 'boneStaff', p: 0.05 }] },
    whitePig: { name: '白野猪', hp: 520, atk: 48, def: 16, exp: 190, gold: 80, speed: 1.6, ai: 'aggressive', level: 32, color: '#e0d8c0', size: 22, ranged: false, drops: [{ id: 'sunWater', p: 0.35 }, { id: 'ghostRobe', p: 0.08 }, { id: 'dragonSword', p: 0.03 }] },
    redMoonMonster: { name: '赤月恶魔卫士', hp: 680, atk: 58, def: 20, exp: 260, gold: 110, speed: 1.7, ai: 'aggressive', level: 38, color: '#c23b3b', size: 21, ranged: false, drops: [{ id: 'sunWater', p: 0.4 }, { id: 'soulStaff', p: 0.05 }, { id: 'ghostHelmet', p: 0.08 }] },
    bloodZombie: { name: '血僵尸', hp: 820, atk: 66, def: 24, exp: 340, gold: 150, speed: 1.4, ai: 'aggressive', level: 42, color: '#9e2b3a', size: 20, ranged: false, drops: [{ id: 'sunWater', p: 0.5 }, { id: '屠龙', p: 0.015 }] },
    // BOSS
    chiyueDemon: { name: '赤月恶魔', boss: true, hp: 6000, atk: 95, def: 35, exp: 3000, gold: 2000, speed: 1.1, ai: 'aggressive', level: 48, color: '#ff3b3b', size: 40, ranged: true, drops: [{ id: '屠龙', p: 0.3 }, { id: 'soulStaff', p: 0.3 }, { id: 'dragonSword', p: 0.3 }] },
    // 骷髅宝宝（道士召唤）
    skeleton: { name: '骷髅', hp: 200, atk: 20, def: 5, exp: 0, gold: 0, speed: 2.0, ai: 'follow', level: 1, color: '#e8e4d8', size: 15, ranged: false, drops: [] }
  };

  // ---------- NPC ----------
  const NPCS = {
    elder: { name: '比奇城主', color: '#d4af37', title: '新手引导员' },
    weaponShop: { name: '武器店老板', color: '#b87333', title: '武器商人' },
    potionShop: { name: '药店老板', color: '#4a9d5f', title: '药商' },
    smith: { name: '铁匠', color: '#8a8a8a', title: '装备强化师' },
    teleporter: { name: '老兵', color: '#6a8fc0', title: '传送使者' },
    guildMaster: { name: '行会会长', color: '#c0563f', title: '沙巴克行会' }
  };

  // ---------- 机器人玩家名字池 ----------
  const BOT_NAMES = [
    '战神无敌', '法力无边', '道士小仙', '一刀秒杀', '狂战士', '冰霜法师',
    '逍遥道长', '沙城霸主', '传奇之魂', '孤独求败', '烈火战神', '雷电法王',
    '骷髅召唤师', '热血青年', '打宝达人', '沃玛之王', '祖玛战将', '赤月猎人',
    '金币多多', '升级狂魔', 'PK之王', '飘逸法师', '神圣道士', '无敌小战士'
  ];

  // 机器人聊天语料
  const BOT_CHAT = [
    '有人一起打BOSS吗？', '刚爆了一把裁决，爽！', '沃玛森林的鸡好多啊',
    '组个队啊，道士加血', '沙巴克什么时候攻城？', '这游戏真好玩',
    '有没有人卖金创药？', '法师升级就是快', '战士后期无敌，不信等着瞧',
    '道士召唤神兽太强了', '赤月恶魔谁去单挑过？', '爆极品装备了哈哈',
    '新手来比奇城找我带', '今天运气不错', '求组队打祖玛', '行会招人啦'
  ];

  // ---------- 任务 ----------
  // type: kill(杀怪) | collect(收集) | talk(对话) | boss
  const QUESTS = [
    {
      id: 'q1', name: '初出茅庐', npc: 'elder', level: 1,
      desc: '欢迎来到传奇世界！先去比奇城外杀 5 只鸡证明你的实力。',
      type: 'kill', target: 'chicken', need: 5,
      reward: { exp: 120, gold: 100, items: [{ id: 'goldPotion', n: 5 }] }
    },
    {
      id: 'q2', name: '森林猎手', npc: 'elder', level: 5,
      desc: '沃玛森林的半兽人时常骚扰村民，消灭 8 只半兽人。',
      type: 'kill', target: 'orc', need: 8,
      reward: { exp: 400, gold: 300, items: [{ id: 'manaPotion', n: 5 }, { id: 'bronzeSword', n: 1 }] }
    },
    {
      id: 'q3', name: '药商的请求', npc: 'potionShop', level: 8,
      desc: '药店缺少材料，帮我收集 3 块金矿石吧（打怪有几率掉落）。',
      type: 'collect', target: 'goldOre', need: 3,
      reward: { exp: 500, gold: 500, items: [{ id: 'sunWater', n: 3 }] }
    },
    {
      id: 'q4', name: '清理蜈蚣洞', npc: 'weaponShop', level: 13,
      desc: '蜈蚣洞的蜈蚣泛滥，消灭 12 只蜈蚣，顺便找找好装备。',
      type: 'kill', target: 'centipede', need: 12,
      reward: { exp: 1200, gold: 800, items: [{ id: 'jingzhongyue', n: 1 }] }
    },
    {
      id: 'q5', name: '僵尸危机', npc: 'smith', level: 18,
      desc: '蜈蚣洞深处出现大量僵尸，消灭 15 只僵尸保护矿工。',
      type: 'kill', target: 'zombie', need: 15,
      reward: { exp: 2500, gold: 1500, items: [{ id: 'heavyArmor', n: 1 }] }
    },
    {
      id: 'q6', name: '祖玛的威胁', npc: 'smith', level: 26,
      desc: '祖玛寺庙的卫士蠢蠢欲动，消灭 10 只祖玛卫士。',
      type: 'kill', target: 'zumaGuard', need: 10,
      reward: { exp: 5000, gold: 3000, items: [{ id: 'judgement', n: 1 }] }
    },
    {
      id: 'q7', name: '沙巴克之行', npc: 'guildMaster', level: 35,
      desc: '白野猪在沙巴克附近横行，消灭 8 只白野猪为行会扬名。',
      type: 'kill', target: 'whitePig', need: 8,
      reward: { exp: 9000, gold: 6000, items: [{ id: 'ghostRobe', n: 1 }] }
    },
    {
      id: 'q8', name: '讨伐赤月恶魔', npc: 'guildMaster', level: 45,
      desc: '终极任务！前往赤月峡谷击败邪恶的赤月恶魔，拯救传奇世界！',
      type: 'boss', target: 'chiyueDemon', need: 1,
      reward: { exp: 20000, gold: 20000, items: [{ id: '屠龙', n: 1 }, { id: 'soulStaff', n: 1 }] }
    }
  ];

  // 升级所需经验
  function expNeeded(level) {
    return Math.floor(80 * Math.pow(level, 1.55));
  }

  global.GameData = {
    CLASSES, SKILLS, RARITY, ITEMS, MAPS, MONSTERS, NPCS,
    BOT_NAMES, BOT_CHAT, QUESTS, expNeeded
  };
})(window);
