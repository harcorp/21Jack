"""Numba voxel ray caster for the Grand Hall: DDA primary rays, soft shadowed point lights,
ray-cast AO, glow halos and a dusk sky seen through the windows."""
import math
import numpy as np
import numba as nb
from scene import *  # noqa
from palette import hx, GOLD as GOLDC

INF = 1e30


def srgb2lin(c):
    c = np.asarray(c, np.float64) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


# base colours per material (sRGB hex) -> linear
BASE = {
    FLOOR: '#3A3540', WALL: '#2E2A34', PILLAR: '#4E4854', TRIM: '#6A6270', CARPET: '#8E1A27',
    CARPET_GOLD: '#C8902A', WOOD_DARK: '#3E2211', WOOD: '#6A3D1C', GOLD: '#E8B53A', FELT: '#1B6E46', FIRE_CORE: '#FFE6A0',
    BUMPER: '#A11F2D', IRON: '#2B2A30', FIRE: '#FFAA3B', GLASS: '#FFC46B', BANNER: '#9A1B2A',
    SKIN: '#E3A57C', BEARD: '#7E4626', ROBE: '#A11F2D', FUR: '#EFE3C8', CROWN: '#F0C040',
    GEM_R: '#E02040', GEM_G: '#2EC27E', EYE_W: '#F4ECDD', EYE_D: '#1A1014', MOUTH: '#1E0808',
    TEETH: '#F2E8D5', BROW: '#3E2010', CHIP_R: '#B3202E', CHIP_G: '#1E7A4A', CHIP_K: '#26232B',
    CHIP_C: '#EFE3C8', CHIP_Y: '#E8B53A', CARD: '#EFE3C8', CANDLE: '#EFE3C8', CEIL: '#1E140E',
    STEP: '#4A4450', ROBE_DARK: '#5C0F18', SWEAT: '#9AD4FF', CARDBACK: '#7E1622',
}
MATCOL = np.zeros((64, 3))
for k, v in BASE.items():
    MATCOL[k] = srgb2lin(hx(v))
SPEC = np.zeros(64)
for k, v in {GOLD: 0.9, CROWN: 1.0, IRON: 0.35, GEM_R: 0.8, GEM_G: 0.8, CARPET_GOLD: 0.3, BUMPER: 0.25,
             EYE_W: 0.2, SWEAT: 0.8, CHIP_Y: 0.4, WOOD: 0.12}.items():
    SPEC[k] = v
EMISSIVE = np.zeros(64, np.bool_)
EMISSIVE[FIRE] = True
EMISSIVE[GLASS] = True
CASTS = np.ones(64, np.bool_)
CASTS[AIR] = False
CASTS[FIRE] = False
CASTS[GLASS] = False
CASTS[FIRE_CORE] = False

GOLDRAMP = np.array([[0, 0, 0]] + [srgb2lin(hx(c)) for c in (GOLDC[0], GOLDC[1], GOLDC[3], GOLDC[4], GOLDC[2])])


@nb.njit(fastmath=True, cache=True)
def h3(x, y, z, s):
    v = math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + s * 4.581) * 43758.5453
    return v - math.floor(v)


