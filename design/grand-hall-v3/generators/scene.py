"""Grand Hall voxel scene. grid[x, y, z] holds material ids, layer[x, y, z] the parallax layer.
x: left -> right, y: up, z: away from the camera (toward the dealer)."""
import math
import numpy as np

NX, NY, NZ = 320, 124, 324
CX = 160

# materials
AIR, FLOOR, WALL, PILLAR, TRIM, CARPET, CARPET_GOLD, WOOD_DARK, WOOD, GOLD, FELT, BUMPER, IRON, FIRE, GLASS, BANNER, \
    SKIN, BEARD, ROBE, FUR, CROWN, GEM_R, GEM_G, EYE_W, EYE_D, MOUTH, TEETH, BROW, \
    CHIP_R, CHIP_G, CHIP_K, CHIP_C, CHIP_Y, CARD, CANDLE, CEIL, STEP, ROBE_DARK, SWEAT, CARDBACK, FIRE_CORE = range(41)

# layers
L_FAR, L_TABLE, L_KING, L_FG = 0, 1, 2, 3

Y0 = 10            # dais top
FELT_Y = 25        # felt surface
RIM_Y = 26
TC = (160.0, 150.0)  # table centre (x, z): straight edge at z=150, curve toward the camera
R_FELT, R_RIM, R_OUT = 80.0, 81.5, 88.0
SEAT_R = 66.0
SEAT_ANG = (-64, -32, 0, 32, 64)
BACK_Z = 308


class Scene:
    def __init__(self):
        self.g = np.zeros((NX, NY, NZ), np.uint8)
        self.l = np.zeros((NX, NY, NZ), np.uint8)
        self.lights = []
        self.anchors = {}
        self.banners = []

    def box(self, x0, x1, y0, y1, z0, z1, m, layer=L_FAR):
        x0, x1 = max(0, int(round(x0))), min(NX, int(round(x1)))
        y0, y1 = max(0, int(round(y0))), min(NY, int(round(y1)))
        z0, z1 = max(0, int(round(z0))), min(NZ, int(round(z1)))
        if x0 >= x1 or y0 >= y1 or z0 >= z1:
            return
        self.g[x0:x1, y0:y1, z0:z1] = m
        self.l[x0:x1, y0:y1, z0:z1] = layer

    def mask_set(self, mask3, m, layer):
        self.g[mask3] = m
        self.l[mask3] = layer

    def light(self, x, y, z, col, inten, radius, size=1.0, glow=0.0):
        self.lights.append((x, y, z, col[0], col[1], col[2], inten, radius, size, glow))


TORCH_COL = (1.0, 0.56, 0.24)
BRAZIER_COL = (1.0, 0.50, 0.20)
LANTERN_COL = (1.0, 0.66, 0.34)
WINDOW_COL = (1.0, 0.50, 0.52)
FILL_COL = (1.0, 0.70, 0.45)


