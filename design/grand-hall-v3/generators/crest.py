"""House Flamingo crest: an original gold flamingo-dragon, drawn as vector parts
and reduced to pixel art. Produces masks the renderer can map onto voxels and
PNG sprites for the UI."""
import math
import numpy as np
from PIL import Image, ImageDraw
from palette import GOLD, hx

S = 768  # vector canvas


def bez(p0, p1, p2, p3, n=60):
    pts = []
    for i in range(n + 1):
        t = i / n
        a = (1 - t) ** 3
        b = 3 * (1 - t) ** 2 * t
        c = 3 * (1 - t) * t ** 2
        d = t ** 3
        pts.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
                    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return pts


def thick(draw, pts, w0, w1, fill=255):
    n = len(pts)
    for i, (x, y) in enumerate(pts):
        w = w0 + (w1 - w0) * i / max(1, n - 1)
        draw.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=fill)


def sc(pts, k=S / 512):
    return [(x * k, y * k) for x, y in pts]


def parts():
    """Return dict part -> L mask at S x S."""
    P = {}

    def new():
        im = Image.new('L', (S, S), 0)
        return im, ImageDraw.Draw(im)

    k = S / 512
    # body
    im, d = new()
    cx, cy, rx, ry = 292, 296, 92, 56
    poly = []
    for i in range(72):
        a = 2 * math.pi * i / 72
        x = rx * math.cos(a)
        y = ry * math.sin(a)
        r = math.radians(-14)
        poly.append((cx + x * math.cos(r) - y * math.sin(r), cy + x * math.sin(r) + y * math.cos(r)))
    d.polygon(sc(poly), fill=255)
    # neck (S-curve) + head
    thick(d, sc(bez((224, 282), (132, 240), (270, 170), (186, 112))), 58 * k, 42 * k)
    d.ellipse([(186 - 38) * k, (100 - 36) * k, (186 + 36) * k, (100 + 33) * k], fill=255)
    P['body'] = im

    # beak: bent flamingo beak with a dragon hook
    im, d = new()
    d.polygon(sc([(158, 82), (100, 92), (78, 116), (90, 156), (110, 128), (156, 124)]), fill=255)
    P['beak'] = im

    # horns swept back
    im, d = new()
    d.polygon(sc([(194, 70), (276, 40), (222, 100)]), fill=255)
    d.polygon(sc([(172, 70), (240, 14), (206, 86)]), fill=255)
    P['horn'] = im

    # wing: dragon wing raised behind
    im, d = new()
    wing = [(276, 262), (334, 136), (418, 36), (424, 104), (466, 112), (444, 168), (486, 196),
            (438, 222), (454, 268), (380, 274)]
    d.polygon(sc(wing), fill=255)
    P['wing'] = im
    im, d = new()
    for tip in [(424, 104), (466, 112), (486, 196), (454, 268)]:
        d.line(sc([(334, 136), tip]), fill=255, width=int(9 * k))
    d.line(sc([(276, 262), (334, 136), (418, 36)]), fill=255, width=int(14 * k))
    P['bone'] = im

    # tail: curling dragon tail ending in a spade
    im, d = new()
    t = bez((366, 314), (474, 318), (506, 424), (446, 456), 50)
    t += bez((446, 456), (394, 482), (366, 420), (416, 404), 40)[1:]
    thick(d, sc(t), 40 * k, 16 * k)
    d.polygon(sc([(404, 380), (446, 400), (410, 428), (416, 404)]), fill=255)
    P['tail'] = im

    # legs: one straight, one folded
    im, d = new()
    d.line(sc([(290, 336), (290, 466)]), fill=255, width=int(20 * k))
    for tx in [(244, 492), (290, 496), (336, 492)]:
        d.line(sc([(290, 464), tx]), fill=255, width=int(14 * k))
    P['leg'] = im

    # eye
    im, d = new()
    d.ellipse(sc([(170, 92), (186, 108)]), fill=255)
    P['eye'] = im
    return P


def ring_mask(n, inner=0.83, outer=0.97):
    yy, xx = np.mgrid[0:n, 0:n] + 0.5
    r = np.hypot(xx - n / 2, yy - n / 2) / (n / 2)
    return (r >= inner) & (r <= outer)


def reduce(mask_img, n, thr=0.42):
    a = np.asarray(mask_img.resize((n, n), Image.BOX), dtype=np.float32) / 255
    return a > thr


def crest_pixels(n=48, ring=False):
    """Return an (n, n) int array: 0 empty, 1 outline, 2 dark, 3 gold, 4 light, 5 mid (wing)."""
    P = parts()
    pad = 0.17 if ring else 0.02
    # shrink drawing into the ring
    def fit(im):
        s = int(S * (1 - 2 * pad))
        out = Image.new('L', (S, S), 0)
        out.paste(im.resize((s, s), Image.LANCZOS), (int(S * pad), int(S * pad)))
        return out
    m = {k: reduce(fit(v), n) for k, v in P.items()}
    solid = m['body'] | m['beak'] | m['horn'] | m['wing'] | m['tail'] | m['leg']
    if ring:
        solid |= ring_mask(n)
    out = np.zeros((n, n), np.int8)
    out[solid] = 3
    out[m['wing'] & ~m['body']] = 5
    out[m['bone'] & m['wing'] & ~m['body']] = 2
    out[m['beak'] & ~m['body']] = 2
    out[m['horn']] = 4
    # outline: solid pixels touching empty
    pad_s = np.pad(solid, 1)
    edge = np.zeros_like(solid)
    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        edge |= ~pad_s[1 + dy:1 + dy + n, 1 + dx:1 + dx + n]
    edge &= solid
    # highlight: top-left exposure
    hl = solid & ~pad_s[0:n, 1:n + 1] & ~edge
    out[hl & (out == 3)] = 4
    out[edge] = 1
    out[m['eye'] & solid] = 1
    if ring:
        rm = ring_mask(n)
        inner = ring_mask(n, 0.86, 0.94)
        out[rm] = 1
        out[inner] = 3
    return out


GOLD_RAMP = {1: hx(GOLD[0]), 2: hx(GOLD[1]), 3: hx(GOLD[3]), 4: hx(GOLD[4]), 5: hx(GOLD[2])}


def to_rgba(px, ramp=GOLD_RAMP):
    n = px.shape[0]
    img = np.zeros((n, n, 4), np.uint8)
    for k, c in ramp.items():
        img[px == k, :3] = c
        img[px == k, 3] = 255
    return Image.fromarray(img, 'RGBA')


if __name__ == '__main__':
    import sys
    out = sys.argv[1]
    for n, ring in [(48, False), (48, True), (32, False), (64, True), (64, False)]:
        px = crest_pixels(n, ring)
        im = to_rgba(px)
        tag = f"crest-{'ring-' if ring else ''}{n}"
        im.save(f"{out}/{tag}.png")
        im.resize((n * 8, n * 8), Image.NEAREST).save(f"{out}/{tag}@8x.png")
    print('ok')