@nb.njit(fastmath=True, cache=True)
def trace(ox, oy, oz, dx, dy, dz, g, lay, stopmask, shadow, tmax):
    nx, ny, nz = g.shape
    # slab test
    t0, t1 = -INF, INF
    ax0 = 0
    for a in range(3):
        o = ox if a == 0 else (oy if a == 1 else oz)
        d = dx if a == 0 else (dy if a == 1 else dz)
        n = nx if a == 0 else (ny if a == 1 else nz)
        if abs(d) < 1e-12:
            if o < 0 or o > n:
                return False, 0.0, 0, 0, 0, 0, 0
        else:
            ta = (0 - o) / d
            tb = (n - o) / d
            if ta > tb:
                ta, tb = tb, ta
            if ta > t0:
                t0 = ta
                ax0 = a
            if tb < t1:
                t1 = tb
    if t0 > t1 or t1 < 0:
        return False, 0.0, 0, 0, 0, 0, 0
    t = max(t0, 0.0)
    if t > tmax:
        return False, 0.0, 0, 0, 0, 0, 0
    px, py, pz = ox + dx * (t + 1e-5), oy + dy * (t + 1e-5), oz + dz * (t + 1e-5)
    ix = min(max(int(math.floor(px)), 0), nx - 1)
    iy = min(max(int(math.floor(py)), 0), ny - 1)
    iz = min(max(int(math.floor(pz)), 0), nz - 1)
    sx = 1 if dx > 0 else -1
    sy = 1 if dy > 0 else -1
    sz = 1 if dz > 0 else -1
    tdx = abs(1.0 / dx) if abs(dx) > 1e-12 else INF
    tdy = abs(1.0 / dy) if abs(dy) > 1e-12 else INF
    tdz = abs(1.0 / dz) if abs(dz) > 1e-12 else INF
    tmx = ((ix + (1 if sx > 0 else 0)) - ox) / dx if abs(dx) > 1e-12 else INF
    tmy = ((iy + (1 if sy > 0 else 0)) - oy) / dy if abs(dy) > 1e-12 else INF
    tmz = ((iz + (1 if sz > 0 else 0)) - oz) / dz if abs(dz) > 1e-12 else INF
    axis = ax0
    tc = t
    for _ in range(4000):
        m = g[ix, iy, iz]
        if m != 0:
            if shadow:
                if CASTS_[m]:
                    return True, tc, ix, iy, iz, axis, 0
            elif stopmask[lay[ix, iy, iz]]:
                sgn = sx if axis == 0 else (sy if axis == 1 else sz)
                return True, tc, ix, iy, iz, axis, sgn
        if tmx < tmy and tmx < tmz:
            tc = tmx; tmx += tdx; ix += sx; axis = 0
            if ix < 0 or ix >= nx:
                break
        elif tmy < tmz:
            tc = tmy; tmy += tdy; iy += sy; axis = 1
            if iy < 0 or iy >= ny:
                break
        else:
            tc = tmz; tmz += tdz; iz += sz; axis = 2
            if iz < 0 or iz >= nz:
                break
        if tc > tmax:
            break
    return False, 0.0, 0, 0, 0, 0, 0


CASTS_ = CASTS


@nb.njit(fastmath=True, cache=True)
def sky(ox, oy, oz, dx, dy, dz):
    """Dusk sky with a distant voxel city, projected on a far plane z=720."""
    if dz <= 1e-6:
        return 0.05, 0.04, 0.09
    t = (720.0 - oz) / dz
    X = ox + dx * t
    Yp = oy + dy * t
    # gradient (linear rgb)
    h = (Yp + 85.0) / 190.0
    h = min(max(h, 0.0), 1.0)
    # bottom (horizon glow) -> top (deep violet)
    c0 = (1.0, 0.55, 0.20)
    c1 = (0.85, 0.22, 0.16)
    c2 = (0.35, 0.07, 0.20)
    c3 = (0.05, 0.03, 0.12)
    if h < 0.33:
        k = h / 0.33
        r, g, b = c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k
    elif h < 0.66:
        k = (h - 0.33) / 0.33
        r, g, b = c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k
    else:
        k = (h - 0.66) / 0.34
        r, g, b = c2[0] + (c3[0] - c2[0]) * k, c2[1] + (c3[1] - c2[1]) * k, c2[2] + (c3[2] - c2[2]) * k
    # pixel clouds
    cy = math.floor(Yp / 6.0)
    cx = math.floor((X + cy * 13.0) / 18.0)
    if Yp > 20 and h3(cx, cy, 3.0, 1.0) > 0.72:
        r = r * 0.6 + 0.9 * 0.4
        g = g * 0.6 + 0.35 * 0.4
        b = b * 0.6 + 0.35 * 0.4
    # sun
    sdx, sdy = X - 330.0, Yp + 52.0
    sd = math.sqrt(sdx * sdx + sdy * sdy)
    if sd < 22:
        r, g, b = 2.0, 1.25, 0.6
    elif sd < 60:
        k = (60 - sd) / 34.0
        r += 0.8 * k * k
        g += 0.35 * k * k
        b += 0.08 * k * k
    # far hills / towers (lighter violet)
    col = math.floor(X / 14.0)
    top2 = -58.0 + 16.0 * h3(col, 7.0, 1.0, 2.0) ** 2
    if Yp < top2:
        r, g, b = 0.16, 0.06, 0.16
    # near city: blocky towers with lit windows
    col = math.floor(X / 9.0)
    hh = h3(col, 2.0, 5.0, 3.0)
    top = -70.0 + 20.0 * hh * hh
    if h3(col, 9.0, 1.0, 4.0) > 0.86:
        top += 14.0   # a spire
    if Yp < top:
        r, g, b = 0.045, 0.02, 0.06
        wx = math.floor(X / 3.0)
        wy = math.floor(Yp / 4.0)
        if ((X - col * 9.0) > 1.5) and ((X - col * 9.0) < 7.5) and h3(wx, wy, 2.0, 5.0) > 0.8:
            r, g, b = 1.6, 0.75, 0.25
    return r, g, b