def build(king_frame='idle', grids=None):
    s = Scene()
    if grids is None:
        X, Y, Z = np.meshgrid(np.arange(NX) + 0.5, np.arange(NY) + 0.5, np.arange(NZ) + 0.5, indexing='ij',
                              sparse=True)
    else:
        X, Y, Z = grids
    c = CX

    # ---------------- floor, dais, steps
    s.box(0, NX, 0, 4, 0, NZ, FLOOR)
    s.box(50, 270, 4, Y0, 50, 196, FLOOR)
    s.box(50, 270, 4, Y0 - 2, 44, 50, STEP)
    s.box(50, 270, 4, Y0 - 4, 38, 44, STEP)
    s.box(50, 270, 4, Y0 - 3, 196, 202, STEP)
    # carpets
    def carpet(x0, x1, y, z0, z1):
        s.box(x0, x1, y, y + 1, z0, z1, CARPET)
        s.box(x0 - 2, x0, y, y + 1, z0, z1, CARPET_GOLD)
        s.box(x1, x1 + 2, y, y + 1, z0, z1, CARPET_GOLD)
    carpet(c - 22, c + 22, Y0, 50, 196)
    carpet(c - 22, c + 22, Y0 - 2, 44, 50)
    carpet(c - 22, c + 22, Y0 - 4, 38, 44)
    carpet(c - 22, c + 22, 4, 0, 38)
    carpet(c - 16, c + 16, Y0 - 3, 196, 202)
    carpet(c - 16, c + 16, 4, 202, BACK_Z)
    # big rug under the table
    rug = (np.abs(X - c) < 112) & (Z > 54) & (Z < 186) & (Y > Y0) & (Y < Y0 + 1)
    s.mask_set(rug, CARPET, L_FAR)
    rb = rug & ((np.abs(X - c) > 108) | (Z < 58) | (Z > 182))
    s.mask_set(rb, CARPET_GOLD, L_FAR)

    # ---------------- walls, ceiling, tiers
    s.box(0, 8, 0, NY, 0, NZ, WALL)
    s.box(NX - 8, NX, 0, NY, 0, NZ, WALL)
    s.box(0, NX, 0, NY, BACK_Z, NZ, WALL)
    s.box(0, NX, 114, NY, 0, NZ, CEIL)
    for zb in range(20, BACK_Z, 26):
        s.box(8, NX - 8, 108, 114, zb, zb + 4, WOOD_DARK)
    for x0, x1, top in [(8, 14, 44), (14, 20, 37), (20, 26, 30), (26, 32, 23)]:
        for a, b in ((x0, x1), (NX - x1, NX - x0)):
            s.box(a, b, 4, top, 30, BACK_Z, WALL)
            s.box(a, b, top - 1, top, 30, BACK_Z, TRIM)

    # back-wall windows
    s.windows = []
    for wx in (c - 72, c, c + 72):
        hw = 15 if wx == c else 12
        ytop = 102 if wx == c else 92
        ybot = 30
        yc = ytop - hw
        inside = (Y < yc) | (((X - wx) ** 2 + (Y - yc) ** 2) < hw * hw)
        opxy = (np.abs(X - wx) < hw) & (Y > ybot) & inside
        op = opxy & (Z >= BACK_Z - 2)
        inside2 = (Y < yc) | (((X - wx) ** 2 + (Y - yc) ** 2) < (hw + 3) ** 2)
        fr = (np.abs(X - wx) < hw + 3) & (Y > ybot - 3) & (Z >= BACK_Z - 2) & (Z < BACK_Z + 1) & inside2 & ~opxy
        s.mask_set(np.broadcast_to(fr, s.g.shape), TRIM, L_FAR)
        s.mask_set(np.broadcast_to(op, s.g.shape), AIR, L_FAR)
        s.box(wx - hw - 4, wx + hw + 4, ybot - 4, ybot, BACK_Z - 6, BACK_Z + 1, TRIM)
        mull = op & (Z >= BACK_Z + 4) & (Z < BACK_Z + 5) & (
            (np.abs(X - wx) < 0.6) | (np.abs(np.abs(X - wx) - hw / 2) < 0.5) | (np.abs(((Y - ybot) % 16) - 0.5) < 0.5))
        s.mask_set(np.broadcast_to(mull, s.g.shape), IRON, L_FAR)
        s.windows.append((wx, hw, ybot, ytop))
        for yy in (ybot + 14, ytop - 18):
            s.light(wx, yy, BACK_Z - 4, WINDOW_COL, 34.0 if wx == c else 26.0, 190.0, hw * 0.6)

    for bx in (c - 108, c - 36, c + 36, c + 108):
        _banner(s, X, Y, Z, bx, BACK_Z - 1, 44, 94, 10)

    # ---------------- pillars with torches
    for side, (x0, x1) in enumerate([(34, 46), (274, 286)]):
        for zc in (66, 126, 186, 246, 292):
            s.box(x0 - 1, x1 + 1, 4, 9, zc - 7, zc + 7, TRIM)
            s.box(x0, x1, 9, 108, zc - 6, zc + 6, PILLAR)
            s.box(x0 - 1, x1 + 1, 100, 106, zc - 7, zc + 7, TRIM)
            d = 1 if side == 0 else -1
            face = x1 if side == 0 else x0          # inner face x coordinate
            # bracket, handle, cup, flame (stick out toward the hall centre)
            xs = [face + d * k for k in range(0, 4)]
            lo, hi = min(xs), max(xs) + 1
            s.box(lo, hi, 54, 56, zc - 1, zc + 1, IRON)
            s.box(lo + (2 if d > 0 else 0), hi - (0 if d > 0 else 2), 56, 61, zc - 1, zc + 1, WOOD_DARK)
            fx = face + d * 3 if d > 0 else face - 4
            s.box(fx - 1, fx + 2, 61, 62, zc - 2, zc + 2, IRON)
            s.box(fx - 1, fx + 2, 62, 66, zc - 1, zc + 2, FIRE)
            s.box(fx, fx + 1, 62, 65, zc, zc + 1, FIRE_CORE)
            s.box(fx, fx + 1, 66, 69, zc, zc + 1, FIRE)
            s.light(fx + 0.5 + d * 2.0, 65, zc + 0.5, TORCH_COL, 30.0, 70.0, 1.2, 3.2)
            if zc >= 186:
                _banner(s, X, Y, Z, (x0 + x1) / 2, zc - 6, 68, 98, 5)
    for tx in (c - 36, c + 36):
        s.box(tx - 1, tx + 1, 34, 37, BACK_Z - 2, BACK_Z, IRON)
        s.box(tx - 1, tx + 1, 37, 41, BACK_Z - 3, BACK_Z - 2, WOOD_DARK)
        s.box(tx - 2, tx + 2, 41, 42, BACK_Z - 4, BACK_Z - 2, IRON)
        s.box(tx - 1, tx + 1, 42, 46, BACK_Z - 4, BACK_Z - 2, FIRE)
        s.light(tx, 44, BACK_Z - 7, TORCH_COL, 24.0, 60.0, 1.0, 2.8)

    # ---------------- braziers
    for bx, bz in [(62, 168), (258, 168), (66, 240), (254, 240)]:
        base = Y0 if (50 <= bx < 270 and 40 <= bz < 196) else 4
        s.box(bx - 4, bx + 4, base, base + 2, bz - 4, bz + 4, TRIM)
        s.box(bx - 3, bx + 3, base + 2, base + 14, bz - 3, bz + 3, PILLAR)
        s.box(bx - 3, bx + 3, base + 13, base + 14, bz - 3, bz + 3, TRIM)
        s.box(bx - 5, bx + 5, base + 14, base + 15, bz - 5, bz + 5, IRON)
        s.box(bx - 6, bx + 6, base + 15, base + 18, bz - 6, bz + 6, IRON)
        s.box(bx - 5, bx + 5, base + 16, base + 18, bz - 5, bz + 5, WOOD_DARK)
        rng = np.random.default_rng(int(bx * 7 + bz))
        for fx in range(bx - 5, bx + 5):
            for fz in range(bz - 5, bz + 5):
                d = math.hypot(fx + 0.5 - bx, fz + 0.5 - bz)
                if d > 5.2:
                    continue
                h = int(round(2 + (1 - d / 5.2) * 9 * (0.55 + 0.45 * rng.random())))
                s.box(fx, fx + 1, base + 18, base + 18 + h, fz, fz + 1, FIRE)
                if d < 2.6:
                    s.box(fx, fx + 1, base + 18, base + 18 + max(1, h - 3), fz, fz + 1, FIRE_CORE)
        s.light(bx, base + 23, bz, BRAZIER_COL, 50.0, 110.0, 2.5, 5.0)

    # ---------------- foreground: stone pedestals + lanterns on the front of the dais
    for lx in (96, 224):
        lz = 47
        s.box(lx - 9, lx + 9, 0, 16, lz - 9, lz + 9, STEP, L_FG)
        s.box(lx - 10, lx + 10, 15, 17, lz - 10, lz + 10, TRIM, L_FG)
        s.box(lx - 6, lx + 6, 17, 19, lz - 6, lz + 6, IRON, L_FG)
        for px in (lx - 5, lx + 4):
            for pz in (lz - 5, lz + 4):
                s.box(px, px + 1, 19, 31, pz, pz + 1, IRON, L_FG)
        s.box(lx - 4, lx + 4, 19, 31, lz - 4, lz + 4, GLASS, L_FG)
        s.box(lx - 1, lx + 1, 21, 27, lz - 1, lz + 1, FIRE_CORE, L_FG)
        s.box(lx - 6, lx + 6, 31, 32, lz - 6, lz + 6, IRON, L_FG)
        s.box(lx - 5, lx + 5, 32, 33, lz - 5, lz + 5, IRON, L_FG)
        s.box(lx - 3, lx + 3, 33, 35, lz - 3, lz + 3, IRON, L_FG)
        s.box(lx - 1, lx + 1, 35, 39, lz - 1, lz + 1, IRON, L_FG)
        s.box(lx - 2, lx + 2, 39, 41, lz - 1, lz + 1, IRON, L_FG)
        s.light(lx, 25, lz, LANTERN_COL, 34.0, 70.0, 1.5, 6.0)
    # stone blocks framing the bottom edge
    for x0, x1, top in [(50, 75, 12), (245, 270, 12)]:
        s.box(x0, x1, 0, top, 48, 72, STEP, L_FG)
        s.box(x0, x1, top - 1, top, 48, 72, TRIM, L_FG)

    # warm fill over the felt (light from the braziers and torches pooling on the table)
    s.light(c, 70, 108, FILL_COL, 70.0, 150.0, 14.0, 0.0)
    s.light(c, 60, 126, FILL_COL, 26.0, 60.0, 5.0, 0.0)      # warm glow on the king's face

    _table(s, X, Y, Z)
    _king(s, X, Y, Z, king_frame)

    cx, cz = TC
    for i, ang in enumerate(SEAT_ANG):
        a = math.radians(ang)
        s.anchors[f'seat{i + 1}'] = (cx + SEAT_R * math.sin(a), FELT_Y, cz - SEAT_R * math.cos(a))
        s.anchors[f'seat{i + 1}Rim'] = (cx + (R_OUT + 1) * math.sin(a), RIM_Y, cz - (R_OUT + 1) * math.cos(a))
    s.anchors['dealerCards'] = (cx, FELT_Y, cz - 10)
    s.anchors['crest'] = (cx, FELT_Y, cz - 22)
    s.anchors['kingHead'] = (cx, 48, 158)
    s.anchors['kingCrown'] = (cx, 64, 158)
    return s


