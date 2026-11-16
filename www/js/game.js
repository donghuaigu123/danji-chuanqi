/* ============================================================
 * 单机传奇 —— 游戏引擎 (game.js)
 * 俯视角 2D 动作RPG：地图/战斗/AI机器人/任务/背包/存档
 * ============================================================ */
(function (global) {
  'use strict';
  const D = global.GameData;
  const TILE = 40;

  // 工具函数
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const choice = arr => arr[Math.floor(Math.random() * arr.length)];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => performance.now();
  function t_since(e, key) { return now() - (e['_' + key] || 0); }

  function Game() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.mini = document.getElementById('minimap');
    this.mctx = this.mini.getContext('2d');
    this.state = 'menu'; // menu | playing | dialog
    this.keys = {};
    this.joy = { x: 0, y: 0, active: false };
    this.cam = { x: 0, y: 0 };
    this.entities = [];
    this.drops = [];
    this.effects = [];
    this.bots = [];
    this.target = null;
    this.moveTarget = null;
    this.lastTime = now();
    this.lastSave = now();
    this.botChatTimer = 0;
    this.paused = false;
    this._bindGlobal();
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  Game.prototype = {
    /* ---------- 初始化玩家 ---------- */
    newGame(cls, name) {
      const c = D.CLASSES[cls];
      this.player = {
        isPlayer: true, cls, name: name || '传奇勇士',
        x: 0, y: 0, level: 1, exp: 0, gold: 200,
        base: Object.assign({}, c.base),
        hp: 0, mp: 0,
        skills: {}, inventory: [], equipment: {},
        atkTimer: 0, alive: true, shieldUntil: 0,
        buffAtk: 0, poisonImmune: 0,
        color: c.color, size: 16, speed: c.base.speed,
        facing: { x: 0, y: 1 }, animT: 0,
        quests: {}, killCount: {}, playTime: 0,
        rebirth: 0, bonus: { atk: 0, matk: 0, tao: 0, def: 0, hp: 0 },
        upgrades: {}
      };
      // 技能等级
      c.skills.forEach(s => this.player.skills[s] = 1);
      // 初始物品
      this.addItem('woodenSword', 1);
      this.addItem('clothArmor', 1);
      this.addItem('goldPotion', 10);
      this.addItem('manaPotion', 8);
      this.equipItem('woodenSword', true);
      this.equipItem('clothArmor', true);
      this.player.hp = this.maxHp(this.player);
      this.player.mp = this.maxMp(this.player);
      this.mapId = 'bichi';
      this.map = D.MAPS.bichi;
      this._genMap();
      this.player.x = 20 * TILE; this.player.y = 22 * TILE;
      this.entities = [this.player];
      this.drops = []; this.effects = [];
      this.target = null; this.moveTarget = null;
      this.spawnBots();
      this.spawnBoss();
      this.state = 'playing';
      this._buildQuickBar();
      this.log('欢迎来到传奇世界，' + this.player.name + '！', 'sys');
      this.log('点击「任务」查看可接任务，先在比奇城外杀几只鸡吧。', 'sys');
      this.toast('欢迎来到传奇！');
      this.updateHUD();
      this.save();
    },

    /* ---------- 存档 ---------- */
    save() {
      if (!this.player) return;
      const p = this.player;
      const data = {
        v: 2,
        player: {
          cls: p.cls, name: p.name, x: p.x, y: p.y, level: p.level, exp: p.exp, gold: p.gold,
          base: p.base, hp: p.hp, mp: p.mp, skills: p.skills,
          inventory: p.inventory, equipment: p.equipment, quests: p.quests,
          killCount: p.killCount, playTime: p.playTime,
          rebirth: p.rebirth, bonus: p.bonus, upgrades: p.upgrades
        },
        mapId: this.mapId
      };
      try { localStorage.setItem('danji-chuanqi-save', JSON.stringify(data)); } catch (e) {}
      this.lastSave = now();
    },
    hasSave() { return !!localStorage.getItem('danji-chuanqi-save'); },
    load() {
      try {
        const d = JSON.parse(localStorage.getItem('danji-chuanqi-save'));
        if (!d || d.v !== 2) return false;
        const c = D.CLASSES[d.player.cls];
        this.player = Object.assign({
          isPlayer: true, atkTimer: 0, alive: true, shieldUntil: 0,
          buffAtk: 0, poisonImmune: 0, color: c.color, size: 16,
          speed: c.base.speed, facing: { x: 0, y: 1 }, animT: 0,
          rebirth: 0, bonus: { atk: 0, matk: 0, tao: 0, def: 0, hp: 0 }, upgrades: {}
        }, d.player);
        if (!this.player.bonus) this.player.bonus = { atk: 0, matk: 0, tao: 0, def: 0, hp: 0 };
        if (!this.player.upgrades) this.player.upgrades = {};
        if (this.player.rebirth == null) this.player.rebirth = 0;
        this.mapId = d.mapId;
        this.map = D.MAPS[this.mapId];
        this._genMap();
        this.entities = [this.player];
        this.drops = []; this.effects = [];
        this.target = null; this.moveTarget = null;
        this.spawnBots();
        this.spawnBoss();
        this.state = 'playing';
        this._buildQuickBar();
        this.log('欢迎回来，' + this.player.name + '！', 'sys');
        this.updateHUD();
        return true;
      } catch (e) { return false; }
    },

    /* ---------- 地图生成 ---------- */
    _genMap() {
      const m = this.map;
      this.tiles = [];
      for (let y = 0; y < m.h; y++) {
        const row = [];
        for (let x = 0; x < m.w; x++) {
          // 边界墙 + 随机障碍
          let wall = (x === 0 || y === 0 || x === m.w - 1 || y === m.h - 1);
          if (!wall && !m.safe && Math.random() < 0.06) wall = true;
          row.push(wall ? 1 : 0);
        }
        this.tiles.push(row);
      }
      // 主城放一些建筑方块（装饰墙）
      if (m.safe) {
        for (let y = 6; y < 12; y++) for (let x = 8; x < 15; x++) this.tiles[y][x] = 1;
        for (let y = 6; y < 12; y++) for (let x = 24; x < 31; x++) this.tiles[y][x] = 1;
      }
      // NPC 放置
      this.npcs = [];
      if (m.npcs) {
        const spots = [{ x: 10, y: 16 }, { x: 14, y: 16 }, { x: 18, y: 16 }, { x: 22, y: 16 }, { x: 26, y: 16 }, { x: 30, y: 16 }];
        m.npcs.forEach((id, i) => {
          const s = spots[i % spots.length];
          this.npcs.push({ id, x: s.x * TILE + 20, y: s.y * TILE + 20, ...D.NPCS[id] });
        });
      }
      // 传送点
      this.portals = (m.portals || []).map(p => ({ ...p, px: p.x * TILE + 20, py: p.y * TILE + 20 }));
      this.spawnMonsters();
    },

    isWall(tx, ty) {
      if (ty < 0 || tx < 0 || ty >= this.map.h || tx >= this.map.w) return true;
      return this.tiles[ty][tx] === 1;
    },
    canMove(x, y, r) {
      r = r || 12;
      const pts = [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]];
      for (const [px, py] of pts) if (this.isWall(Math.floor(px / TILE), Math.floor(py / TILE))) return false;
      return true;
    },

    /* ---------- 怪物刷新 ---------- */
    spawnMonsters() {
      const m = this.map;
      const count = m.safe ? 0 : Math.min(26, 12 + m.level);
      for (let i = 0; i < count; i++) {
        const type = this._pickMonster(m.monsters);
        if (type) this.spawnMonster(type, this._randomOpenTile());
      }
    },
    _pickMonster(list) {
      if (!list || !list.length) return null;
      const total = list.reduce((s, m) => s + m.w, 0);
      let r = Math.random() * total;
      for (const m of list) { if ((r -= m.w) <= 0) return m.id; }
      return list[0].id;
    },
    _randomOpenTile() {
      for (let i = 0; i < 60; i++) {
        const tx = randInt(2, this.map.w - 3), ty = randInt(2, this.map.h - 3);
        if (!this.isWall(tx, ty) && dist({ x: tx * TILE, y: ty * TILE }, this.player ? this.player : { x: 0, y: 0 }) > 220) {
          return { x: tx * TILE + 20, y: ty * TILE + 20 };
        }
      }
      return { x: randInt(4, this.map.w - 5) * TILE, y: randInt(4, this.map.h - 5) * TILE };
    },
    spawnMonster(typeId, pos, isPet, owner) {
      const def = D.MONSTERS[typeId];
      if (!def) return null;
      const hpScale = isPet ? (1 + (this.player ? this.player.level : 1) * 0.08) : 1;
      const e = {
        id: typeId, def, isMonster: true, isPet: !!isPet, owner: owner || null,
        x: pos.x, y: pos.y, homeX: pos.x, homeY: pos.y,
        hp: Math.floor(def.hp * hpScale), maxHp: Math.floor(def.hp * hpScale),
        atk: def.atk, armor: def.def, speed: def.speed, size: def.size,
        color: def.color, ai: isPet ? 'follow' : def.ai, ranged: def.ranged,
        atkTimer: rand(0, 1), alive: true, facing: { x: 0, y: 1 }, animT: Math.random() * 3,
        poisonUntil: 0, poisonTick: 0, stunUntil: 0, slowUntil: 0
      };
      this.entities.push(e);
      return e;
    },
    spawnBoss() {
      if (!this.map.boss) return;
      const at = this.map.bossAt || { x: this.map.w - 6, y: this.map.h - 6 };
      const boss = this.spawnMonster(this.map.boss, { x: at.x * TILE, y: at.y * TILE });
      if (boss) { boss.isBoss = true; boss.respawn = 0; }
    },

    /* ---------- 机器人玩家 ---------- */
    spawnBots() {
      this.bots = [];
      const n = this.map.safe ? 6 : 4;
      const names = [...D.BOT_NAMES];
      for (let i = 0; i < n; i++) {
        const idx = randInt(0, names.length - 1);
        const name = names.splice(idx, 1)[0] || ('玩家' + i);
        const cls = choice(['warrior', 'mage', 'taoist']);
        const c = D.CLASSES[cls];
        const lv = Math.max(1, this.player.level + randInt(-3, 4));
        const pos = this._randomOpenTile();
        const scale = 1 + (lv - 1) * 0.5;
        const bot = {
          isBot: true, isPlayer: false, name, cls, color: c.color, size: 16,
          x: pos.x, y: pos.y, level: lv,
          hp: (c.base.hp + lv * c.growth.hp) * scale,
          maxHp: (c.base.hp + lv * c.growth.hp) * scale,
          mp: (c.base.mp + lv * c.growth.mp) * scale,
          maxMp: (c.base.mp + lv * c.growth.mp) * scale,
          atk: (c.base.atk + lv * c.growth.atk) * scale,
          speed: c.base.speed, facing: { x: 0, y: 1 }, animT: Math.random() * 3,
          atkTimer: rand(0, 1), alive: true, state: 'wander', stateT: rand(1, 4),
          target: null, wanderTarget: null, guild: Math.random() < 0.4 ? '沙巴克' : '',
          shieldUntil: 0
        };
        this.bots.push(bot);
        this.entities.push(bot);
      }
    },

    /* ---------- 主循环 ---------- */
    loop() {
      const t = now();
      let dt = (t - this.lastTime) / 1000;
      this.lastTime = t;
      dt = Math.min(dt, 0.05);
      if (this.state === 'playing' && !this.paused) this.update(dt);
      this.render();
      requestAnimationFrame(this.loop);
    },

    update(dt) {
      const p = this.player;
      const t = now();
      p.playTime += dt;
      p.animT += dt;
      // 输入移动
      let mx = 0, my = 0;
      if (this.keys['w'] || this.keys['arrowup']) my -= 1;
      if (this.keys['s'] || this.keys['arrowdown']) my += 1;
      if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
      if (this.keys['d'] || this.keys['arrowright']) mx += 1;
      if (this.joy.active) { mx += this.joy.x; my += this.joy.y; }
      if (this.moveTarget) {
        const d = dist(p, this.moveTarget);
        if (d > 6) { mx = (this.moveTarget.x - p.x) / d; my = (this.moveTarget.y - p.y) / d; }
        else this.moveTarget = null;
      }
      const mag = Math.hypot(mx, my);
      if (mag > 0.05) {
        mx /= mag; my /= mag;
        const spd = this.effSpeed(p) * dt;
        if (this.canMove(p.x + mx * spd, p.y, p.size)) p.x += mx * spd;
        if (this.canMove(p.x, p.y + my * spd, p.size)) p.y += my * spd;
        p.facing = { x: mx, y: my };
        this.moveTarget = null;
      }
      // 自动回血回蓝
      if (t_since(p, 'lastHpRegen') > 1) {
        p._lastHpRegen = now();
        p.hp = Math.min(this.maxHp(p), p.hp + Math.max(1, p.level * 0.3));
        p.mp = Math.min(this.maxMp(p), p.mp + Math.max(1, p.level * 0.4));
      }
      // 攻击冷却
      p.atkTimer = Math.max(0, p.atkTimer - dt);
      // 按住攻击/自动攻击目标
      if ((this.keys['attack'] || this.autoAttack) && p.atkTimer <= 0) {
        if (this.target && this.target.alive && dist(p, this.target) < this.attackRange(p)) {
          this.basicAttack(p, this.target);
        } else {
          // 自动找最近怪物
          const near = this.nearestEnemy(p, this.attackRange(p) + 20);
          if (near) { this.target = near; this.basicAttack(p, near); }
          else if (this.autoAttack && !this.keys['attack']) this.autoAttack = false;
        }
      }
      // 更新实体
      for (const e of this.entities) {
        if (!e.alive) continue;
        e.animT += dt;
        e.atkTimer = Math.max(0, e.atkTimer - dt);
        if (e.isMonster) this.updateMonster(e, dt);
        else if (e.isBot) this.updateBot(e, dt);
        // 中毒
        if (e.poisonUntil && t < e.poisonUntil) {
          e.poisonTick -= dt;
          if (e.poisonTick <= 0) { e.poisonTick = 1; this.damage(e, D.SKILLS.poison.power + (e.ownerLevel || 0), 'poison'); }
        }
      }
      // 清理死亡
      this.entities = this.entities.filter(e => {
        if (!e.alive) {
          if (e.isMonster && !e.isPet) {
            this.onMonsterDeath(e);
            if (e.isBoss) {
              const mapId = this.mapId, pos = { x: e.homeX, y: e.homeY };
              this.log('【BOSS】' + e.def.name + ' 将在 60 秒后重生。', 'sys');
              setTimeout(() => { if (this.state === 'playing' && this.mapId === mapId) { const b = this.spawnMonster(this.map.boss, pos); if (b) { b.isBoss = true; } } }, 60000);
            }
          }
          if (e.isBot) {
            // 机器人复活
            setTimeout(() => { if (this.state === 'playing') { e.alive = true; e.hp = e.maxHp; const pos = this._randomOpenTile(); e.x = pos.x; e.y = pos.y; } }, 5000);
          }
          return false;
        }
        return true;
      });
      // 宠物清理
      this.entities = this.entities.filter(e => !(e.isPet && !e.alive));
      // 掉落物
      this.drops.forEach(d => d.life -= dt);
      this.drops = this.drops.filter(d => d.life > 0);
      // 特效
      this.effects.forEach(e => { e.t += dt; });
      this.effects = this.effects.filter(e => e.t < e.life);
      // 机器人聊天
      this.botChatTimer -= dt;
      if (this.botChatTimer <= 0) {
        this.botChatTimer = rand(6, 14);
        const b = choice(this.bots);
        if (b) this.log(b.name + '：' + choice(D.BOT_CHAT), 'bot');
      }
      // 自动存档
      if (t - this.lastSave > 15000) this.save();
      // HUD 刷新（节流）
      this.hudTimer = (this.hudTimer || 0) + dt;
      if (this.hudTimer > 0.15) { this.hudTimer = 0; this.updateHUD(); this.updateTargetInfo(); }
      this.updateMinimap();
      this.updateCooldowns();
    },

    /* ---------- 怪物 AI ---------- */
    updateMonster(m, dt) {
      if (m.stunUntil && now() < m.stunUntil) return;
      const p = this.player;
      let tx = m.homeX, ty = m.homeY, chase = false;
      if (m.ai === 'follow' && m.owner) {
        tx = m.owner.x; ty = m.owner.y;
        if (dist(m, m.owner) > 90) chase = true;
      } else if (m.isPet) {
        // 找宠物附近的敌人
        const foe = this.nearestEnemy(m, 140, true);
        if (foe) { tx = foe.x; ty = foe.y; chase = dist(m, foe) > 30;
          if (dist(m, foe) <= 34 && m.atkTimer <= 0) this.monsterAttack(m, foe);
        } else { tx = p.x + rand(-40, 40); ty = p.y + rand(-40, 40); chase = dist(m, p) > 70; }
      } else if (m.ai === 'aggressive' || m.ai === 'passive') {
        // 仇恨：玩家或机器人
        let prey = null, pd = 130;
        const candidates = [p, ...this.bots];
        for (const c of candidates) {
          if (!c.alive) continue;
          const d = dist(m, c);
          if (d < pd && (m.ai === 'aggressive' || d < 70)) { prey = c; pd = d; }
        }
        if (prey) { tx = prey.x; ty = prey.y; chase = pd > (m.ranged ? 90 : 28);
          if (m.ranged && pd < 150 && m.atkTimer <= 0) this.monsterRangedAttack(m, prey);
          else if (!m.ranged && pd < 34 && m.atkTimer <= 0) this.monsterAttack(m, prey);
        }
      }
      if (chase) {
        const d = dist({ x: m.x, y: m.y }, { x: tx, y: ty }) || 1;
        const dx = (tx - m.x) / d, dy = (ty - m.y) / d;
        let spd = m.speed * dt * (m.slowUntil && now() < m.slowUntil ? 0.5 : 1) * 28;
        if (this.canMove(m.x + dx * spd, m.y, m.size)) m.x += dx * spd;
        if (this.canMove(m.x, m.y + dy * spd, m.size)) m.y += dy * spd;
        m.facing = { x: dx, y: dy };
      }
    },
    monsterAttack(m, target) {
      m.atkTimer = 1.2;
      const dmg = Math.max(1, Math.floor(m.atk * rand(0.85, 1.15) - this.defense(target) * 0.4));
      this.damage(target, dmg, 'normal');
      this.effect('slash', target.x, target.y, '#ff6b5a');
      if (target.isBot && Math.random() < 0.3) this.botMoveAway(target, m);
    },
    monsterRangedAttack(m, target) {
      m.atkTimer = 1.8;
      const dmg = Math.max(1, Math.floor(m.atk * rand(0.8, 1.2) - this.mdefense(target) * 0.4));
      this.effect('projectile', m.x, m.y, m.color, { tx: target.x, ty: target.y, dmg, target, speed: 260 });
    },

    /* ---------- 机器人 AI ---------- */
    updateBot(b, dt) {
      b.stateT -= dt;
      if (b.stateT <= 0) {
        b.state = choice(['wander', 'wander', 'hunt', 'hunt', 'rest']);
        b.stateT = rand(2, 6);
        b.wanderTarget = null; b.target = null;
      }
      let tx, ty, moving = false;
      if (b.state === 'hunt') {
        const foe = this.nearestEnemy(b, 150, true);
        if (foe) {
          b.target = foe; tx = foe.x; ty = foe.y;
          if (dist(b, foe) < this.attackRange(b) && b.atkTimer <= 0) {
            b.atkTimer = rand(1.0, 1.6);
            const dmg = Math.max(1, Math.floor(b.atk * rand(0.8, 1.2)));
            this.damage(foe, dmg, 'bot');
            this.effect('slash', foe.x, foe.y, b.color);
          }
          moving = dist(b, foe) > this.attackRange(b) - 10;
        }
      }
      if (!moving) {
        if (!b.wanderTarget || dist(b, b.wanderTarget) < 12) b.wanderTarget = this._randomOpenTile();
        tx = b.wanderTarget.x; ty = b.wanderTarget.y; moving = true;
      }
      if (moving) {
        const d = dist(b, { x: tx, y: ty }) || 1;
        const dx = (tx - b.x) / d, dy = (ty - b.y) / d;
        const spd = b.speed * dt * 26;
        if (this.canMove(b.x + dx * spd, b.y, b.size)) b.x += dx * spd;
        if (this.canMove(b.x, b.y + dy * spd, b.size)) b.y += dy * spd;
        b.facing = { x: dx, y: dy };
      }
      b.hp = Math.min(b.maxHp, b.hp + dt * b.level * 0.5);
    },
    botMoveAway(b, from) {
      const d = dist(b, from) || 1;
      b.wanderTarget = { x: b.x + (b.x - from.x) / d * 120, y: b.y + (b.y - from.y) / d * 120 };
      b.state = 'wander'; b.stateT = 3;
    },

    /* ---------- 战斗 ---------- */
    attackRange(e) { return e.cls === 'warrior' || e.isMonster ? 42 : 130; },
    nearestEnemy(from, range, includeMonstersOnly) {
      let best = null, bd = range;
      for (const e of this.entities) {
        if (!e.alive || e === from) continue;
        if (e.isPlayer && includeMonstersOnly) continue;
        if (e.isBot && includeMonstersOnly) continue;
        if (!e.isMonster && !includeMonstersOnly) continue;
        const d = dist(from, e);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    },
    basicAttack(p, target) {
      p.atkTimer = 0.6 / this.attackSpeed(p);
      const atkStat = this.attack(p);
      const crit = Math.random() < 0.12;
      let dmg = atkStat * rand(0.9, 1.1) * (crit ? 1.8 : 1);
      dmg = Math.max(1, dmg - this.defense(target) * 0.5);
      if (p.cls === 'warrior') this.effect('slash', target.x, target.y, '#ffe08a');
      else if (p.cls === 'mage') this.effect('bolt', p.x, p.y, '#ff9b3a', { tx: target.x, ty: target.y, speed: 320, target, dmg, caster: p });
      else this.effect('bolt', p.x, p.y, '#ff5b8a', { tx: target.x, ty: target.y, speed: 300, target, dmg, caster: p });
      if (p.cls !== 'mage' && p.cls !== 'taoist') this.damage(target, dmg, crit ? 'crit' : 'normal', p);
      if (p.cls === 'taoist' || p.cls === 'mage') {
        // 远程弹道命中回调在 effect 更新里处理
      }
      p.facing = { x: target.x - p.x, y: target.y - p.y };
    },
    castSkill(key) {
      const p = this.player;
      if (p.atkTimer > 0 || this.state !== 'playing') return;
      const sk = D.SKILLS[key], lvl = p.skills[key] || 0;
      if (!sk || !lvl) return;
      if (p.level < sk.level) { this.toast('需要等级 ' + sk.level); return; }
      if (p.mp < sk.mp) { this.toast('魔法不足'); return; }
      if (sk.type === 'passive') { this.toast('被动技能无需施放'); return; }
      p.mp -= sk.mp;
      p.atkTimer = clamp(0.8 - lvl * 0.03, 0.3, 0.8);
      const power = sk.power * (1 + (lvl - 1) * 0.12);
      this.effect('cast', p.x, p.y, sk.color || '#f2d27a');

      switch (sk.type) {
        case 'melee': {
          const t = this.target && this.target.alive && dist(p, this.target) < 60 ? this.target : this.nearestEnemy(p, 60);
          if (t) {
            let dmg = this.attack(p) * power - this.defense(t) * 0.5;
            this.damage(t, dmg, 'crit', p);
            this.effect('slash', t.x, t.y, '#ffe08a');
            if (sk.stun) t.stunUntil = now() + sk.stun * 1000;
          } else this.toast('没有目标');
          break;
        }
        case 'ranged': {
          const t = this.target && this.target.alive ? this.target : this.nearestEnemy(p, 200);
          if (t) this.effect('bolt', p.x, p.y, sk.color || '#fff', { tx: t.x, ty: t.y, speed: 340, target: t, dmg: this.attack(p) * power, caster: p, skill: key });
          else this.toast('没有目标');
          break;
        }
        case 'aoe': {
          const r = sk.radius || 60;
          this.effect('aoe', p.x, p.y, sk.color || '#fff', { r });
          let hit = 0;
          for (const e of this.entities) {
            if (!e.alive || e === p || (e.isBot)) continue;
            if (!e.isMonster) continue;
            if (dist(p, e) <= r) {
              const dmg = (p.cls === 'warrior' ? this.attack(p) : this.matk(p)) * power - this.defense(e) * 0.4;
              this.damage(e, dmg, 'crit', p);
              if (sk.slow) e.slowUntil = now() + 3000;
              if (sk.stun) e.stunUntil = now() + sk.stun * 1000;
              hit++;
            }
          }
          break;
        }
        case 'heal': {
          if (sk.aoe) {
            p.hp = Math.min(this.maxHp(p), p.hp + sk.power * (1 + (lvl - 1) * 0.1));
            this.bots.forEach(b => { if (dist(p, b) < 120 && b.alive) b.hp = Math.min(b.maxHp, b.hp + sk.power); });
            this.effect('healAll', p.x, p.y, '#6beb8a', { r: 120 });
          } else {
            p.hp = Math.min(this.maxHp(p), p.hp + sk.power * (1 + (lvl - 1) * 0.1));
            this.float('+' + sk.power, p.x, p.y, 'heal');
          }
          break;
        }
        case 'poison': {
          const t = this.target && this.target.alive ? this.target : this.nearestEnemy(p, 160);
          if (t) { t.poisonUntil = now() + sk.duration * 1000; t.poisonTick = 1; t.ownerLevel = p.level;
            this.effect('bolt', p.x, p.y, '#7bd44a', { tx: t.x, ty: t.y, speed: 300, target: t, dmg: 1, caster: p, noDamage: true }); }
          break;
        }
        case 'summon': {
          const cnt = this.entities.filter(e => e.isPet && e.owner === p).length;
          if (cnt < 2) {
            const pos = { x: p.x + rand(-40, 40), y: p.y + rand(-40, 40) };
            this.spawnMonster('skeleton', pos, true, p);
            this.toast('召唤骷髅成功！');
          } else this.toast('骷髅数量已达上限');
          break;
        }
        case 'buff': {
          p.shieldUntil = now() + sk.duration * 1000;
          this.toast('魔法盾已开启');
          break;
        }
      }
      this.updateHUD();
    },

    damage(target, amount, type, source) {
      if (!target || !target.alive) return;
      let dmg = Math.max(1, Math.floor(amount));
      // 魔法盾减伤
      if (target.shieldUntil && now() < target.shieldUntil) dmg = Math.floor(dmg * 0.6);
      target.hp -= dmg;
      this.float('-' + dmg, target.x + rand(-8, 8), target.y - 10, type === 'crit' ? 'crit' : 'dmg');
      if (type === 'poison') this.float('毒', target.x, target.y - 20, 'heal');
      if (target.isPlayer) this.effect('hurt', target.x, target.y, '#ff0000');
      if (target.hp <= 0) {
        target.hp = 0; target.alive = false;
        if (target.isPlayer) this.onPlayerDeath();
      }
    },

    /* ---------- 死亡/掉落 ---------- */
    onMonsterDeath(e) {
      const def = e.def;
      // 经验 & 金币（仅玩家或宠物击杀）
      if (e.owner === this.player || e.lastHitBy === this.player || (!e.isPet && dist(e, this.player) < 200)) {
        const exp = def.exp;
        this.gainExp(exp);
        const gold = def.gold;
        if (gold) { this.player.gold += gold; this.float('+' + gold + '金', e.x, e.y - 24, 'heal'); }
        // 任务计数
        if (!e.isPet) this.player.killCount[e.id] = (this.player.killCount[e.id] || 0) + 1;
      }
      // 掉落
      if (def.drops && !e.isPet) {
        for (const drop of def.drops) {
          if (Math.random() < drop.p) this.spawnDrop(drop.id, e.x + rand(-14, 14), e.y + rand(-14, 14));
        }
      }
      this.effect('die', e.x, e.y, e.color);
      if (e.isBoss) {
        this.log('【BOSS】' + def.name + ' 被击败了！', 'loot');
        this.toast('击败 ' + def.name + '！');
      }
    },
    spawnDrop(id, x, y) {
      this.drops.push({ id, x, y, life: 60000, bob: Math.random() * 6 });
    },
    onPlayerDeath() {
      this.toast('你被击败了！');
      this.log('你被击败，已在比奇城复活。', 'sys');
      this.player.gold = Math.floor(this.player.gold * 0.9);
      this.changeMap('bichi', true);
      this.player.hp = this.maxHp(this.player);
      this.player.mp = this.maxMp(this.player);
      this.target = null;
    },

    /* ---------- 属性计算 ---------- */
    rebirthMul(e) { return 1 + (e.rebirth || 0) * 0.3; },
    maxHp(e) {
      if (!e.base) return e.maxHp || 100;
      const rb = this.rebirthMul(e);
      return Math.floor((e.base.hp + (e.level - 1) * (D.CLASSES[e.cls].growth.hp)) * rb + this.equipBonus(e, 'hp') + (e.bonus ? e.bonus.hp : 0));
    },
    maxMp(e) {
      if (!e.base) return e.maxMp || 50;
      const rb = this.rebirthMul(e);
      return Math.floor((e.base.mp + (e.level - 1) * (D.CLASSES[e.cls].growth.mp)) * rb + this.equipBonus(e, 'mp'));
    },
    attack(e) {
      if (e.isMonster || e.isBot) return e.atk || 5;
      const rb = this.rebirthMul(e);
      let a = (e.base.atk + (e.level - 1) * D.CLASSES[e.cls].growth.atk) * rb + this.equipBonus(e, 'atk') + (e.bonus ? e.bonus.atk : 0);
      if (e.cls === 'warrior' && e.skills.basicSword) a *= 1.1;
      if (e.buffAtk && now() < e.buffAtk) a *= 1.2;
      if (e.cls === 'taoist' && e.skills.spiritStrike) a *= 1.08;
      return Math.max(1, a);
    },
    matk(e) {
      if (e.isMonster || e.isBot) return e.atk || 5;
      const rb = this.rebirthMul(e);
      return Math.max(1, (e.base.matk + (e.level - 1) * D.CLASSES[e.cls].growth.matk) * rb + this.equipBonus(e, 'matk') + (e.bonus ? e.bonus.matk : 0));
    },
    tao(e) {
      const rb = this.rebirthMul(e);
      return Math.max(1, (e.base.tao + (e.level - 1) * D.CLASSES[e.cls].growth.tao) * rb + this.equipBonus(e, 'tao') + (e.bonus ? e.bonus.tao : 0));
    },
    defense(e) {
      if (e.isMonster || e.isBot) return e.armor || 0;
      const rb = this.rebirthMul(e);
      return Math.max(0, (e.base.def + (e.level - 1) * D.CLASSES[e.cls].growth.def) * rb + this.equipBonus(e, 'def') + (e.bonus ? e.bonus.def : 0));
    },
    mdefense(e) {
      if (e.isMonster || e.isBot) return 0;
      return Math.max(0, e.base.mdef + (e.level - 1) * D.CLASSES[e.cls].growth.mdef + this.equipBonus(e, 'mdef'));
    },
    effSpeed(e) {
      return (e.base ? e.base.speed : e.speed || 2.5) * 30 + this.equipBonus(e, 'speed') * 10;
    },
    attackSpeed(e) { return 1 + (e.level - 1) * 0.01; },
    equipBonus(e, stat) {
      let sum = 0;
      const eq = e.equipment || {};
      const ups = e.upgrades || {};
      for (const k in eq) {
        const it = D.ITEMS[eq[k]];
        if (it && it[stat]) {
          const lv = ups[k] || 0;
          sum += it[stat] * (1 + lv * 0.25); // 每级强化 +25%
        }
      }
      return Math.floor(sum);
    },

    /* ---------- 经验/升级 ---------- */
    gainExp(amount) {
      const p = this.player;
      p.exp += amount;
      let leveled = false;
      while (p.exp >= D.expNeeded(p.level)) {
        p.exp -= D.expNeeded(p.level);
        p.level++;
        leveled = true;
        p.hp = this.maxHp(p); p.mp = this.maxMp(p);
      }
      if (leveled) {
        this.toast('升级啦！ Lv.' + p.level);
        this.log('恭喜升级！你现在是 ' + p.level + ' 级。', 'sys');
        this.effect('levelup', p.x, p.y, '#ffd75e');
        this.save();
      }
      // 自动学习技能
      for (const key in D.SKILLS) {
        const sk = D.SKILLS[key];
        if (sk.cls === p.cls && p.level >= sk.level && !p.skills[key]) {
          p.skills[key] = 1;
          this.log('学会了新技能：' + sk.name + '！', 'sys');
        }
      }
    },

    /* ---------- 物品/背包 ---------- */
    addItem(id, n) {
      n = n || 1;
      const p = this.player;
      const def = D.ITEMS[id];
      if (!def) return;
      if (def.stack) {
        const ex = p.inventory.find(it => it.id === id);
        if (ex) { ex.n += n; return; }
      }
      for (let i = 0; i < n; i++) p.inventory.push({ id, n: 1 });
    },
    removeItem(id, n) {
      n = n || 1;
      const p = this.player;
      for (let i = p.inventory.length - 1; i >= 0 && n > 0; i--) {
        if (p.inventory[i].id === id) { p.inventory[i].n--; n--; if (p.inventory[i].n <= 0) p.inventory.splice(i, 1); }
      }
    },
    countItem(id) { return this.player.inventory.filter(it => it.id === id).reduce((s, it) => s + it.n, 0); },
    equipItem(id, silent) {
      const p = this.player;
      const def = D.ITEMS[id];
      if (!def || !def.slot) return;
      if (p.level < (def.level || 1)) { if (!silent) this.toast('等级不足'); return; }
      // 卸下旧装备
      const old = p.equipment[def.slot];
      if (old) this.addItem(old, 1);
      p.equipment[def.slot] = id;
      // 从背包移除一件
      const idx = p.inventory.findIndex(it => it.id === id);
      if (idx >= 0) { p.inventory[idx].n--; if (p.inventory[idx].n <= 0) p.inventory.splice(idx, 1); }
      if (!silent) { this.toast('装备了 ' + def.name); this.updateHUD(); }
    },
    unequipItem(slot) {
      const p = this.player;
      const id = p.equipment[slot];
      if (!id) return;
      delete p.equipment[slot];
      this.addItem(id, 1);
      this.toast('卸下了 ' + D.ITEMS[id].name);
      this.openPanel('equipment');
    },
    useItem(id) {
      const p = this.player;
      const def = D.ITEMS[id];
      if (!def || !def.effect) return;
      if (def.effect === 'hp') {
        if (p.hp >= this.maxHp(p)) { this.toast('生命已满'); return; }
        p.hp = Math.min(this.maxHp(p), p.hp + def.value);
        this.float('+' + def.value, p.x, p.y - 10, 'heal');
      } else if (def.effect === 'mp') {
        if (p.mp >= this.maxMp(p)) { this.toast('魔法已满'); return; }
        p.mp = Math.min(this.maxMp(p), p.mp + def.value);
      }
      this.removeItem(id, 1);
      this.updateHUD();
      this.openPanel('inventory');
    },
    pickUp() {
      const p = this.player;
      let picked = 0;
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i];
        if (dist(p, d) < 46) {
          this.addItem(d.id, 1);
          const def = D.ITEMS[d.id];
          const r = D.RARITY[def.rarity];
          this.log('获得 ' + r.name + '【' + def.name + '】', 'loot');
          if (def.rarity === 'epic' || def.rarity === 'legend') this.toast('爆出极品：' + def.name + '！');
          this.drops.splice(i, 1);
          picked++;
        }
      }
      if (!picked) this.toast('附近没有可拾取物品');
      else this.save();
    },

    /* ---------- 地图切换 ---------- */
    changeMap(id, atSpawn) {
      const m = D.MAPS[id];
      if (!m) return;
      if (m.level && this.player.level < m.level) { this.toast('需要达到 ' + m.level + ' 级才能进入'); return; }
      this.mapId = id; this.map = m;
      this.entities = [this.player];
      this.drops = []; this.effects = [];
      // 找到返回传送点位置
      let px = 6, py = 6;
      if (!atSpawn) {
        const back = m.portals && m.portals.find(pt => pt.to === this._prevMap);
        if (back) { px = back.x; py = back.y; }
      }
      this.player.x = px * TILE + 20; this.player.y = py * TILE + 20;
      this._genMap();
      this.spawnBots(); this.spawnBoss();
      this.target = null; this.moveTarget = null;
      this.log('来到了 ' + m.name, 'sys');
      this.toast(m.name);
      this.save();
    },
    _prevMap: '',
    usePortal(portal) {
      this._prevMap = this.mapId;
      this.changeMap(portal.to, false);
    },

    /* ---------- 任务 ---------- */
    getQuestState(q) {
      const p = this.player;
      const rec = p.quests[q.id];
      if (rec === 'done') return 'done';
      if (rec === 'active') {
        const prog = this.questProgress(q);
        return prog >= q.need ? 'ready' : 'active';
      }
      return p.level >= q.level ? 'available' : 'locked';
    },
    questProgress(q) {
      if (q.type === 'kill' || q.type === 'boss') return this.player.killCount[q.target] || 0;
      if (q.type === 'collect') return this.countItem(q.target);
      return 0;
    },
    acceptQuest(id) {
      const q = D.QUESTS.find(x => x.id === id);
      if (!q) return;
      this.player.quests[id] = 'active';
      this.log('接受任务：' + q.name, 'sys');
      this.toast('接受任务：' + q.name);
      this.closeDialog();
      this.openPanel('quests');
    },
    completeQuest(id) {
      const q = D.QUESTS.find(x => x.id === id);
      if (!q) return;
      this.player.quests[id] = 'done';
      // 收集任务扣除物品
      if (q.type === 'collect') this.removeItem(q.target, q.need);
      this.gainExp(q.reward.exp);
      this.player.gold += q.reward.gold;
      q.reward.items.forEach(it => this.addItem(it.id, it.n));
      this.log('任务完成：' + q.name + '！获得 ' + q.reward.exp + ' 经验、' + q.reward.gold + ' 金币', 'sys');
      this.closeDialog();
      this.toast('任务完成！');
      this.save();
      this.updateHUD();
    },

    /* ---------- NPC 对话 ---------- */
    interact() {
      const p = this.player;
      // 传送点
      for (const pt of this.portals) {
        if (dist(p, { x: pt.px, y: pt.py }) < 46) {
          if (pt.level && p.level < pt.level) { this.toast('需要 ' + pt.level + ' 级才能前往'); return; }
          this.usePortal(pt); return;
        }
      }
      // 掉落拾取
      if (this.drops.some(d => dist(p, d) < 46)) { this.pickUp(); return; }
      // NPC
      for (const npc of this.npcs) {
        if (dist(p, npc) < 52) { this.openDialog(npc); return; }
      }
    },
    openDialog(npc) {
      this.state = 'dialog';
      const box = document.getElementById('dialog-box');
      document.getElementById('dialog-npc').textContent = npc.name + '（' + npc.title + '）';
      let text = '', opts = [];
      switch (npc.id) {
        case 'elder':
          text = '年轻人，欢迎来到比奇城！这里是一切冒险的起点。做任务、打怪物、爆装备，成为传奇英雄吧！';
          opts = [{ label: '查看任务', fn: () => { this.closeDialog(); this.openPanel('quests'); } }, { label: '有什么建议？', fn: () => { document.getElementById('dialog-text').textContent = '先从杀鸡开始，积累经验和金币，再去沃玛森林挑战更强的怪物。记得常回药店补充药水！'; } }];
          break;
        case 'weaponShop':
          text = '想买武器？我这里有各式兵器。不过）——我更喜欢看你打怪爆装备！';
          opts = [
            { label: '购买金创药(50金)', fn: () => this.buy('goldPotion', 5, 50) },
            { label: '购买魔法药(60金)', fn: () => this.buy('manaPotion', 5, 60) },
            { label: '查看任务', fn: () => { this.closeDialog(); this.openPanel('quests'); } }
          ];
          break;
        case 'potionShop':
          text = '药店到了！金创药、魔法药、太阳水，应有尽有。补充好药水再出发吧。';
          opts = [
            { label: '买金创药×5 (50金)', fn: () => this.buy('goldPotion', 5, 50) },
            { label: '买魔法药×5 (60金)', fn: () => this.buy('manaPotion', 5, 60) },
            { label: '买太阳水×2 (120金)', fn: () => this.buy('sunWater', 2, 120) },
            { label: '查看任务', fn: () => { this.closeDialog(); this.openPanel('quests'); } }
          ];
          break;
        case 'smith': {
          const p = this.player;
          text = '我是铁匠，能强化你的装备（每级 +25% 属性，最高 +10），也能助你转生（需 50 级，转生后全属性 +30%）。';
          opts = [
            { label: '强化武器（' + this.upgradeCost('weapon') + '金）', fn: () => this.upgradeEquip('weapon') },
            { label: '强化衣服（' + this.upgradeCost('armor') + '金）', fn: () => this.upgradeEquip('armor') },
            { label: '转生（需 Lv.50 / ' + (20000 * (p.rebirth + 1)) + '金）', fn: () => this.doRebirth() },
            { label: '查看任务', fn: () => { this.closeDialog(); this.openPanel('quests'); } },
            { label: '看看装备', fn: () => { this.closeDialog(); this.openPanel('equipment'); } }
          ];
          break;
        }
        case 'teleporter':
          text = '我是老兵，可以送你到各个地图。选择目的地吧！';
          opts = Object.values(D.MAPS).filter(m => m.id !== this.mapId).map(m => ({
            label: '前往 ' + m.name + (m.level ? '(Lv' + m.level + ')' : ''),
            fn: () => { if (m.level && this.player.level < m.level) { this.toast('需要 ' + m.level + ' 级'); return; } this._prevMap = this.mapId; this.closeDialog(); this.changeMap(m.id, true); }
          }));
          break;
        case 'guildMaster':
          text = '欢迎来到沙巴克！这里是强者云集之地。听说赤月峡谷有个大魔头，勇士们去讨伐它吧！';
          opts = [{ label: '查看任务', fn: () => { this.closeDialog(); this.openPanel('quests'); } }];
          break;
      }
      document.getElementById('dialog-text').textContent = text;
      const oc = document.getElementById('dialog-options');
      oc.innerHTML = '';
      // 可接/可交任务
      D.QUESTS.filter(q => q.npc === npc.id).forEach(q => {
        const st = this.getQuestState(q);
        if (st === 'ready') opts.unshift({ label: '交付任务：' + q.name + ' ✓', fn: () => this.completeQuest(q.id) });
        else if (st === 'active') opts.push({ label: '进行中：' + q.name + ' (' + this.questProgress(q) + '/' + q.need + ')', fn: () => {} });
        else if (st === 'available') opts.unshift({ label: '接受任务：' + q.name, fn: () => this.acceptQuest(q.id) });
      });
      opts.forEach(o => {
        const b = document.createElement('button');
        b.textContent = o.label;
        b.onclick = o.fn;
        oc.appendChild(b);
      });
      box.style.display = 'block';
    },
    closeDialog() { document.getElementById('dialog-box').style.display = 'none'; this.state = 'playing'; },
    buy(id, n, price) {
      if (this.player.gold < price) { this.toast('金币不足'); return; }
      this.player.gold -= price;
      this.addItem(id, n);
      this.log('购买了 ' + D.ITEMS[id].name + ' ×' + n, 'sys');
      this.toast('购买成功');
      this.updateHUD();
    },
    upgradeCost(slot) {
      const p = this.player;
      const lv = (p.upgrades && p.upgrades[slot]) || 0;
      return Math.floor(500 * Math.pow(1.8, lv));
    },
    upgradeEquip(slot) {
      const p = this.player;
      const id = p.equipment[slot];
      if (!id) { this.toast('请先装备' + (slot === 'weapon' ? '武器' : '衣服')); return; }
      const lv = (p.upgrades[slot] || 0);
      if (lv >= 10) { this.toast('已达到最高强化 +10'); return; }
      const cost = this.upgradeCost(slot);
      if (p.gold < cost) { this.toast('金币不足，需要 ' + cost); return; }
      p.gold -= cost;
      p.upgrades[slot] = lv + 1;
      const rate = Math.random();
      if (rate < 0.12) {
        // 强化失败降级
        p.upgrades[slot] = Math.max(0, lv - 1);
        this.toast('强化失败！装备降为 +' + p.upgrades[slot]);
        this.log('强化失败，' + D.ITEMS[id].name + ' 降为 +' + p.upgrades[slot], 'sys');
      } else {
        this.toast('强化成功！+' + p.upgrades[slot]);
        this.log('强化成功，' + D.ITEMS[id].name + ' 强化至 +' + p.upgrades[slot], 'loot');
        this.effect('levelup', p.x, p.y, '#ffd75e');
      }
      p.hp = Math.min(p.hp, this.maxHp(p));
      this.updateHUD();
      this.save();
      this.openDialog(this.npcs.find(n => n.id === 'smith') || { id: 'smith', name: '铁匠', title: '装备强化师' });
    },
    doRebirth() {
      const p = this.player;
      const cost = 20000 * (p.rebirth + 1);
      if (p.level < 50) { this.toast('转生需要达到 50 级'); return; }
      if (p.gold < cost) { this.toast('金币不足，需要 ' + cost); return; }
      p.gold -= cost;
      p.rebirth++;
      p.level = 1; p.exp = 0;
      p.hp = this.maxHp(p); p.mp = this.maxMp(p);
      this.toast('转生成功！当前 ' + p.rebirth + ' 转');
      this.log('恭喜转生！你现在是 ' + p.rebirth + ' 转玩家，全属性大幅提升！', 'sys');
      this.effect('levelup', p.x, p.y, '#ff4d4d');
      this.save();
      this.updateHUD();
      this.closeDialog();
      this.openPanel('equipment');
    },

    /* ---------- 特效 ---------- */
    effect(type, x, y, color, opt) {
      this.effects.push(Object.assign({ type, x, y, color, t: 0, life: 0.5 }, opt || {}));
    },
    float(text, x, y, cls) {
      const el = document.createElement('div');
      el.className = 'float-num ' + (cls || 'dmg');
      el.textContent = text;
      el.style.left = (x - this.cam.x) + 'px';
      el.style.top = (y - this.cam.y) + 'px';
      document.getElementById('float-layer').appendChild(el);
      setTimeout(() => el.remove(), 950);
    },

    /* ---------- 渲染 ---------- */
    render() {
      const ctx = this.ctx;
      const W = this.canvas.width, H = this.canvas.height;
      ctx.clearRect(0, 0, W, H);
      if (this.state === 'menu' || !this.player) return;
      // 相机
      const targetCamX = this.player.x - W / 2;
      const targetCamY = this.player.y - H / 2;
      const maxX = this.map.w * TILE - W, maxY = this.map.h * TILE - H;
      this.cam.x = clamp(targetCamX, 0, Math.max(0, maxX));
      this.cam.y = clamp(targetCamY, 0, Math.max(0, maxY));
      ctx.save();
      ctx.translate(-this.cam.x, -this.cam.y);
      // 地面
      const m = this.map;
      ctx.fillStyle = m.ground;
      ctx.fillRect(0, 0, m.w * TILE, m.h * TILE);
      // 网格纹理
      ctx.strokeStyle = 'rgba(0,0,0,0.13)';
      ctx.lineWidth = 1;
      const sx = Math.floor(this.cam.x / TILE), sy = Math.floor(this.cam.y / TILE);
      const ex = sx + Math.ceil(W / TILE) + 1, ey = sy + Math.ceil(H / TILE) + 1;
      for (let y = sy; y <= ey && y < m.h; y++) {
        for (let x = sx; x <= ex && x < m.w; x++) {
          if (this.tiles[y][x] === 1) {
            ctx.fillStyle = m.wall;
            ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.strokeRect(x * TILE + 2.5, y * TILE + 2.5, TILE - 5, TILE - 5);
          } else {
            ctx.strokeRect(x * TILE, y * TILE, TILE, TILE);
          }
        }
      }
      // 传送点
      for (const pt of this.portals) this.drawPortal(ctx, pt);
      // 掉落
      for (const d of this.drops) this.drawDrop(ctx, d);
      // 实体（按y排序）
      const drawables = [...this.entities].filter(e => e.alive).sort((a, b) => a.y - b.y);
      for (const e of drawables) this.drawEntity(ctx, e);
      // 特效
      for (const fx of this.effects) this.drawEffect(ctx, fx);
      ctx.restore();
      // 屏幕边缘暗角
      const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.62);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    },

    drawPortal(ctx, pt) {
      const t = now() / 400;
      ctx.save();
      ctx.translate(pt.px, pt.py);
      ctx.strokeStyle = '#6ad0ff';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7 + Math.sin(t) * 0.2;
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(80,180,255,0.18)';
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#bfe9ff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(pt.name, 0, -18);
      ctx.restore();
    },
    drawDrop(ctx, d) {
      const def = D.ITEMS[d.id];
      const r = D.RARITY[def.rarity];
      const bob = Math.sin(now() / 300 + d.bob) * 3;
      ctx.save();
      ctx.translate(d.x, d.y + bob);
      // 光晕
      ctx.fillStyle = r.color;
      ctx.globalAlpha = 0.25 + Math.sin(now() / 250 + d.bob) * 0.1;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      // 物品块
      ctx.fillStyle = '#1a1408';
      ctx.strokeStyle = r.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-9, -9, 18, 18, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = r.color; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, 0, 0);
      ctx.restore();
    },
    drawEntity(ctx, e) {
      const bob = Math.sin(e.animT * 8) * 1.5;
      ctx.save();
      ctx.translate(e.x, e.y + bob);
      // 影子
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(0, e.size * 0.7, e.size * 0.8, e.size * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      // 魔法盾
      if (e.shieldUntil && now() < e.shieldUntil) {
        ctx.strokeStyle = 'rgba(110,180,255,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, e.size + 8, 0, Math.PI * 2); ctx.stroke();
      }
      if (e.isMonster) this.drawMonster(ctx, e);
      else if (e.isBot) this.drawHuman(ctx, e, true);
      else this.drawHuman(ctx, e, false);
      // 血条
      if (e !== this.player || e.hp < this.maxHp(e)) {
        const ratio = clamp(e.hp / (e.maxHp || this.maxHp(e)), 0, 1);
        const w = e.isBoss ? 60 : (e.size * 2);
        ctx.fillStyle = '#000'; ctx.fillRect(-w / 2, -e.size - 14, w, 5);
        ctx.fillStyle = e.isBoss ? '#ff3b3b' : (e.isBot ? '#6beb8a' : '#ff6b5a');
        ctx.fillRect(-w / 2, -e.size - 14, w * ratio, 5);
      }
      // 名字
      ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = e.isPlayer ? '#ffd75e' : (e.isBot ? '#9fd0ff' : '#e8d8b0');
      ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
      ctx.fillText(e.name || (e.def && e.def.name) || '', 0, -e.size - 18);
      ctx.shadowBlur = 0;
      ctx.restore();
    },
    drawHuman(ctx, e, isBot) {
      const s = e.size;
      // 身体（袍子）
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.7, s * 0.9);
      ctx.lineTo(-s * 0.7, s * 0.9);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      // 头
      ctx.fillStyle = '#f0c9a0';
      ctx.beginPath(); ctx.arc(0, -s * 0.7, s * 0.42, 0, Math.PI * 2); ctx.fill();
      // 职业标识
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const clsChar = e.cls === 'warrior' ? '战' : e.cls === 'mage' ? '法' : '道';
      ctx.fillText(clsChar, 0, -s * 0.7);
      // 武器
      ctx.strokeStyle = '#d8c9a0'; ctx.lineWidth = 3;
      const fx = e.facing.x, fy = e.facing.y;
      ctx.beginPath();
      ctx.moveTo(s * 0.6, 0);
      ctx.lineTo(s * 0.6 + fx * s, fy * s);
      ctx.stroke();
      if (isBot && e.guild) {
        ctx.fillStyle = '#ffb84d'; ctx.font = '9px sans-serif';
        ctx.fillText('[' + e.guild + ']', 0, s + 10);
      }
    },
    drawMonster(ctx, e) {
      const s = e.size;
      const def = e.def;
      ctx.fillStyle = e.color;
      if (e.isBoss) {
        // BOSS 大方块 + 光环
        ctx.shadowColor = e.color; ctx.shadowBlur = 20;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 3; ctx.strokeRect(-s / 2, -s / 2, s, s);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('魔', 0, 0);
      } else {
        ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
        // 眼睛
        ctx.fillStyle = def.ranged ? '#ffe45e' : '#fff';
        ctx.beginPath(); ctx.arc(-s * 0.25, -s * 0.15, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(s * 0.25, -s * 0.15, 2, 0, Math.PI * 2); ctx.fill();
        if (e.isPet) {
          ctx.strokeStyle = '#6beb8a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2); ctx.stroke();
        }
      }
    },
    drawEffect(ctx, fx) {
      const p = fx.t / fx.life;
      ctx.save();
      ctx.globalAlpha = 1 - p;
      if (fx.type === 'slash') {
        ctx.strokeStyle = fx.color; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, 14 + p * 12, -0.8, 0.8); ctx.stroke();
      } else if (fx.type === 'bolt' || fx.type === 'projectile') {
        const x = fx.x + (fx.tx - fx.x) * p, y = fx.y + (fx.ty - fx.y) * p;
        ctx.fillStyle = fx.color; ctx.shadowColor = fx.color; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        // 命中处理（弹道飞行到目标）
        if (!fx.hit && p >= 0.92) {
          fx.hit = true;
          if (fx.target && fx.target.alive && !fx.noDamage) {
            let dmg = fx.dmg || 1;
            this.damage(fx.target, dmg, 'normal', fx.caster);
            if (fx.skill === 'poison') { fx.target.poisonUntil = now() + D.SKILLS.poison.duration * 1000; fx.target.poisonTick = 1; }
          }
        }
      } else if (fx.type === 'aoe' || fx.type === 'healAll') {
        ctx.strokeStyle = fx.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, (fx.r || 60) * p, 0, Math.PI * 2); ctx.stroke();
      } else if (fx.type === 'cast') {
        ctx.strokeStyle = fx.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, 20 * (1 - p), 0, Math.PI * 2); ctx.stroke();
      } else if (fx.type === 'die') {
        ctx.fillStyle = fx.color; ctx.globalAlpha = (1 - p) * 0.6;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, 10 + p * 20, 0, Math.PI * 2); ctx.fill();
      } else if (fx.type === 'levelup') {
        ctx.strokeStyle = fx.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, 10 + p * 70, 0, Math.PI * 2); ctx.stroke();
      } else if (fx.type === 'hurt') {
        ctx.fillStyle = 'rgba(255,0,0,' + (0.4 * (1 - p)) + ')';
        ctx.fillRect(fx.x - this.canvas.width, fx.y - this.canvas.height, this.canvas.width * 2, this.canvas.height * 2);
      }
      ctx.restore();
    },

    /* ---------- HUD ---------- */
    updateHUD() {
      const p = this.player;
      if (!p) return;
      document.getElementById('hud-name').textContent = p.name + ' Lv.' + p.level;
      const mh = this.maxHp(p), mm = this.maxMp(p);
      document.getElementById('hp-fill').style.width = clamp(p.hp / mh * 100, 0, 100) + '%';
      document.getElementById('hp-text').textContent = Math.ceil(p.hp) + '/' + mh;
      document.getElementById('mp-fill').style.width = clamp(p.mp / mm * 100, 0, 100) + '%';
      document.getElementById('mp-text').textContent = Math.ceil(p.mp) + '/' + mm;
      const need = D.expNeeded(p.level);
      document.getElementById('exp-fill').style.width = clamp(p.exp / need * 100, 0, 100) + '%';
      document.getElementById('exp-text').textContent = '经验 ' + Math.floor(p.exp) + '/' + need;
      document.getElementById('hud-map').textContent = this.map.name;
      document.getElementById('hud-gold').textContent = p.gold;
      document.getElementById('inv-gold').textContent = p.gold;
    },
    updateTargetInfo() {
      const el = document.getElementById('target-info');
      const t = this.target;
      if (!t || !t.alive || (!t.isMonster && !t.isBot)) { el.style.display = 'none'; return; }
      el.style.display = 'block';
      const name = t.name || (t.def && t.def.name) || '目标';
      const ratio = clamp(t.hp / (t.maxHp || 1), 0, 1) * 100;
      el.innerHTML = '<div class="tname">' + name + ' Lv.' + (t.level || 1) + '</div><div class="tbar"><div style="width:' + ratio + '%"></div></div>';
    },
    updateMinimap() {
      const ctx = this.mctx, m = this.map;
      const W = this.mini.width, H = this.mini.height;
      ctx.fillStyle = m.ground; ctx.fillRect(0, 0, W, H);
      const sx = W / m.w, sy = H / m.h;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (this.tiles[y][x]) ctx.fillRect(x * sx, y * sy, sx + 0.5, sy + 0.5);
      // 传送点
      ctx.fillStyle = '#6ad0ff';
      this.portals.forEach(pt => ctx.fillRect(pt.x * sx - 1, pt.y * sy - 1, 3, 3));
      // 怪物
      ctx.fillStyle = '#ff6b5a';
      for (const e of this.entities) if (e.isMonster && e.alive) ctx.fillRect(e.x / TILE * sx - 1, e.y / TILE * sy - 1, 2, 2);
      // NPC
      ctx.fillStyle = '#ffd75e';
      this.npcs.forEach(n => ctx.fillRect(n.x / TILE * sx - 1, n.y / TILE * sy - 1, 3, 3));
      // 玩家
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(this.player.x / TILE * sx, this.player.y / TILE * sy, 2.5, 0, Math.PI * 2); ctx.fill();
    },
    updateCooldowns() {
      const p = this.player;
      const keys = this.quickKeys || [];
      keys.forEach((key, i) => {
        const el = document.getElementById('qcd-' + i);
        if (!el) return;
        const sk = D.SKILLS[key];
        const cd = clamp(p.atkTimer, 0, 0.8);
        if (cd > 0.05) { el.style.display = 'flex'; el.textContent = cd.toFixed(1); }
        else el.style.display = 'none';
      });
    },

    /* ---------- UI 面板 ---------- */
    openPanel(name) {
      document.getElementById('panel-overlay').classList.add('open');
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
      const panel = document.getElementById('panel-' + name);
      if (panel) panel.classList.add('open');
      if (name === 'inventory') this.renderInventory();
      if (name === 'equipment') this.renderEquipment();
      if (name === 'skills') this.renderSkills();
      if (name === 'quests') this.renderQuests();
      if (name === 'system') this.renderSystem();
    },
    closePanels() { document.getElementById('panel-overlay').classList.remove('open'); },
    renderInventory() {
      const p = this.player;
      const grid = document.getElementById('inv-grid');
      grid.innerHTML = '';
      const slots = Math.max(30, p.inventory.length + 6);
      for (let i = 0; i < slots; i++) {
        const slot = document.createElement('div'); slot.className = 'inv-slot';
        const it = p.inventory[i];
        if (it) {
          const def = D.ITEMS[it.id];
          const r = D.RARITY[def.rarity];
          const div = document.createElement('div');
          div.className = 'inv-item';
          div.style.borderColor = r.color; div.style.color = r.color;
          div.innerHTML = def.icon + (it.n > 1 ? '<span class="cnt">' + it.n + '</span>' : '');
          div.title = r.name + ' ' + def.name + '\n' + def.desc;
          div.onclick = () => {
            if (def.effect) { this.useItem(it.id); }
            else if (def.slot) { this.equipItem(it.id); this.renderInventory(); }
            else this.toast(def.name + '：' + def.desc);
          };
          slot.appendChild(div);
        }
        grid.appendChild(slot);
      }
      document.getElementById('inv-gold').textContent = p.gold;
    },
    renderEquipment() {
      const p = this.player;
      const slots = ['weapon', 'helmet', 'armor', 'necklace', 'ring', 'bracer', 'belt', 'boots'];
      const slotNames = { weapon: '武器', helmet: '头盔', armor: '衣服', necklace: '项链', ring: '戒指', bracer: '手镯', belt: '腰带', boots: '鞋子' };
      const wrap = document.getElementById('equip-slots');
      wrap.innerHTML = '';
      slots.forEach(s => {
        const div = document.createElement('div'); div.className = 'equip-slot';
        const id = p.equipment[s];
        if (id) {
          const def = D.ITEMS[id]; const r = D.RARITY[def.rarity];
          const upLv = (p.upgrades && p.upgrades[s]) || 0;
          div.innerHTML = '<div class="ei" style="color:' + r.color + '">' + def.icon + '</div>' + slotNames[s] + '<br>' + def.name + (upLv ? ' <span style="color:#6beb8a">+' + upLv + '</span>' : '');
          div.title = '点击卸下：' + def.name;
          div.onclick = () => this.unequipItem(s);
        } else {
          div.innerHTML = '<div class="ei" style="color:#555">' + slotNames[s].charAt(0) + '</div>' + slotNames[s];
        }
        wrap.appendChild(div);
      });
      const st = document.getElementById('equip-stats');
      const c = D.CLASSES[p.cls];
      st.innerHTML =
        '<div class="row"><span>职业</span><span class="val">' + c.name + '</span></div>' +
        '<div class="row"><span>等级</span><span class="val">' + p.level + '</span></div>' +
        '<div class="row"><span>生命</span><span class="val">' + Math.ceil(p.hp) + '/' + this.maxHp(p) + '</span></div>' +
        '<div class="row"><span>魔法</span><span class="val">' + Math.ceil(p.mp) + '/' + this.maxMp(p) + '</span></div>' +
        '<div class="row"><span>攻击</span><span class="val">' + Math.floor(this.attack(p)) + '</span></div>' +
        '<div class="row"><span>魔法攻击</span><span class="val">' + Math.floor(this.matk(p)) + '</span></div>' +
        '<div class="row"><span>道术</span><span class="val">' + Math.floor(this.tao(p)) + '</span></div>' +
        '<div class="row"><span>防御</span><span class="val">' + Math.floor(this.defense(p)) + '</span></div>' +
        '<div class="row"><span>魔防</span><span class="val">' + Math.floor(this.mdefense(p)) + '</span></div>' +
        '<div class="row"><span>转生</span><span class="val">' + (p.rebirth || 0) + ' 转</span></div>' +
        '<div class="row"><span>金币</span><span class="val">' + p.gold + '</span></div>';
    },
    renderSkills() {
      const p = this.player;
      const list = document.getElementById('skill-list');
      list.innerHTML = '';
      const c = D.CLASSES[p.cls];
      c.skills.forEach(key => {
        const sk = D.SKILLS[key];
        const lvl = p.skills[key] || 0;
        const learned = lvl > 0;
        const row = document.createElement('div');
        row.className = 'skill-row' + (learned ? '' : ' locked');
        row.innerHTML = '<div class="sicon">' + sk.icon + '</div><div class="sinfo"><div class="sname">' + sk.name + ' <small>' + (learned ? 'Lv.' + lvl : '需' + sk.level + '级') + '</small></div><div class="sdesc">' + sk.desc + (sk.mp ? ' [耗魔' + sk.mp + ']' : '') + '</div></div>';
        list.appendChild(row);
      });
    },
    renderQuests() {
      const list = document.getElementById('quest-list');
      list.innerHTML = '';
      D.QUESTS.forEach(q => {
        const st = this.getQuestState(q);
        const prog = this.questProgress(q);
        const card = document.createElement('div');
        card.className = 'quest-card' + (st === 'active' || st === 'ready' ? ' active' : '') + (st === 'done' ? ' done' : '');
        let statusText = '';
        if (st === 'done') statusText = '<div class="qprog">✓ 已完成</div>';
        else if (st === 'active') statusText = '<div class="qprog">进度：' + Math.min(prog, q.need) + '/' + q.need + '</div>';
        else if (st === 'ready') statusText = '<div class="qprog">✦ 可交付！前往 ' + (D.NPCS[q.npc] ? D.NPCS[q.npc].name : 'NPC') + ' 交任务</div>';
        else if (st === 'locked') statusText = '<div class="qprog">需要 ' + q.level + ' 级解锁</div>';
        else statusText = '<div class="qprog">可接取 · 找 ' + (D.NPCS[q.npc] ? D.NPCS[q.npc].name : 'NPC') + '</div>';
        card.innerHTML = '<div class="qname">' + q.name + '</div><div class="qdesc">' + q.desc + '</div>' + statusText +
          '<div class="qrew">奖励：' + q.reward.exp + '经验 · ' + q.reward.gold + '金币 · 装备物品</div>';
        list.appendChild(card);
      });
    },
    renderSystem() {
      const p = this.player;
      const mins = Math.floor(p.playTime / 60);
      document.getElementById('sys-stat').innerHTML =
        '角色：<b style="color:#f2d27a">' + p.name + '</b>（' + D.CLASSES[p.cls].name + '）<br>' +
        '等级：' + p.level + '　游戏时长：' + mins + ' 分钟<br>' +
        '击败怪物：' + Object.values(p.killCount).reduce((a, b) => a + b, 0) + ' 只<br>' +
        '所在地图：' + this.map.name;
    },

    /* ---------- 快捷栏 ---------- */
    _buildQuickBar() {
      const p = this.player;
      const c = D.CLASSES[p.cls];
      this.quickKeys = c.skills.filter(k => D.SKILLS[k].type !== 'passive');
      const bar = document.getElementById('quick-bar');
      bar.innerHTML = '';
      this.quickKeys.slice(0, 8).forEach((key, i) => {
        const sk = D.SKILLS[key];
        const div = document.createElement('div');
        div.className = 'q-skill';
        div.innerHTML = '<span class="q-key">' + (i + 1) + '</span>' + sk.icon + '<div class="q-cd" id="qcd-' + i + '" style="display:none"></div>';
        div.title = sk.name + '：' + sk.desc;
        div.onclick = () => this.castSkill(key);
        bar.appendChild(div);
      });
      // 移动端技能按钮映射
      const btn1 = document.getElementById('btn-skill1');
      const btn2 = document.getElementById('btn-skill2');
      btn1.textContent = this.quickKeys[0] ? D.SKILLS[this.quickKeys[0]].name.slice(0, 2) : '技1';
      btn2.textContent = this.quickKeys[1] ? D.SKILLS[this.quickKeys[1]].name.slice(0, 2) : '技2';
      btn1.onclick = () => this.castSkill(this.quickKeys[0]);
      btn2.onclick = () => this.castSkill(this.quickKeys[1]);
    },

    /* ---------- 输入绑定 ---------- */
    _bindGlobal() {
      window.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();
        this.keys[k] = true;
        if (k >= '1' && k <= '8' && this.quickKeys) {
          const idx = parseInt(k) - 1;
          if (this.quickKeys[idx]) this.castSkill(this.quickKeys[idx]);
        }
        if (k === ' ' || k === 'e') { e.preventDefault(); this.interact(); }
        if (k === 'q') this.pickUp();
        if (k === 'escape') { this.closeDialog(); this.closePanels(); }
      });
      window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });

      // 画布点击/触摸：移动或攻击
      const canvas = this.canvas;
      const handlePoint = (clientX, clientY, isAttack) => {
        if (this.state !== 'playing') return;
        const rect = canvas.getBoundingClientRect();
        const wx = clientX - rect.left + this.cam.x;
        const wy = clientY - rect.top + this.cam.y;
        // 找点击的实体
        let clicked = null;
        for (const e of this.entities) {
          if (!e.alive) continue;
          if (dist({ x: wx, y: wy }, e) < e.size + 12) { clicked = e; break; }
        }
        if (clicked && (clicked.isMonster || clicked.isBot)) { this.target = clicked; this.autoAttack = true; return; }
        if (clicked && clicked.isPlayer) return;
        // NPC
        for (const n of this.npcs) {
          if (dist({ x: wx, y: wy }, n) < 28) {
            if (dist(this.player, n) < 60) this.openDialog(n);
            else this.moveTarget = { x: n.x, y: n.y };
            return;
          }
        }
        // 传送点
        for (const pt of this.portals) {
          if (dist({ x: wx, y: wy }, { x: pt.px, y: pt.py }) < 28) {
            if (dist(this.player, { x: pt.px, y: pt.py }) < 60) this.interact();
            else this.moveTarget = { x: pt.px, y: pt.py };
            return;
          }
        }
        this.moveTarget = { x: wx, y: wy };
      };
      canvas.addEventListener('click', e => handlePoint(e.clientX, e.clientY));
      // 摇杆
      const joy = document.getElementById('joystick');
      const knob = document.getElementById('joy-knob');
      const joyMove = (cx, cy) => {
        const r = joy.getBoundingClientRect();
        let dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy), max = 36;
        if (d > max) { dx = dx / d * max; dy = dy / d * max; }
        knob.style.left = (32 + dx) + 'px'; knob.style.top = (32 + dy) + 'px';
        this.joy.x = dx / max; this.joy.y = dy / max; this.joy.active = true;
      };
      const joyEnd = () => { this.joy.active = false; this.joy.x = 0; this.joy.y = 0; knob.style.left = '32px'; knob.style.top = '32px'; };
      joy.addEventListener('touchstart', e => { e.preventDefault(); this._bindGlobal._joyId = e.touches[0].identifier; joyMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
      joy.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.touches) if (t.identifier === this._bindGlobal._joyId) joyMove(t.clientX, t.clientY); }, { passive: false });
      joy.addEventListener('touchend', e => { e.preventDefault(); joyEnd(); }, { passive: false });
      // 攻击按钮（按住连击）
      const atkBtn = document.getElementById('btn-attack');
      atkBtn.addEventListener('touchstart', e => { e.preventDefault(); this.keys['attack'] = true; }, { passive: false });
      atkBtn.addEventListener('touchend', e => { e.preventDefault(); this.keys['attack'] = false; }, { passive: false });
      atkBtn.addEventListener('mousedown', () => this.keys['attack'] = true);
      window.addEventListener('mouseup', () => this.keys['attack'] = false);
      document.getElementById('btn-pick').onclick = () => this.pickUp();
    },
    _resize() {
      const c = this.canvas;
      c.width = window.innerWidth; c.height = window.innerHeight;
    },

    /* ---------- 日志/提示 ---------- */
    log(text, cls) {
      const box = document.getElementById('chat-lines');
      const line = document.createElement('div');
      line.className = 'chat-line ' + (cls || '');
      line.textContent = text;
      box.appendChild(line);
      while (box.children.length > 40) box.removeChild(box.firstChild);
      box.parentElement.scrollTop = box.parentElement.scrollHeight;
    },
    toast(text) {
      const el = document.getElementById('toast');
      el.textContent = text;
      el.classList.remove('show');
      void el.offsetWidth;
      el.classList.add('show');
    }
  };

  global.Game = Game;
})(window);