@nb.njit(fastmath=True, cache=True)
def tex_felt(px, pz, text1, text2, crest, cx, cz):
    """returns 0 for plain felt, else a gold-ramp index"""
    dx = px - cx
    dz = cz - pz
    r = math.sqrt(dx * dx + dz * dz)
    phi = math.atan2(dx, dz)
    lw = 0.62
    if abs(r - 76.2) < lw:
        return 3
    if abs(r - 74.7) < 0.3:
        return 2
    if abs(phi) < 1.40 and (abs(r - 54.0) < lw or abs(r - 34.4) < lw):
        return 3
    for i in range(5):
        a = (-64.0 + 32.0 * i) * math.pi / 180.0
        sx = cx + 66.0 * math.sin(a)
        sz = cz - 66.0 * math.cos(a)
        d = math.sqrt((px - sx) ** 2 + (pz - sz) ** 2)
        if abs(d - 8.6) < lw:
            return 3
        if abs(d - 7.2) < 0.3:
            return 2
    for k in range(2):
        tx = text1 if k == 0 else text2
        ra = 48.4 if k == 0 else 40.6
        hh = 5.6 if k == 0 else 4.8
        th, tw = tx.shape
        L = hh * tw / th
        s = ra * phi
        u = (s / L + 0.5) * tw
        v = (r - (ra - hh * 0.5)) / hh * th
        if u >= 0 and u < tw and v >= 0 and v < th:
            val = tx[int(v), int(u)]
            if val > 0:
                return 2 if val == 2 else 3
    ccx, ccz, cr = cx, cz - 21.5, 10.5
    u = (px - (ccx - cr)) / (2 * cr)
    v = 1.0 - (pz - (ccz - cr)) / (2 * cr)
    if u >= 0 and u < 1 and v >= 0 and v < 1:
        n = crest.shape[0]
        c = crest[int(v * n), int(u * n)]
        if c > 0:
            return c
    return 0


