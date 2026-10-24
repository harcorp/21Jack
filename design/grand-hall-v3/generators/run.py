"""Render the Grand Hall table scene as parallax layers.
usage: python run.py <outdir> <W> <H> <preset> [layers]"""
import sys, json, math, time
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter, map_coordinates
import scene as S
import render as R
from crest import crest_pixels

FONT = '/tmp/claude-0/-home-claude/9824e459-6c92-5996-b182-a8d40b161154/scratchpad/fonts/PressStart2P-Regular.ttf'

PRESETS = {
    # pos, target, vfov
    'desktop': ((160, 90, -34), (160, 34, 112), 44.0),
    'mobile': ((160, 131.3, -48.9), (160, 20, 110), 46.0),
}


PIXELIFY = '/tmp/claude-0/-home-claude/9824e459-6c92-5996-b182-a8d40b161154/scratchpad/fonts/PixelifySans.ttf'


def text_bitmap(txt):
    f = ImageFont.truetype(PIXELIFY, 16)
    f.set_variation_by_axes([700])
    w = int(f.getlength(txt)) + 4
    im = Image.new('L', (w, 22), 0)
    d = ImageDraw.Draw(im)
    d.text((2, 2), txt, font=f, fill=255)
    a = (np.asarray(im) > 127)[5:19]
    out = np.zeros(a.shape, np.uint8)
    sh = np.zeros_like(a)
    sh[1:, :] = a[:-1, :]
    out[sh & ~a] = 2
    out[a] = 1
    return out


def lights_array(sc):
    L = np.array(sc.lights, float)
    L[:, 6] *= 0.16
    # scale intensities to working units
    L[:, 6] *= 0.11
    return L


def aces(x):
    return np.clip((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0, 1)


def lin2srgb(c):
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055)


def grade(rgb):
    l = rgb.mean(axis=2, keepdims=True)
    rgb = rgb + (1 - l) ** 2 * np.array([-0.012, 0.0, 0.03]) + l ** 2 * np.array([0.03, 0.008, -0.025])
    return np.clip(rgb, 0, 1)


def finish(col, alpha, emis, depth, exposure=1.0, bloom=0.55, dof=None, halo=False):
    hdr = col * exposure
    lum = hdr.mean(axis=2)
    bright = np.clip(lum - 0.9, 0, None)[..., None] * hdr / np.maximum(lum, 1e-4)[..., None]
    b = gaussian_filter(bright, (2, 2, 0)) * 0.6 + gaussian_filter(bright, (7, 7, 0)) * 0.6
    out = hdr + b * bloom
    if dof is not None:
        d0, d1, sig = dof
        blur = gaussian_filter(out, (sig, sig, 0))
        k = np.clip((depth - d0) / (d1 - d0), 0, 1)[..., None]
        out = out * (1 - k) + blur * k
    rgb = grade(lin2srgb(aces(out)))
    a = alpha.copy()
    if halo:
        # bloom outside the solid pixels becomes a translucent glow
        gl = aces(b * bloom * 1.2).max(axis=2)
        a = np.maximum(a, np.clip(gl * 1.4, 0, 0.85))
        tint = lin2srgb(aces(b * bloom * 1.2 / np.maximum(gl[..., None], 1e-4)))
        rgb = np.where(alpha[..., None] > 0, rgb, np.clip(tint, 0, 1))
    return np.dstack([rgb, a])


def save(rgba, path):
    Image.fromarray((np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(path, optimize=True)


def main():
    out = sys.argv[1]
    W, H = int(sys.argv[2]), int(sys.argv[3])
    preset = sys.argv[4]
    layers = sys.argv[5].split(',') if len(sys.argv) > 5 else ['far', 'table', 'king', 'fg']
    nshadow = 3 if W >= 500 else 1
    nao = 10 if W >= 500 else 3
    t0 = time.time()
    sc = S.build('idle')
    pos, tgt, fov = PRESETS[preset]
    cam = R.camera(pos, tgt, fov)
    lights = lights_array(sc)
    t1 = text_bitmap('BLACKJACK  PAYS  1  TO  1')
    t2 = text_bitmap('DEALER  STANDS  ON  ALL  17')
    crest = crest_pixels(48, ring=True).astype(np.int64)
    crest_b = crest_pixels(48, ring=False).astype(np.int64)
    banners = np.array(sc.banners, float)
    amb = np.array([0.075, 0.07, 0.115])
    fog = np.array([0.020, 0.012, 0.018, 0.0016, 0.0016])
    LM = {'far': 0, 'table': 1, 'king': 2, 'fg': 3}
    res = {}
    for name in layers:
        stop = np.zeros(4, np.bool_)
        outm = np.zeros(4, np.bool_)
        if name == 'far':
            stop[0] = True; outm[0] = True
        elif name == 'table':
            stop[1] = True; outm[1] = True
        elif name == 'king':
            stop[1] = True; stop[2] = True; outm[2] = True
        elif name == 'fg':
            stop[3] = True; outm[3] = True
        elif name == 'all':
            stop[:] = True; outm[:] = True
        use_sky = name in ('far', 'all')
        col, alpha, depth, emis = R.render(W, H, cam, sc.g, sc.l, stop, outm, lights, t1, t2, crest, crest_b,
                                           banners, R.MATCOL, R.SPEC, R.GOLDRAMP, 0, 0, W, H, amb, fog,
                                           use_sky, nshadow, nao)
        dof = (230.0, 330.0, 1.1 * W / 720) if name == 'far' else None
        rgba = finish(col, alpha, emis, depth, exposure=1.5, dof=dof, halo=(name in ('fg',)))
        save(rgba, f'{out}/{preset}-{name}.png')
        res[name] = rgba
        print(name, f'{time.time() - t0:.1f}s', flush=True)
    # composite preview
    if all(k in res for k in ('far', 'table', 'king', 'fg')):
        comp = res['far'][..., :3].copy()
        for k in ('table', 'king', 'fg'):
            a = res[k][..., 3:4]
            comp = comp * (1 - a) + res[k][..., :3] * a
        im = Image.fromarray((comp * 255).astype(np.uint8))
        im.save(f'{out}/{preset}-composite.png')
        im.resize((W * 2, H * 2), Image.NEAREST).save(f'{out}/{preset}-composite@2x.png')
    # anchors
    anch = {k: [round(v * 100, 2) for v in R.project(cam, W, H, p)] for k, p in sc.anchors.items()}
    for i, l in enumerate(sc.lights):
        if l[7] < 100:
            anch[f'light{i}'] = [round(v * 100, 2) for v in R.project(cam, W, H, l[:3])]
    json.dump(anch, open(f'{out}/{preset}-anchors.json', 'w'), indent=1)
    print('done', f'{time.time() - t0:.1f}s')


if __name__ == '__main__':
    main()