def _banner(s, X, Y, Z, bx, zf, y0, y1, hw):
    swallow = (Y < y0 + 7) & (np.abs(X - bx) < (y0 + 7 - Y) * hw / 7)
    m = (np.abs(X - bx) < hw) & (Y > y0) & (Y < y1) & (Z >= zf - 1) & (Z < zf) & ~swallow
    s.mask_set(np.broadcast_to(m, s.g.shape), BANNER, L_FAR)
    rod = (np.abs(X - bx) < hw + 2) & (Y > y1) & (Y < y1 + 1.2) & (Z >= zf - 2) & (Z < zf)
    s.mask_set(np.broadcast_to(rod, s.g.shape), GOLD, L_FAR)
    s.banners.append((bx, zf - 1, y0, y1, hw))


def _table(s, X, Y, Z):
    cx, cz = TC
    dx, dz = X - cx, Z - cz
    r = np.sqrt(dx * dx + dz * dz)
    front = Z <= cz
    back = (Z > cz) & (Z < cz + 6) & (np.abs(dx) < R_OUT)
    T = L_TABLE
    B = lambda m: np.broadcast_to(m, s.g.shape)
    s.mask_set(B((front & (r < 74) & (Y > Y0) & (Y < 21)) | (back & (np.abs(dx) < 74) & (Y > Y0) & (Y < 21))),
               WOOD_DARK, T)
    s.mask_set(B(front & (r < R_FELT) & (Y > 20) & (Y < FELT_Y)), FELT, T)
    s.mask_set(B(front & (r >= R_FELT) & (r < R_RIM + 1) & (Y > 20) & (Y < RIM_Y)), GOLD, T)
    s.mask_set(B(front & (r >= R_RIM + 1) & (r < R_OUT) & (Y > 15) & (Y < RIM_Y)), WOOD, T)
    s.mask_set(B(front & (r >= R_RIM + 1) & (r < R_OUT - 1) & (Y > 12) & (Y < 16)), WOOD_DARK, T)
    m = front & (r >= R_RIM + 3) & (r < R_OUT + 2) & (Y > 21) & (Y < RIM_Y + 2)
    m = m & ~((Y > RIM_Y) & ((r < R_RIM + 4.5) | (r > R_OUT + 0.8)))
    m = m & ~((Y > RIM_Y + 1) & ((r < R_RIM + 5.5) | (r > R_OUT - 0.2)))
    s.mask_set(B(m), BUMPER, T)
    s.mask_set(B(front & (r >= R_OUT - 0.5) & (r < R_OUT + 1.2) & (Y > 19) & (Y < 22)), GOLD, T)
    s.mask_set(B(back & (Y > 15) & (Y < RIM_Y)), WOOD, T)
    s.mask_set(B(back & (Y > RIM_Y - 1) & (Y < RIM_Y) & (np.abs(dx) < R_FELT)), GOLD, T)

    # chip tray (back-left)
    tx0, tx1, tz0, tz1 = 100, 140, 135, 148
    s.box(tx0, tx1, FELT_Y, FELT_Y + 5, tz0, tz1, WOOD_DARK, T)
    s.box(tx0 + 1, tx1 - 1, FELT_Y + 1, FELT_Y + 5, tz0 + 1, tz1 - 1, AIR, T)
    s.box(tx0, tx1, FELT_Y + 4, FELT_Y + 5, tz0, tz0 + 1, GOLD, T)
    cols = [CHIP_C, CHIP_R, CHIP_G, CHIP_K, CHIP_Y, CHIP_C, CHIP_R, CHIP_G, CHIP_K]
    w = (tx1 - tx0 - 2) / len(cols)
    for i, cm in enumerate(cols):
        a = tx0 + 1 + i * w
        h = 3 if i % 3 else 2
        s.box(a, a + w - 1, FELT_Y + 1, FELT_Y + 1 + h, tz0 + 1, tz1 - 1, cm, T)
        s.box(a + w - 1, a + w, FELT_Y + 1, FELT_Y + 4, tz0 + 1, tz1 - 1, WOOD_DARK, T)
    s.anchors['chipTray'] = ((tx0 + tx1) / 2, FELT_Y + 4, (tz0 + tz1) / 2)

    # card shoe (back-right) with slanted face toward the players
    shoe = (X > 186) & (X < 202) & (Z > 134) & (Z < 149) & (Y > FELT_Y) & (Y < FELT_Y + 11)
    slope = (Y - FELT_Y) > (Z - 134) * 0.9 + 7
    m = shoe & ~slope
    s.mask_set(B(m), WOOD, T)
    s.mask_set(B(m & ((X < 187.2) | (X > 200.8))), WOOD_DARK, T)
    s.mask_set(B(m & ((Y > FELT_Y + 8.8) | (Y < FELT_Y + 1))), GOLD, T)
    cardm = (X > 188) & (X < 200) & (np.abs((Y - FELT_Y) - ((Z - 134) * 0.9 + 7)) < 0.9) & (Z > 134.5) & (Z < 137.5)
    s.mask_set(B(cardm), CARDBACK, T)
    s.anchors['shoe'] = (194, FELT_Y + 6, 140)

    # discard tray
    s.box(210, 224, FELT_Y, FELT_Y + 6, 134, 148, WOOD_DARK, T)
    s.box(211, 223, FELT_Y + 1, FELT_Y + 6, 135, 147, AIR, T)
    s.box(211, 223, FELT_Y + 1, FELT_Y + 4, 135, 147, CARD, T)
    s.box(210, 224, FELT_Y + 5, FELT_Y + 6, 134, 135, GOLD, T)
    s.anchors['discard'] = (217, FELT_Y + 6, 141)