@nb.njit(fastmath=True, cache=True)
def shade_mat(m, ix, iy, iz, px, py, pz, axis, nsgn, text1, text2, crest, crest_b, banners, matcol, goldramp):
    """Albedo (linear) and emissive for a hit."""
    r, g, b = matcol[m, 0], matcol[m, 1], matcol[m, 2]
    er, eg, eb = 0.0, 0.0, 0.0
    n1 = h3(ix, iy, iz, m)
    k = 1.0
    if m == FLOOR:
        tx, tz = ix // 6, iz // 6
        k = 0.82 + 0.3 * h3(tx, 0, tz, 11.0) + 0.08 * n1
        if ix % 6 == 0 or iz % 6 == 0:
            k *= 0.62
    elif m == WALL or m == CEIL:
        row = iy // 3
        u = iz if axis == 0 else ix
        if axis == 1:
            u = ix + iz
        off = 3 if row % 2 == 1 else 0
        brick = (u + off) // 6
        k = 0.8 + 0.3 * h3(brick, row, axis, 5.0) + 0.1 * n1
        if iy % 3 == 0 or (u + off) % 6 == 0:
            k *= 0.6
    elif m == PILLAR:
        blk = iy // 6
        k = 0.85 + 0.25 * h3(blk, ix // 5, iz // 5, 7.0) + 0.08 * n1
        if iy % 6 == 0:
            k *= 0.62
    elif m == TRIM or m == STEP:
        k = 0.85 + 0.2 * n1
        if axis == 1 and nsgn > 0:
            k *= 1.08
    elif m == CARPET:
        k = 0.85 + 0.15 * n1
        if (ix + iz) % 8 == 0 or (ix - iz) % 8 == 0:
            k *= 0.78
    elif m == WOOD_DARK or m == WOOD or m == CEIL:
        k = 0.78 + 0.22 * h3(iy, (ix + iz) // 3, 0, 9.0) + 0.12 * n1
        if m == WOOD and axis == 2 and nsgn < 0 and px > 186 and px < 202 and abs(pz - 134.0) < 0.02:
            u = (px - 190.5) / 7.0
            v = (FELT_Y + 6.5 - py) / 7.0
            if u >= 0 and u < 1 and v >= 0 and v < 1:
                n = crest_b.shape[0]
                c = crest_b[int(v * n), int(u * n)]
                if c > 0:
                    return goldramp[c, 0], goldramp[c, 1], goldramp[c, 2], 0.0, 0.0, 0.0, 0.8
        if m == WOOD and axis != 1:
            a = math.atan2(px - 160.0, 150.0 - pz) * 88.0 / 5.0
            fa = a - math.floor(a)
            if fa < 0.18:
                k *= 0.55
            elif fa > 0.82:
                k *= 1.18
    elif m == GOLD or m == CROWN or m == CARPET_GOLD:
        k = 0.85 + 0.25 * n1
    elif m == FELT:
        k = 0.9 + 0.1 * h3(math.floor(px * 2), 0, math.floor(pz * 2), 3.0)
        if axis == 1 and nsgn > 0:
            c = tex_felt(px, pz, text1, text2, crest, 160.0, 150.0)
            if c > 0:
                return goldramp[c, 0], goldramp[c, 1], goldramp[c, 2], 0.0, 0.0, 0.0, 0.85
            # darker toward the rim
            rr = math.sqrt((px - 160.0) ** 2 + (pz - 150.0) ** 2)
            k *= 1.08 - 0.25 * (rr / 80.0) ** 2
    elif m == BUMPER:
        k = 0.9 + 0.1 * n1
        a = math.atan2(px - 160.0, 150.0 - pz) * 88.0 / 4.0
        fa = a - math.floor(a)
        if fa < 0.14 and iy >= 25:
            k *= 0.6
    elif m == IRON:
        k = 0.8 + 0.3 * n1
    elif m == FIRE:
        t = h3(ix, iy, iz, 2.0)
        hot = 0.55 + 0.45 * t
        return 0.0, 0.0, 0.0, 6.5 * hot, 2.4 * hot * hot, 0.35 * hot * hot * hot, 0.0
    elif m == FIRE_CORE:
        t = h3(ix, iy, iz, 3.0)
        return 0.0, 0.0, 0.0, 9.0 + 2 * t, 6.5 + 2 * t, 2.4 + t, 0.0
    elif m == GLASS:
        lead = (ix % 3 == 0) or (iy % 4 == 0)
        f = 0.35 if lead else 1.0
        return 0.0, 0.0, 0.0, 2.2 * f, 1.1 * f, 0.38 * f, 0.0
    elif m == BANNER:
        k = 0.85 + 0.12 * n1
        # find banner
        for bi in range(banners.shape[0]):
            bx, bz, by0, by1, bhw = banners[bi, 0], banners[bi, 1], banners[bi, 2], banners[bi, 3], banners[bi, 4]
            if abs(px - bx) <= bhw + 0.01 and py >= by0 - 0.01 and py <= by1 + 0.01:
                if abs(px - bx) > bhw - 1.0 or py > by1 - 2.0:
                    return goldramp[3, 0], goldramp[3, 1], goldramp[3, 2], 0.0, 0.0, 0.0, 0.7
                if py > by1 - 3.5 and py < by1 - 2.6:
                    return goldramp[2, 0], goldramp[2, 1], goldramp[2, 2], 0.0, 0.0, 0.0, 0.5
                if axis == 2:
                    size = 2 * bhw * 0.86
                    u = (px - (bx - size / 2)) / size
                    v = (by1 - 5.0 - py) / size
                    if u >= 0 and u < 1 and v >= 0 and v < 1:
                        n = crest_b.shape[0]
                        c = crest_b[int(v * n), int(u * n)]
                        if c > 0:
                            return goldramp[c, 0], goldramp[c, 1], goldramp[c, 2], 0.0, 0.0, 0.0, 0.8
                break
    elif m == SKIN:
        k = 0.95 + 0.07 * n1
    elif m == BEARD or m == BROW:
        k = 0.8 + 0.35 * n1
    elif m == ROBE or m == ROBE_DARK:
        k = 0.85 + 0.15 * n1
    elif m == FUR:
        k = 0.92 + 0.1 * n1
        if (ix * 7 + iy * 3 + iz * 5) % 29 == 0 and axis != 1:
            k = 0.55
    elif m == GEM_R or m == GEM_G:
        er, eg, eb = r * 0.6, g * 0.6, b * 0.6
    elif m >= CHIP_R and m <= CHIP_Y:
        if axis != 1:
            fy = py - math.floor(py)
            if fy < 0.2 or (0.5 < fy < 0.62):
                k = 0.5
            elif (ix + iz) % 2 == 0 and 0.25 < fy < 0.45:
                r, g, b = matcol[CHIP_C, 0], matcol[CHIP_C, 1], matcol[CHIP_C, 2]
                if m == CHIP_C:
                    r, g, b = matcol[CHIP_R, 0], matcol[CHIP_R, 1], matcol[CHIP_R, 2]
        else:
            k = 0.95 + 0.1 * n1
    elif m == CARD:
        fy = py - math.floor(py)
        k = 0.9 if (axis != 1 and int(fy * 4) % 2 == 0) else 1.0
    elif m == CARDBACK:
        if (ix + iz) % 2 == 0:
            return goldramp[2, 0], goldramp[2, 1], goldramp[2, 2], 0.0, 0.0, 0.0, 0.5
    return r * k, g * k, b * k, er, eg, eb, -1.0


@nb.njit(parallel=True, fastmath=True, cache=True)
def render(W, H, cam, g, lay, stopmask, outmask, lights, text1, text2, crest, crest_b, banners,
           matcol, spec, goldramp, x0, y0, x1, y1, ambient, fog, use_sky, nshadow, nao):
    col = np.zeros((H, W, 3), np.float32)
    alpha = np.zeros((H, W), np.float32)
    depth = np.full((H, W), 1e9, np.float32)
    emis = np.zeros((H, W), np.float32)
    ox, oy, oz = cam[0], cam[1], cam[2]
    fx, fy, fz = cam[3], cam[4], cam[5]
    rx, ry, rz = cam[6], cam[7], cam[8]
    ux, uy, uz = cam[9], cam[10], cam[11]
    tanh = cam[12]
    aspect = W / H
    nl = lights.shape[0]
    for j in nb.prange(y0, y1):
        for i in range(x0, x1):
            sxn = ((i + 0.5) / W * 2 - 1) * tanh * aspect
            syn = (1 - (j + 0.5) / H * 2) * tanh
            dx = fx + rx * sxn + ux * syn
            dy = fy + ry * sxn + uy * syn
            dz = fz + rz * sxn + uz * syn
            ln = math.sqrt(dx * dx + dy * dy + dz * dz)
            dx /= ln; dy /= ln; dz /= ln
            hit, t, ix, iy, iz, axis, sgn = trace(ox, oy, oz, dx, dy, dz, g, lay, stopmask, False, 2000.0)
            tend = t if hit else 600.0
            # glow halos (in-scattering) along the ray
            gr, gg, gb = 0.0, 0.0, 0.0
            if fog[3] > 0:
                step = 1.6
                ts = step * h3(i, j, 1.0, 9.0)
                while ts < tend:
                    qx, qy, qz = ox + dx * ts, oy + dy * ts, oz + dz * ts
                    for li in range(nl):
                        if lights[li, 9] <= 0:
                            continue
                        lx, ly, lz = lights[li, 0] - qx, lights[li, 1] - qy, lights[li, 2] - qz
                        d2 = lx * lx + ly * ly + lz * lz
                        rr = lights[li, 9]
                        if d2 < rr * rr * 9:
                            w = lights[li, 6] * fog[3] / (1.0 + d2 / (rr * rr))
                            gr += lights[li, 3] * w * step
                            gg += lights[li, 4] * w * step
                            gb += lights[li, 5] * w * step
                    ts += step
            if not hit:
                if use_sky:
                    r_, g_, b_ = sky(ox, oy, oz, dx, dy, dz)
                    col[j, i, 0] = r_ + gr
                    col[j, i, 1] = g_ + gg
                    col[j, i, 2] = b_ + gb
                    alpha[j, i] = 1.0
                    emis[j, i] = 1.0
                continue
            m = g[ix, iy, iz]
            if not outmask[lay[ix, iy, iz]]:
                continue
            depth[j, i] = t
            px, py, pz = ox + dx * t, oy + dy * t, oz + dz * t
            nxv, nyv, nzv = 0.0, 0.0, 0.0
            if axis == 0:
                nxv = -sgn
            elif axis == 1:
                nyv = -sgn
            else:
                nzv = -sgn
            ar, ag, ab, er, eg, eb, sp = shade_mat(m, ix, iy, iz, px, py, pz, axis, -sgn,
                                                    text1, text2, crest, crest_b, banners, matcol, goldramp)
            if sp < 0:
                sp = spec[m]
            if er + eg + eb > 0 and ar + ag + ab == 0:
                cr, cg, cb = er, eg, eb
                emis[j, i] = 1.0
            else:
                qx, qy, qz = px + nxv * 0.01, py + nyv * 0.01, pz + nzv * 0.01
                # ambient occlusion
                occ = 0.0
                for s in range(nao):
                    a1 = h3(i, j, s, 21.0) * 2 - 1
                    a2 = h3(i, j, s, 22.0) * 2 - 1
                    a3 = h3(i, j, s, 23.0)
                    vx, vy, vz = a1, a2, a3
                    # orient around normal
                    if axis == 0:
                        vx, vy, vz = a3 * nxv, a1, a2
                    elif axis == 1:
                        vx, vy, vz = a1, a3 * nyv, a2
                    else:
                        vx, vy, vz = a1, a2, a3 * nzv
                    vl = math.sqrt(vx * vx + vy * vy + vz * vz) + 1e-6
                    h_, _, _, _, _, _, _ = trace(qx, qy, qz, vx / vl, vy / vl, vz / vl, g, lay, stopmask, True, 6.0)
                    if h_:
                        occ += 1.0
                ao = 1.0 - 0.75 * occ / max(nao, 1)
                lr = ambient[0] * ao
                lg = ambient[1] * ao
                lb = ambient[2] * ao
                # up-facing surfaces get a touch more ambient
                if nyv > 0:
                    lr *= 1.15; lg *= 1.15; lb *= 1.2
                sr, sg, sb = 0.0, 0.0, 0.0
                for li in range(nl):
                    lx, ly, lz = lights[li, 0] - px, lights[li, 1] - py, lights[li, 2] - pz
                    d = math.sqrt(lx * lx + ly * ly + lz * lz)
                    rad = lights[li, 7]
                    if d > rad or d < 1e-3:
                        continue
                    ndl = (lx * nxv + ly * nyv + lz * nzv) / d
                    if ndl <= 0:
                        continue
                    vis = 0.0
                    sz_ = lights[li, 8]
                    for s in range(nshadow):
                        jx = lights[li, 0] + (h3(i, j, s, 31.0 + li) * 2 - 1) * sz_
                        jy = lights[li, 1] + (h3(i, j, s, 41.0 + li) * 2 - 1) * sz_
                        jz = lights[li, 2] + (h3(i, j, s, 51.0 + li) * 2 - 1) * sz_
                        vx, vy, vz = jx - qx, jy - qy, jz - qz
                        vd = math.sqrt(vx * vx + vy * vy + vz * vz)
                        h_, _, _, _, _, _, _ = trace(qx, qy, qz, vx / vd, vy / vd, vz / vd, g, lay, stopmask, True, vd - 0.8)
                        if not h_:
                            vis += 1.0
                    vis /= nshadow
                    if vis <= 0:
                        continue
                    f = 1.0 - d / rad
                    att = lights[li, 6] * f * f / (1.0 + d * d / 256.0) * vis
                    lr += lights[li, 3] * ndl * att
                    lg += lights[li, 4] * ndl * att
                    lb += lights[li, 5] * ndl * att
                    if sp > 0:
                        # blinn-phong
                        hx_, hy_, hz_ = lx / d - dx, ly / d - dy, lz / d - dz
                        hl = math.sqrt(hx_ * hx_ + hy_ * hy_ + hz_ * hz_) + 1e-6
                        ndh = (hx_ * nxv + hy_ * nyv + hz_ * nzv) / hl
                        if ndh > 0:
                            spv = sp * ndh ** 24 * att * 1.5
                            sr += lights[li, 3] * spv
                            sg += lights[li, 4] * spv
                            sb += lights[li, 5] * spv
                cr = ar * lr + sr * ar * 1.4 + er
                cg = ag * lg + sg * ag * 1.4 + eg
                cb = ab * lb + sb * ab * 1.4 + eb
            # distance fog
            fk = 1.0 - math.exp(-t * fog[4])
            cr = cr * (1 - fk) + fog[0] * fk
            cg = cg * (1 - fk) + fog[1] * fk
            cb = cb * (1 - fk) + fog[2] * fk
            col[j, i, 0] = cr + gr
            col[j, i, 1] = cg + gg
            col[j, i, 2] = cb + gb
            alpha[j, i] = 1.0
    return col, alpha, depth, emis


def camera(pos, target, vfov_deg):
    pos = np.array(pos, float)
    f = np.array(target, float) - pos
    f /= np.linalg.norm(f)
    r = np.cross([0, 1, 0], f)
    r /= np.linalg.norm(r)
    u = np.cross(f, r)
    tanh = math.tan(math.radians(vfov_deg) / 2)
    return np.concatenate([pos, f, r, u, [tanh]])


def project(cam, W, H, p):
    pos, f, r, u, tanh = cam[0:3], cam[3:6], cam[6:9], cam[9:12], cam[12]
    v = np.array(p, float) - pos
    z = v @ f
    sx = (v @ r) / z / (tanh * W / H)
    sy = (v @ u) / z / tanh
    return ((sx + 1) / 2, (1 - sy) / 2)   # fractions of width/height
