#!/usr/bin/env python3.11
# -*- coding: utf-8 -*-
"""
经典《传奇》风格像素素材生成器
所有精灵在小型逻辑画布上手绘，再用 NEAREST 放大，得到清晰的复古像素画。
输出：
  assets/sprites/hero_<cls>_<dir>_<frame>.png   三职业 4方向 2帧
  assets/sprites/mon_<id>.png                   怪物
  assets/sprites/npc_<id>.png                   NPC
  assets/tiles/<name>.png                       地面/墙砖
  assets/obj/<name>.png                         场景物件（树/房/石/火把...）
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..', 'www', 'assets')
SPR = os.path.join(ROOT, 'sprites')
TIL = os.path.join(ROOT, 'tiles')
OBJ = os.path.join(ROOT, 'obj')
for d in (SPR, TIL, OBJ):
    os.makedirs(d, exist_ok=True)

SCALE = 2  # 每个逻辑像素 -> 2 显示像素（角色约52x68px，匹配40px地砖的经典比例）


class Px:
    def __init__(self, w, h, scale=SCALE):
        self.w, self.h, self.s = w, h, scale
        self.im = Image.new('RGBA', (w * scale, h * scale), (0, 0, 0, 0))
        self.dr = ImageDraw.Draw(self.im)

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            s = self.s
            self.dr.rectangle([x * s, y * s, x * s + s - 1, y * s + s - 1], fill=c)

    def rect(self, x, y, w, h, c):
        for j in range(y, y + h):
            for i in range(x, x + w):
                self.px(i, j, c)

    def hline(self, x0, x1, y, c):
        self.rect(x0, y, x1 - x0 + 1, 1, c)

    def vline(self, x, y0, y1, c):
        self.rect(x, y0, 1, y1 - y0 + 1, c)

    def poly(self, pts, c):
        s = self.s
        p = [(x * s + s // 2, y * s + s // 2) for (x, y) in pts]
        self.dr.polygon(p, fill=c)

    def ellipse(self, x0, y0, x1, y1, c):
        s = self.s
        self.dr.ellipse([x0 * s, y0 * s, x1 * s + s - 1, y1 * s + s - 1], fill=c)

    def outline_rect(self, x, y, w, h, oc, fc):
        self.rect(x, y, w, h, oc)
        self.rect(x + 1, y + 1, w - 2, h - 2, fc)

    def save(self, path):
        self.im.save(path)


# ============ 调色板 ============
OUT = '#141018'          # 描边
SKIN = '#e8b58c'; SKIN_D = '#c68c60'; SKIN_L = '#f6d3a8'
EYE = '#1a1410'
STEEL = '#c9d2dc'; STEEL_D = '#8792a0'; STEEL_L = '#eef3f8'
GOLD = '#e6bb48'; GOLD_D = '#a67c22'; GOLD_L = '#ffe08a'
BROWN = '#7a4b28'; BROWN_D = '#503018'; BROWN_L = '#a06a3c'
LEATHER = '#5a3a22'

CLS_PAL = {
    'warrior': dict(
        body='#b5322a', body_d='#7a1c18', body_l='#e0574a',
        trim=GOLD, trim_d=GOLD_D, helm=STEEL, helm_d=STEEL_D, helm_l=STEEL_L,
        pants='#3a3f4a', pants_d='#242832', boot=LEATHER, cape='#8f2018'),
    'mage': dict(
        body='#3f6fc4', body_d='#28468a', body_l='#6f9ae8',
        trim=GOLD, trim_d=GOLD_D, helm='#2c4f9e', helm_d='#1b3370', helm_l='#5a83d2',
        pants='#dfe6ef', pants_d='#b3bdc9', boot='#4a5a72', cape='#2f56ad'),
    'taoist': dict(
        body='#4f9a6a', body_d='#2f6a48', body_l='#79c791',
        trim=GOLD, trim_d=GOLD_D, helm='#3c7d55', helm_d='#245239', helm_l='#6bb488',
        pants='#c9c2a0', pants_d='#9a9476', boot='#6a5330', cape='#3c8058'),
}


# ============ 人形角色 ============
def draw_hero(cls, direction, frame, scale=SCALE):
    """逻辑画布 26x34，脚在底部(y~31)，头在顶部。direction: down/up/left/right"""
    p = CLS_PAL[cls]
    art = Px(26, 34, scale)
    cx = 13
    # 侧身用更窄的身体
    side = direction in ('left', 'right')
    front = direction == 'down'
    back = direction == 'up'

    # 腿 + 靴（行走帧交替）
    step = 1 if frame == 1 else 0
    ly = 25
    art.rect(cx - 6, ly, 5, 6, OUT)
    art.rect(cx + 1, ly, 5, 6, OUT)
    art.rect(cx - 5, ly, 3, 6, p['pants'])
    art.rect(cx + 2, ly, 3, 6, p['pants'])
    art.rect(cx - 5, ly + 1, 1, 5, p['pants_d'])
    art.rect(cx + 2, ly + 1, 1, 5, p['pants_d'])
    # 靴子
    bo = step  # 前迈的脚
    art.rect(cx - 7, ly + 5 - bo, 6, 3, OUT)
    art.rect(cx + 1, ly + 5 + bo, 6, 3, OUT)
    art.rect(cx - 6, ly + 5 - bo, 4, 2, p['boot'])
    art.rect(cx + 2, ly + 5 + bo, 4, 2, p['boot'])

    # 躯干（袍/甲）
    art.poly([(cx - 8, 12), (cx + 8, 12), (cx + 7, 26), (cx - 7, 26)], OUT)
    art.poly([(cx - 7, 13), (cx + 7, 13), (cx + 6, 25), (cx - 6, 25)], p['body'])
    # 甲片阴影/高光
    art.rect(cx + 4, 13, 2, 12, p['body_d'])
    art.rect(cx - 6, 13, 2, 12, p['body_l'])
    # 胸甲分块 + 金边
    art.hline(cx - 6, cx + 5, 16, p['trim_d'])
    art.hline(cx - 6, cx + 5, 17, p['trim'])
    art.rect(cx - 1, 13, 2, 12, p['trim'])
    # 腰带
    art.rect(cx - 7, 22, 14, 3, OUT)
    art.rect(cx - 6, 22, 12, 2, BROWN)
    art.rect(cx - 1, 22, 2, 2, GOLD)

    # 肩甲
    art.ellipse(cx - 11, 12, cx - 5, 17, OUT)
    art.ellipse(cx + 5, 12, cx + 11, 17, OUT)
    art.ellipse(cx - 10, 13, cx - 6, 16, p['helm'])
    art.ellipse(cx + 6, 13, cx + 10, 16, p['helm'])
    art.ellipse(cx - 10, 13, cx - 8, 15, p['helm_l'])
    art.ellipse(cx + 6, 13, cx + 8, 15, p['helm_l'])

    # 手臂
    arm_y = 18
    art.rect(cx - 9, arm_y, 3, 7, OUT); art.rect(cx - 8, arm_y, 2, 6, p['body'])
    art.rect(cx + 6, arm_y, 3, 7, OUT); art.rect(cx + 7, arm_y, 2, 6, p['body'])
    # 护腕
    art.rect(cx - 9, arm_y + 4, 3, 2, p['trim_d'])
    art.rect(cx + 6, arm_y + 4, 3, 2, p['trim_d'])

    # 颈部
    art.rect(cx - 2, 10, 4, 3, SKIN_D)
    # 头
    art.rect(cx - 5, 3, 10, 9, OUT)
    art.rect(cx - 4, 4, 8, 7, SKIN)
    art.rect(cx - 4, 4, 8, 2, SKIN_L)
    art.rect(cx + 2, 4, 2, 7, SKIN_D)
    # 眼睛（正面/侧面）
    if front:
        art.rect(cx - 3, 7, 2, 1, OUT); art.rect(cx + 2, 7, 2, 1, OUT)
        art.px(cx - 2, 7, '#ffffff'); art.px(cx + 2, 7, '#ffffff')
    elif side:
        ex = cx + 2 if direction == 'right' else cx - 4
        art.rect(ex, 7, 2, 1, OUT)
    # 嘴
    if front:
        art.rect(cx - 1, 10, 2, 1, SKIN_D)

    # 头盔/头发
    if cls == 'warrior':
        #  Celtic 式头盔
        art.rect(cx - 6, 1, 12, 5, OUT)
        art.rect(cx - 5, 2, 10, 3, p['helm'])
        art.rect(cx - 5, 2, 10, 1, p['helm_l'])
        art.rect(cx - 5, 4, 10, 1, p['helm_d'])
        art.hline(cx - 6, cx + 5, 5, p['trim'])
        # 盔顶红缨
        art.rect(cx - 1, -1, 2, 3, '#c9302a')
        if front:
            art.rect(cx - 5, 5, 2, 3, p['helm'])
            art.rect(cx + 3, 5, 2, 3, p['helm'])
    elif cls == 'mage':
        # 尖顶魔法帽
        art.poly([(cx - 7, 4), (cx + 7, 4), (cx + 3, -2), (cx - 3, -2)], OUT)
        art.poly([(cx - 6, 4), (cx + 6, 4), (cx + 2, -1), (cx - 2, -1)], p['helm'])
        art.hline(cx - 7, cx + 6, 4, p['trim_d'])
        art.hline(cx - 6, cx + 5, 3, p['trim'])
        art.rect(cx, -1, 1, 1, GOLD_L)
        if back:
            art.rect(cx - 4, 5, 8, 4, p['body_d'])
    else:  # taoist
        # 道髻 + 发带
        art.rect(cx - 5, 1, 10, 4, OUT)
        art.rect(cx - 4, 2, 8, 2, '#2c2620')
        art.rect(cx - 2, -1, 4, 3, '#2c2620')
        art.hline(cx - 5, cx + 4, 4, p['trim'])
        art.rect(cx - 1, 0, 2, 1, GOLD_L)

    # 武器（右手侧）
    wx = cx + 9
    if cls == 'warrior':
        # 大刀：斜握
        art.rect(wx, 6, 2, 12, BROWN)           # 刀柄
        art.rect(wx, 6, 2, 2, GOLD_D)
        art.poly([(wx - 1, 3), (wx + 5, -3), (wx + 6, 1), (wx + 2, 8)], OUT)
        art.poly([(wx, 3), (wx + 5, -2), (wx + 5, 1), (wx + 1, 7)], STEEL)
        art.poly([(wx, 3), (wx + 2, 1), (wx + 2, 6), (wx + 1, 7)], STEEL_L)
    elif cls == 'mage':
        # 法杖
        art.rect(wx, 4, 2, 20, BROWN)
        art.rect(wx, 4, 1, 20, BROWN_L)
        art.ellipse(wx - 2, 1, wx + 3, 6, OUT)
        art.ellipse(wx - 1, 2, wx + 2, 5, '#5fc8ff')
        art.px(wx, 2, '#ffffff')
    else:
        # 长剑
        art.rect(wx, 12, 2, 6, BROWN)
        art.hline(wx - 2, wx + 3, 12, GOLD)
        art.rect(wx, 1, 2, 11, OUT)
        art.rect(wx, 2, 1, 10, STEEL)
        art.rect(wx, 2, 1, 5, STEEL_L)

    # 侧身时武器放中间偏前
    if side:
        # 已绘制在右侧，左右由外部镜像处理
        pass
    return art.im


# ============ 怪物 ============
def mon_skeleton():
    a = Px(24, 30)
    cx = 12
    # 骨架：白骨色
    bone = '#e6e2d2'; bone_d = '#a9a494'
    # 腿
    a.rect(cx - 4, 20, 3, 8, OUT); a.rect(cx + 1, 20, 3, 8, OUT)
    a.rect(cx - 3, 20, 2, 7, bone); a.rect(cx + 2, 20, 2, 7, bone)
    # 骨盆/肋
    a.rect(cx - 4, 12, 8, 9, OUT); a.rect(cx - 3, 13, 6, 7, bone)
    for yy in (14, 16, 18):
        a.hline(cx - 3, cx + 2, yy, bone_d)
    a.vline(cx, 13, 19, bone)
    # 手臂
    a.rect(cx - 7, 12, 3, 8, OUT); a.rect(cx - 6, 13, 2, 6, bone)
    a.rect(cx + 4, 12, 3, 8, OUT); a.rect(cx + 4, 13, 2, 6, bone)
    # 头骨
    a.rect(cx - 4, 3, 8, 8, OUT); a.rect(cx - 3, 4, 6, 6, bone)
    a.rect(cx - 2, 6, 2, 2, OUT); a.rect(cx + 1, 6, 2, 2, OUT)
    a.px(cx - 1, 6, '#c93a2a'); a.px(cx + 2, 6, '#c93a2a')
    a.rect(cx - 1, 9, 2, 1, OUT)
    # 拿一把破剑
    a.rect(cx + 7, 4, 2, 14, STEEL_D)
    return a.im


def mon_chicken():
    a = Px(22, 24)
    cx = 11
    body = '#e8d24a'; body_d = '#c0a52c'; comb = '#c9302a'
    a.ellipse(cx - 6, 8, cx + 6, 20, OUT)
    a.ellipse(cx - 5, 9, cx + 5, 19, body)
    a.ellipse(cx - 4, 10, cx + 1, 14, '#f6e784')
    # 尾巴
    a.poly([(cx + 4, 12), (cx + 9, 6), (cx + 10, 13)], OUT)
    a.poly([(cx + 5, 12), (cx + 9, 8), (cx + 9, 13), ], body_d)
    # 头
    a.ellipse(cx - 3, 4, cx + 4, 12, OUT)
    a.ellipse(cx - 2, 5, cx + 3, 11, body)
    # 鸡冠
    a.rect(cx - 2, 2, 2, 3, comb); a.rect(cx + 1, 3, 2, 2, comb)
    # 喙
    a.poly([(cx - 4, 8), (cx - 8, 9), (cx - 4, 10)], '#e8922a')
    # 眼
    a.px(cx - 1, 7, OUT); a.px(cx, 7, '#ffffff')
    # 脚
    a.rect(cx - 2, 20, 1, 3, '#e8922a'); a.rect(cx + 1, 20, 1, 3, '#e8922a')
    return a.im


def mon_deer():
    a = Px(28, 30)
    cx = 13
    body = '#a9763f'; body_d = '#7c5530'; tan = '#d8b27c'
    # 腿
    for dx in (-5, -2, 2, 5):
        a.rect(cx + dx, 20, 2, 9, OUT); a.rect(cx + dx, 20, 1, 8, body_d)
    # 身体
    a.ellipse(cx - 8, 10, cx + 8, 22, OUT)
    a.ellipse(cx - 7, 11, cx + 7, 21, body)
    a.ellipse(cx - 5, 12, cx + 3, 17, tan)
    # 头颈
    a.poly([(cx - 9, 14), (cx - 12, 5), (cx - 6, 5), (cx - 5, 14)], OUT)
    a.poly([(cx - 8, 14), (cx - 11, 6), (cx - 7, 6), (cx - 6, 14)], body)
    # 鹿角
    a.line if False else None
    for (x0, y0, x1, y1) in [(-11,6,-14,1),(-11,6,-9,1),(-9,5,-6,1),(-9,5,-12,2)]:
        # 用 pixel line
        steps = 8
        for i in range(steps + 1):
            xx = x0 + (x1 - x0) * i / steps; yy = y0 + (y1 - y0) * i / steps
            a.px(cx + int(round(xx)), int(round(yy)), BROWN)
    # 眼/鼻
    a.px(cx - 10, 8, OUT)
    a.px(cx - 12, 10, '#2a1c14')
    return a.im


def mon_orc():
    a = Px(26, 32)
    cx = 13
    skin = '#7f9a4a'; skin_d = '#586e30'; skin_l = '#a6c063'
    # 腿
    a.rect(cx - 5, 24, 4, 7, OUT); a.rect(cx + 1, 24, 4, 7, OUT)
    a.rect(cx - 4, 24, 3, 6, skin_d); a.rect(cx + 2, 24, 3, 6, skin_d)
    # 兽皮裙
    a.rect(cx - 7, 20, 14, 6, OUT); a.rect(cx - 6, 20, 12, 5, BROWN)
    for i in range(-6, 6, 3):
        a.rect(cx + i, 23, 2, 3, BROWN_D)
    # 身体
    a.ellipse(cx - 8, 11, cx + 8, 22, OUT); a.ellipse(cx - 7, 12, cx + 7, 21, skin)
    a.ellipse(cx - 5, 13, cx, 18, skin_l)
    # 手臂
    a.rect(cx - 11, 13, 4, 9, OUT); a.rect(cx - 10, 14, 3, 7, skin)
    a.rect(cx + 7, 13, 4, 9, OUT); a.rect(cx + 7, 14, 3, 7, skin)
    # 头
    a.rect(cx - 6, 3, 12, 10, OUT); a.rect(cx - 5, 4, 10, 8, skin)
    a.rect(cx - 4, 4, 8, 3, skin_l)
    # 尖耳
    a.poly([(cx - 5, 6), (cx - 9, 4), (cx - 5, 9)], skin_d)
    a.poly([(cx + 5, 6), (cx + 9, 4), (cx + 5, 9)], skin_d)
    # 眼（凶）
    a.rect(cx - 4, 7, 3, 2, OUT); a.rect(cx + 2, 7, 3, 2, OUT)
    a.px(cx - 3, 7, '#ffd24a'); a.px(cx + 3, 7, '#ffd24a')
    # 獠牙
    a.rect(cx - 2, 10, 1, 2, '#ffffff'); a.rect(cx + 2, 10, 1, 2, '#ffffff')
    # 棒子
    a.rect(cx + 11, 3, 3, 18, BROWN)
    a.rect(cx + 10, 2, 5, 5, BROWN_D)
    return a.im


def mon_zombie():
    a = Px(26, 32)
    cx = 13
    skin = '#8fa38a'; skin_d = '#63755f'; cloth = '#4a6a7a'; cloth_d = '#334a56'
    # 腿
    a.rect(cx - 5, 23, 4, 8, OUT); a.rect(cx + 1, 23, 4, 8, OUT)
    a.rect(cx - 4, 23, 3, 7, cloth_d); a.rect(cx + 2, 23, 3, 7, cloth_d)
    # 破烂衣服
    a.rect(cx - 8, 12, 16, 12, OUT); a.rect(cx - 7, 13, 14, 10, cloth)
    a.rect(cx + 3, 13, 3, 9, cloth_d)
    a.hline(cx - 7, cx + 6, 18, cloth_d)
    # 伸出的手臂（前）
    a.rect(cx - 12, 15, 5, 3, OUT); a.rect(cx - 11, 16, 4, 2, skin)
    a.rect(cx + 7, 15, 5, 3, OUT); a.rect(cx + 7, 16, 4, 2, skin)
    # 头
    a.rect(cx - 5, 4, 10, 9, OUT); a.rect(cx - 4, 5, 8, 7, skin)
    a.rect(cx - 4, 5, 8, 2, skin_d)
    # 空洞眼
    a.rect(cx - 3, 7, 2, 2, OUT); a.rect(cx + 2, 7, 2, 2, OUT)
    a.px(cx - 2, 7, '#c93a2a'); a.px(cx + 3, 7, '#c93a2a')
    a.rect(cx - 1, 10, 3, 1, OUT)
    return a.im


def mon_scarecrow():
    a = Px(26, 32)
    cx = 13
    straw = '#c9a24a'; straw_l = '#e6c46a'; cloth = '#8a5a3a'
    # 木杆
    a.rect(cx - 1, 10, 2, 20, BROWN_D)
    # 横杆手臂
    a.rect(cx - 10, 14, 20, 2, BROWN)
    # 稻草手
    a.rect(cx - 12, 13, 3, 4, straw); a.rect(cx + 9, 13, 3, 4, straw)
    # 破衣服
    a.poly([(cx - 7, 12), (cx + 7, 12), (cx + 6, 24), (cx - 6, 24)], OUT)
    a.poly([(cx - 6, 13), (cx + 6, 13), (cx + 5, 23), (cx - 5, 23)], cloth)
    for i in range(-5, 6, 3):
        a.rect(cx + i, 22, 1, 3, straw_l)
    # 南瓜头/麻袋头
    a.rect(cx - 5, 4, 10, 9, OUT); a.rect(cx - 4, 5, 8, 7, straw)
    a.poly([(cx - 6, 3), (cx + 6, 3), (cx + 3, 1), (cx - 3, 1)], '#7a5a2a')  # 草帽
    a.hline(cx - 6, cx + 5, 3, BROWN_D)
    # 眼（十字缝）
    a.rect(cx - 3, 7, 2, 2, OUT); a.rect(cx + 2, 7, 2, 2, OUT)
    a.px(cx - 2, 8, '#c9302a'); a.px(cx + 3, 8, '#c9302a')
    a.hline(cx - 2, cx + 2, 10, OUT)
    return a.im


def mon_centipede():
    a = Px(34, 20)
    seg_c = '#b5452f'; seg_d = '#8a2f1f'; seg_l = '#d8684a'
    # 分节身体（横向S形）
    segs = [(3,12),(7,10),(11,11),(15,8),(19,9),(23,7),(27,9)]
    for k,(x,y) in enumerate(segs):
        a.ellipse(x-3, y-3, x+3, y+3, OUT)
        a.ellipse(x-2, y-2, x+2, y+2, seg_c if k%2==0 else seg_d)
        a.px(x-1, y-1, seg_l)
        # 足
        a.line if False else None
        a.rect(x-1, y+3, 1, 3, seg_d)
        a.rect(x, y+3, 1, 2, seg_c)
    # 头
    a.ellipse(26, 5, 33, 12, OUT); a.ellipse(27, 6, 32, 11, seg_l)
    a.px(29, 7, OUT); a.px(31, 7, OUT)
    # 触角
    for i in range(6):
        a.px(31+i//2, 5-i//2, seg_c)
        a.px(30+i//2, 4-i//2, seg_d)
    return a.im


def mon_zumaGuard():
    a = Px(28, 34)
    cx = 14
    stone = '#8a7fa8'; stone_d = '#5f5680'; stone_l = '#b0a7c8'; gold = GOLD
    # 腿
    a.rect(cx - 6, 25, 5, 8, OUT); a.rect(cx + 1, 25, 5, 8, OUT)
    a.rect(cx - 5, 25, 4, 7, stone_d); a.rect(cx + 2, 25, 4, 7, stone_d)
    # 石甲身体
    a.poly([(cx - 9, 12), (cx + 9, 12), (cx + 8, 26), (cx - 8, 26)], OUT)
    a.poly([(cx - 8, 13), (cx + 8, 13), (cx + 7, 25), (cx - 7, 25)], stone)
    a.rect(cx + 4, 13, 3, 12, stone_d); a.hline(cx - 7, cx + 6, 18, stone_d)
    a.hline(cx - 7, cx + 6, 19, gold)
    # 肩
    a.ellipse(cx - 12, 12, cx - 6, 18, OUT); a.ellipse(cx + 6, 12, cx + 12, 18, OUT)
    a.ellipse(cx - 11, 13, cx - 7, 17, stone_l); a.ellipse(cx + 7, 13, cx + 11, 17, stone_l)
    # 头（石面具）
    a.rect(cx - 6, 3, 12, 10, OUT); a.rect(cx - 5, 4, 10, 8, stone)
    a.rect(cx - 4, 4, 8, 3, stone_l)
    # 发光眼
    a.rect(cx - 4, 7, 3, 2, OUT); a.rect(cx + 2, 7, 3, 2, OUT)
    a.px(cx - 3, 7, '#ff5a3a'); a.px(cx + 3, 7, '#ff5a3a')
    # 头饰
    a.rect(cx - 6, 2, 12, 2, gold); a.rect(cx - 1, 0, 2, 3, gold)
    # 斧
    a.rect(cx + 12, 6, 2, 20, BROWN)
    a.poly([(cx + 11, 4), (cx + 17, 6), (cx + 17, 11), (cx + 11, 12)], OUT)
    a.poly([(cx + 12, 5), (cx + 16, 7), (cx + 16, 10), (cx + 12, 11)], STEEL)
    return a.im


def mon_zumaArcher():
    a = Px(26, 32)
    cx = 13
    robe = '#9e90b8'; robe_d = '#6f6390'; robe_l = '#c0b4d8'
    # 袍
    a.poly([(cx - 7, 12), (cx + 7, 12), (cx + 8, 28), (cx - 8, 28)], OUT)
    a.poly([(cx - 6, 13), (cx + 6, 13), (cx + 7, 27), (cx - 7, 27)], robe)
    a.rect(cx + 3, 13, 3, 14, robe_d)
    a.hline(cx - 6, cx + 6, 20, robe_d)
    # 兜帽
    a.poly([(cx - 6, 9), (cx + 6, 9), (cx + 4, 2), (cx - 4, 2)], OUT)
    a.poly([(cx - 5, 9), (cx + 5, 9), (cx + 3, 3), (cx - 3, 3)], robe_d)
    a.rect(cx - 3, 6, 6, 4, '#1a1410')  # 阴影脸
    a.px(cx - 1, 7, '#ffd24a'); a.px(cx + 2, 7, '#ffd24a')
    # 弓
    for i in range(16):
        yy = 4 + i
        xx = cx + 10 - int(3 * (1 - abs(i-8)/8))
        a.px(xx, yy, BROWN)
    a.vline(cx + 10, 4, 19, '#d8d0b8')
    return a.im


def mon_whitePig():
    a = Px(30, 26)
    cx = 14
    body = '#e0d8c0'; body_d = '#b3a98a'; body_l = '#f6f0dc'
    # 腿
    for dx in (-7, -3, 3, 7):
        a.rect(cx + dx, 18, 3, 7, OUT); a.rect(cx + dx, 18, 2, 6, body_d)
    # 身体
    a.ellipse(cx - 10, 7, cx + 10, 20, OUT)
    a.ellipse(cx - 9, 8, cx + 9, 19, body)
    a.ellipse(cx - 6, 9, cx + 2, 13, body_l)
    # 头
    a.ellipse(cx + 4, 8, cx + 13, 18, OUT)
    a.ellipse(cx + 5, 9, cx + 12, 17, body)
    # 猪鼻
    a.ellipse(cx + 9, 12, cx + 13, 16, '#d89a9a')
    a.px(cx + 10, 13, OUT); a.px(cx + 12, 13, OUT)
    # 眼
    a.px(cx + 7, 11, OUT)
    # 獠牙
    a.poly([(cx + 10, 15), (cx + 13, 17), (cx + 10, 17)], '#ffffff')
    # 耳
    a.poly([(cx + 5, 9), (cx + 4, 4), (cx + 8, 8)], body_d)
    return a.im


def mon_redMoon():
    a = Px(28, 34)
    cx = 14
    body = '#c23b3b'; body_d = '#8a2020'; body_l = '#e8624a'
    # 腿
    a.rect(cx - 6, 24, 5, 9, OUT); a.rect(cx + 2, 24, 5, 9, OUT)
    a.rect(cx - 5, 24, 4, 8, body_d); a.rect(cx + 3, 24, 4, 8, body_d)
    # 甲
    a.poly([(cx - 9, 12), (cx + 9, 12), (cx + 8, 26), (cx - 8, 26)], OUT)
    a.poly([(cx - 8, 13), (cx + 8, 13), (cx + 7, 25), (cx - 7, 25)], body)
    a.rect(cx + 4, 13, 3, 12, body_d); a.hline(cx - 7, cx + 6, 19, '#2a1410')
    # 肩刺
    a.poly([(cx - 11, 14), (cx - 13, 8), (cx - 7, 13)], body_l)
    a.poly([(cx + 11, 14), (cx + 13, 8), (cx + 7, 13)], body_l)
    # 头 + 角
    a.rect(cx - 6, 4, 12, 9, OUT); a.rect(cx - 5, 5, 10, 7, body)
    a.poly([(cx - 5, 5), (cx - 8, 0), (cx - 3, 4)], '#2a1410')
    a.poly([(cx + 5, 5), (cx + 8, 0), (cx + 3, 4)], '#2a1410')
    a.rect(cx - 4, 7, 3, 2, OUT); a.rect(cx + 2, 7, 3, 2, OUT)
    a.px(cx - 3, 7, '#ffe24a'); a.px(cx + 3, 7, '#ffe24a')
    # 巨斧
    a.rect(cx + 11, 4, 2, 22, '#3a2418')
    a.poly([(cx + 9, 3), (cx + 17, 5), (cx + 17, 13), (cx + 9, 14)], OUT)
    a.poly([(cx + 10, 4), (cx + 16, 6), (cx + 16, 12), (cx + 10, 13)], STEEL_D)
    return a.im


def mon_bloodZombie():
    im = mon_zombie()
    # 染色为暗红
    im = im.copy()
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, al = px[x, y]
            if al and g > r * 0.8:
                px[x, y] = (int(min(255, r * 1.2)), int(g * 0.5), int(b * 0.55), al)
    return im


def mon_chiyueBoss():
    a = Px(48, 52)
    cx = 24
    body = '#d62828'; body_d = '#8a1010'; body_l = '#ff5a3a'
    # 腿
    a.rect(cx - 12, 38, 9, 13, OUT); a.rect(cx + 4, 38, 9, 13, OUT)
    a.rect(cx - 11, 38, 7, 12, body_d); a.rect(cx + 5, 38, 7, 12, body_d)
    # 巨大身躯
    a.poly([(cx - 16, 18), (cx + 16, 18), (cx + 13, 40), (cx - 13, 40)], OUT)
    a.poly([(cx - 15, 19), (cx + 15, 19), (cx + 12, 39), (cx - 12, 39)], body)
    a.rect(cx + 8, 19, 6, 20, body_d); a.hline(cx - 14, cx + 14, 30, '#2a0a0a')
    # 胸核（发光）
    a.ellipse(cx - 4, 24, cx + 4, 33, OUT)
    a.ellipse(cx - 3, 25, cx + 3, 32, '#ffde4a')
    a.ellipse(cx - 1, 26, cx + 2, 30, '#ffffff')
    # 肩甲 + 尖刺
    a.ellipse(cx - 22, 18, cx - 12, 28, OUT); a.ellipse(cx + 12, 18, cx + 22, 28, OUT)
    a.ellipse(cx - 21, 19, cx - 13, 27, body_l); a.ellipse(cx + 13, 19, cx + 21, 27, body_l)
    for bx in (cx - 20, cx - 16, cx + 16, cx + 20):
        a.poly([(bx - 2, 19), (bx, 10), (bx + 2, 19)], body_d)
    # 手臂 + 爪
    a.rect(cx - 24, 24, 6, 14, OUT); a.rect(cx - 23, 25, 4, 12, body)
    a.rect(cx + 18, 24, 6, 14, OUT); a.rect(cx + 19, 25, 4, 12, body)
    # 头
    a.rect(cx - 9, 5, 18, 14, OUT); a.rect(cx - 8, 6, 16, 12, body)
    a.rect(cx - 7, 6, 14, 4, body_l)
    # 双巨角
    a.poly([(cx - 8, 7), (cx - 16, -3), (cx - 4, 5)], '#2a0a0a')
    a.poly([(cx + 8, 7), (cx + 16, -3), (cx + 4, 5)], '#2a0a0a')
    # 发光眼
    a.rect(cx - 7, 10, 5, 4, OUT); a.rect(cx + 3, 10, 5, 4, OUT)
    a.rect(cx - 6, 11, 3, 2, '#ffe24a'); a.rect(cx + 4, 11, 3, 2, '#ffe24a')
    a.rect(cx - 2, 16, 5, 2, '#2a0a0a')
    # 獠牙
    a.rect(cx - 5, 18, 2, 3, '#ffffff'); a.rect(cx + 4, 18, 2, 3, '#ffffff')
    return a.im


MONSTER_FN = {
    'skeleton': mon_skeleton,
    'chicken': mon_chicken,
    'deer': mon_deer,
    'orc': mon_orc,
    'scarecrow': mon_scarecrow,
    'centipede': mon_centipede,
    'zombie': mon_zombie,
    'zumaGuard': mon_zumaGuard,
    'zumaArcher': mon_zumaArcher,
    'whitePig': mon_whitePig,
    'redMoonMonster': mon_redMoon,
    'bloodZombie': mon_bloodZombie,
    'chiyueDemon': mon_chiyueBoss,
}


# ============ 地面 tile ============
import random

def make_tile(name, base, speck, speck2=None, seed=1):
    random.seed(seed)
    t = Px(40, 40, scale=1)
    t.rect(0, 0, 40, 40, base)
    for _ in range(90):
        x = random.randrange(40); y = random.randrange(40)
        t.px(x, y, speck)
    if speck2:
        for _ in range(50):
            x = random.randrange(40); y = random.randrange(40)
            t.px(x, y, speck2)
    return t.im


def make_cobble(base, line, seed=3):
    random.seed(seed)
    t = Px(40, 40, scale=1)
    t.rect(0, 0, 40, 40, base)
    # 不规则石块
    for gy in range(0, 40, 10):
        for gx in range(0, 40, 13):
            ox = random.randrange(-2, 3)
            t.rect(gx + ox, gy, 11, 8, '#00000022')
            t.rect(gx + ox + 1, gy + 1, 9, 6, line)
            t.hline(gx + ox + 1, gx + ox + 9, gy + 1, '#ffffff12')
    return t.im


TILES = {
    'bichi':   lambda: make_cobble('#7a6a4e', '#94835f', 11),
    'woma':    lambda: make_tile('woma', '#3f6b34', '#345c2b', '#548043', 12),
    'centipede': lambda: make_cobble('#4a3a32', '#5a473c', 13),
    'zuma':    lambda: make_cobble('#4a4050', '#5a4d63', 14),
    'shabak':  lambda: make_tile('shabak', '#8a6a48', '#79583a', '#a08058', 15),
    'chiyue':  lambda: make_tile('chiyue', '#4a2422', '#3c1c1a', '#6a302a', 16),
}

WALL_TILES = {
    'bichi':   lambda: make_cobble('#6b5540', '#7d654c', 21),
    'woma':    lambda: make_tile('w', '#2f4a2b', '#243a22', '#3a5c34', 22),
    'centipede': lambda: make_cobble('#3a2c26', '#4a3830', 23),
    'zuma':    lambda: make_cobble('#3d3446', '#4d4252', 24),
    'shabak':  lambda: make_cobble('#6b4a34', '#7d5a40', 25),
    'chiyue':  lambda: make_cobble('#4a2020', '#5c2828', 26),
}


# ============ 场景物件 ============
def obj_pine():
    a = Px(48, 60)
    cx = 24
    # 树干
    a.rect(cx - 4, 42, 8, 16, OUT); a.rect(cx - 3, 42, 6, 15, BROWN)
    a.rect(cx - 1, 42, 2, 15, BROWN_D)
    # 松冠（三层）
    for (tw, ty, th) in [(18, 30, 14), (14, 20, 13), (10, 10, 13)]:
        a.poly([(cx - tw//2, ty+th), (cx+tw//2, ty+th), (cx, ty)], OUT)
        a.poly([(cx - tw//2+2, ty+th-1), (cx+tw//2-2, ty+th-1), (cx, ty+2)], '#2e6b32')
        a.poly([(cx-2, ty+3), (cx+3, ty+th-2), (cx, ty+th-2)], '#1f4f24')
    return a.im


def obj_tree():
    a = Px(52, 56)
    cx = 26
    a.rect(cx - 4, 38, 8, 16, OUT); a.rect(cx - 3, 38, 6, 15, BROWN)
    a.ellipse(cx - 18, 10, cx + 18, 42, OUT)
    a.ellipse(cx - 16, 12, cx + 16, 40, '#3f8a3a')
    a.ellipse(cx - 13, 14, cx + 2, 28, '#57a548')
    a.ellipse(cx + 3, 22, cx + 14, 36, '#2f6f2f')
    return a.im


def obj_house():
    """经典比奇城瓦房"""
    a = Px(96, 84)
    # 墙体
    a.rect(8, 34, 80, 46, OUT)
    a.rect(10, 36, 76, 42, '#d8c39a')
    a.rect(10, 36, 76, 4, '#b49b74')
    # 木梁
    for x in (10, 40, 76):
        a.rect(x, 36, 3, 42, '#7a5230')
    a.rect(10, 60, 76, 3, '#7a5230')
    # 门
    a.rect(40, 52, 18, 26, OUT); a.rect(42, 54, 14, 24, '#6b4423')
    a.rect(48, 54, 2, 24, '#4a2f18')
    a.px(53, 66, GOLD)
    # 窗
    for (wx, wy) in [(16, 44), (66, 44)]:
        a.rect(wx, wy, 14, 12, OUT); a.rect(wx+1, wy+1, 12, 10, '#4a6a7a')
        a.vline(wx+6, wy+1, wy+10, '#2a1410'); a.hline(wx+1, wx+12, wy+5, '#2a1410')
    # 屋顶（灰瓦，飞檐）
    a.poly([(0, 38), (16, 16), (80, 16), (96, 38)], OUT)
    a.poly([(3, 37), (17, 18), (79, 18), (93, 37)], '#5a5a66')
    # 瓦纹
    for x in range(6, 92, 8):
        a.line if False else None
        for yy in range(22, 37):
            a.px(x - (yy-22)//2, yy, '#44444e')
    a.hline(0, 95, 37, '#3a3a44')
    a.hline(14, 82, 16, '#7a7a88')
    # 屋脊装饰
    a.rect(46, 12, 4, 5, '#8a2a2a')
    return a.im


def obj_rock():
    a = Px(36, 26)
    a.poly([(2, 24), (6, 12), (16, 6), (27, 10), (34, 24)], OUT)
    a.poly([(4, 24), (8, 13), (16, 8), (26, 12), (32, 24)], '#7a7a7a')
    a.poly([(8, 13), (16, 8), (17, 20), (6, 22)], '#969696')
    a.poly([(26, 12), (32, 24), (20, 24), (17, 20)], '#5f5f5f')
    return a.im


def obj_torch():
    a = Px(20, 40)
    cx = 10
    a.rect(cx - 1, 18, 3, 20, BROWN)
    a.rect(cx - 2, 16, 5, 3, '#3a2a18')
    # 火焰
    a.poly([(cx - 4, 18), (cx, 2), (cx + 4, 18)], '#e85a1a')
    a.poly([(cx - 2, 18), (cx, 6), (cx + 2, 18)], '#ffb43a')
    a.poly([(cx - 1, 18), (cx, 11), (cx + 1, 18)], '#fff0a0')
    return a.im


def obj_tomb():
    a = Px(32, 44)
    cx = 16
    a.rect(cx - 10, 34, 20, 8, '#2a2a2a')
    a.poly([(cx - 9, 36), (cx - 9, 14), (cx, 6), (cx + 9, 14), (cx + 9, 36)], OUT)
    a.poly([(cx - 7, 35), (cx - 7, 15), (cx, 8), (cx + 7, 15), (cx + 7, 35)], '#7a7a82')
    a.hline(cx - 3, cx + 3, 18, '#5a5a62')
    a.vline(cx, 14, 26, '#5a5a62')
    return a.im


def obj_fence():
    a = Px(40, 28)
    for x in (4, 18, 32):
        a.rect(x, 8, 3, 18, OUT); a.rect(x+1, 9, 1, 16, BROWN)
        a.poly([(x, 8), (x+2, 3), (x+4, 8)], BROWN)
    a.rect(2, 12, 36, 2, OUT); a.rect(2, 13, 36, 1, BROWN_L)
    a.rect(2, 19, 36, 2, OUT); a.rect(2, 20, 36, 1, BROWN_L)
    return a.im


def obj_lantern():
    """比奇城灯笼柱"""
    a = Px(28, 60)
    cx = 14
    a.rect(cx - 2, 22, 4, 36, '#3a2a18')
    a.rect(cx - 6, 18, 12, 4, '#5a4024')
    a.ellipse(cx - 6, 6, cx + 6, 20, OUT)
    a.ellipse(cx - 5, 7, cx + 5, 19, '#c9302a')
    a.hline(cx - 5, cx + 4, 12, GOLD)
    a.vline(cx, 7, 19, GOLD)
    a.poly([(cx - 7, 6), (cx + 7, 6), (cx + 4, 2), (cx - 4, 2)], '#3a2a18')
    return a.im


OBJS = {
    'pine': obj_pine, 'tree': obj_tree, 'house': obj_house,
    'rock': obj_rock, 'torch': obj_torch, 'tomb': obj_tomb,
    'fence': obj_fence, 'lantern': obj_lantern,
}


# ============ 执行生成 ============
def main():
    # 英雄：3职业 × 4方向 × 2帧
    for cls in ('warrior', 'mage', 'taoist'):
        for direction in ('down', 'up', 'left', 'right'):
            for frame in (0, 1):
                im = draw_hero(cls, direction, frame)
                # 侧面：left 用 right 镜像
                if direction == 'left':
                    im = im.transpose(Image.FLIP_LEFT_RIGHT)
                im.save(os.path.join(SPR, f'hero_{cls}_{direction}_{frame}.png'))

    # NPC：用职业精灵 + 色调变化
    npc_map = {
        'elder': 'taoist', 'weaponShop': 'warrior', 'potionShop': 'mage',
        'smith': 'warrior', 'teleporter': 'taoist', 'guildMaster': 'warrior',
    }
    for npc, base in npc_map.items():
        im = draw_hero(base, 'down', 0).copy()
        # 简单染色标记
        px = im.load(); w, h = im.size
        tint = {
            'elder': (255, 220, 120), 'weaponShop': (255, 170, 120),
            'potionShop': (120, 200, 255), 'smith': (180, 180, 180),
            'teleporter': (140, 190, 255), 'guildMaster': (255, 120, 90),
        }[npc]
        for y in range(h):
            for x in range(w):
                r, g, b, al = px[x, y]
                if al and r > 120 and g > 100 and abs(r - g) < 60:  # 给身体加淡色
                    px[x, y] = (min(255, (r + tint[0]) // 2), min(255, (g + tint[1]) // 2),
                                min(255, (b + tint[2]) // 2), al)
        im.save(os.path.join(SPR, f'npc_{npc}.png'))

    # 怪物
    for mid, fn in MONSTER_FN.items():
        fn().save(os.path.join(SPR, f'mon_{mid}.png'))

    # 地面
    for name, fn in TILES.items():
        fn().save(os.path.join(TIL, f'{name}.png'))
    for name, fn in WALL_TILES.items():
        fn().save(os.path.join(TIL, f'wall_{name}.png'))

    # 物件
    for name, fn in OBJS.items():
        fn().save(os.path.join(OBJ, f'{name}.png'))

    print('素材生成完成！')
    print('精灵:', len(os.listdir(SPR)), '地面:', len(os.listdir(TIL)), '物件:', len(os.listdir(OBJ)))


if __name__ == '__main__':
    main()