def _king(s, X, Y, Z, frame):
    K = L_KING
    c = CX
    up = 1 if frame == 'breath' else 0

    def box(x0, x1, y0, y1, z0, z1, m, lift=True):
        dy = up if lift else 0
        s.box(c + x0, c + x1, y0 + dy, y1 + dy, z0, z1, m, K)

    # body (x offsets relative to centre)
    box(-16, 16, Y0, 28, 156, 172, ROBE_DARK, lift=False)
    box(-17, 17, 24, 38, 155, 170, ROBE)
    box(-2, 2, 24, 38, 154, 155, GOLD)
    # fur mantle
    box(-21, 21, 33, 39, 153, 171, FUR)
    box(-19, 19, 39, 41, 155, 169, FUR)
    # shoulders
    for x0 in (-23, 15):
        box(x0, x0 + 8, 28, 37, 155, 166, ROBE)
    # forearms + hands on the felt
    for x0 in (-24, 15):
        box(x0, x0 + 9, 26, 33, 143, 158, ROBE, lift=False)
        box(x0, x0 + 9, 25, 33, 141, 143, FUR, lift=False)
        box(x0 + 1, x0 + 8, FELT_Y, FELT_Y + 4, 134, 141, SKIN, lift=False)
        box(x0 + 1, x0 + 8, FELT_Y + 4, FELT_Y + 5, 136, 141, SKIN, lift=False)
    # chain + medallion
    box(-11, 11, 35, 36, 152, 153, GOLD)
    box(-3, 3, 29, 34, 152, 153, GOLD)
    box(-1, 1, 30, 32, 151, 152, GEM_R)
    # head
    hb = 40
    box(-8, 8, hb, hb + 16, 151, 165, SKIN)
    box(-9, 9, hb + 5, hb + 17, 158, 166, BEARD)
    box(-9, -7, hb + 3, hb + 15, 151, 166, BEARD)
    box(7, 9, hb + 3, hb + 15, 151, 166, BEARD)
    box(-8, 8, hb + 15, hb + 18, 151, 166, BEARD)
    box(-10, -9, hb + 7, hb + 10, 156, 159, SKIN)
    box(9, 10, hb + 7, hb + 10, 156, 159, SKIN)
    # beard rows (y, half width, front z)
    for yy, half, zf in [(hb + 6, 8, 149), (hb + 4, 8, 148), (hb + 2, 8, 148), (hb, 7, 148), (hb - 2, 6, 148),
                         (hb - 4, 5, 149), (hb - 6, 3, 150), (hb - 8, 2, 151)]:
        box(-half, half, yy, yy + 2, zf, 154 if yy < hb else 152, BEARD)
    box(-6, 6, hb + 8, hb + 14, 147, 151, AIR)
    # moustache
    box(-5, 5, hb + 7, hb + 9, 148, 151, BEARD)
    box(-7, -4, hb + 6, hb + 8, 148, 151, BEARD)
    box(4, 7, hb + 6, hb + 8, 148, 151, BEARD)
    # nose
    box(-1, 1, hb + 8, hb + 11, 149, 151, SKIN)
    box(-2, 2, hb + 8, hb + 9, 150, 151, SKIN)
    ey = hb + 11

    def eyes(kind):
        for ex in (-5, 2):
            left = ex < 0
            if kind == 'closed':
                box(ex, ex + 3, ey, ey + 1, 150, 151, EYE_D)
            elif kind == 'squint':
                box(ex, ex + 3, ey, ey + 1, 150, 151, EYE_W)
                px = ex + 2 if left else ex
                box(px, px + 1, ey, ey + 1, 149, 151, EYE_D)
            else:
                box(ex, ex + 3, ey, ey + 2, 150, 151, EYE_W)
                px = ex + 2 if left else ex
                box(px, px + 1, ey, ey + 2, 149, 151, EYE_D)

    def brows(kind):
        for ex in (-5, 2):
            left = ex < 0
            if kind == 'furrow':
                inner = ex + 2 if left else ex
                outer = ex if left else ex + 2
                box(ex, ex + 3, ey + 3, ey + 4, 149, 151, BROW)
                box(inner, inner + 1, ey + 2, ey + 3, 149, 151, BROW)
                box(outer, outer + 1, ey + 4, ey + 5, 149, 151, BROW)
            elif kind == 'raise' and not left:
                box(ex, ex + 4, ey + 4, ey + 5, 149, 151, BROW)
            else:
                box(ex - (1 if left else 0), ex + 3 + (0 if left else 1), ey + 3, ey + 4, 149, 151, BROW)

    def mouth(kind):
        my = hb + 5
        if kind == 'grin':
            box(-5, 5, my - 1, my + 1, 147, 149, MOUTH)
            box(-4, 4, my, my + 1, 146.6, 149, TEETH)
            box(-6, -5, my, my + 2, 147, 149, MOUTH)
            box(5, 6, my, my + 2, 147, 149, MOUTH)
        elif kind == 'grimace':
            box(-6, 6, my - 3, my + 1, 147, 149, MOUTH)
            box(-5, 5, my - 2, my, 146.6, 149, TEETH)
            for tx in (-3, 0, 3):
                box(tx, tx + 1, my - 2, my, 146.4, 149, MOUTH)
        else:
            box(-4, 4, my, my + 1, 147, 149, MOUTH)
            box(-5, -4, my + 1, my + 2, 147, 149, MOUTH)
            box(4, 5, my + 1, my + 2, 147, 149, MOUTH)

    if frame == 'blink':
        eyes('closed'); brows('flat'); mouth('neutral')
    elif frame == 'smug':
        eyes('squint'); brows('raise'); mouth('grin')
    elif frame == 'grimace':
        eyes('open'); brows('furrow'); mouth('grimace')
        box(-11, -10, hb + 10, hb + 13, 151, 152, SWEAT)
        box(-12, -10, hb + 9, hb + 10, 151, 152, SWEAT)
    else:
        eyes('open'); brows('flat'); mouth('neutral')

    # crown
    cb = hb + 16
    ring = (np.abs(X - c) < 10) & (Z > 149) & (Z < 167) & (Y > cb + up) & (Y < cb + 4 + up)
    ring = ring & ~((np.abs(X - c) < 8) & (Z > 151) & (Z < 165))
    s.mask_set(np.broadcast_to(ring, s.g.shape), CROWN, K)
    for px, h in [(-10, 4), (-5, 5), (-1, 7), (4, 5), (9, 4)]:
        w = 2
        box(px, px + w, cb + 4, cb + 4 + h, 150, 152, CROWN)
        box(px, px + w, cb + 4 + h, cb + 5 + h, 150, 151, GEM_R if px == -1 else CROWN)
    for pz in (156, 162):
        box(-10, -8, cb + 4, cb + 8, pz, pz + 2, CROWN)
        box(8, 10, cb + 4, cb + 8, pz, pz + 2, CROWN)
    for gx, gm in [(-6, GEM_G), (-1, GEM_R), (4, GEM_G)]:
        box(gx, gx + 2, cb + 1, cb + 3, 149, 150, gm)
    box(-8, 8, cb, cb + 1, 158, 165, BEARD)
