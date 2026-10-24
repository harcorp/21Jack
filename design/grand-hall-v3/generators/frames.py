"""Render the king's animation frames into a sprite sheet cropped to his bounding box."""
import sys, json
import numpy as np
from PIL import Image
import scene as S
import render as R
from run import PRESETS, lights_array, text_bitmap, finish, save
from crest import crest_pixels

out, W, H, preset = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
frames = ['idle', 'breath', 'blink', 'smug', 'grimace']
base = np.asarray(Image.open(f'{out}/{preset}-king.png'))[..., 3]
ys, xs = np.nonzero(base)
pad = int(W * 0.012)
x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad + 1)
y0, y1 = max(0, ys.min() - pad * 2), min(H, ys.max() + pad + 1)
pos, tgt, fov = PRESETS[preset]
cam = R.camera(pos, tgt, fov)
t1 = text_bitmap('BLACKJACK  PAYS  1  TO  1')
t2 = text_bitmap('DEALER  STANDS  ON  ALL  17')
crest = crest_pixels(48, ring=True).astype(np.int64)
crest_b = crest_pixels(48, ring=False).astype(np.int64)
amb = np.array([0.075, 0.07, 0.115])
fog = np.array([0.020, 0.012, 0.018, 0.0016, 0.0016])
stop = np.array([False, True, True, False])
outm = np.array([False, False, True, False])
tiles = []
for fr in frames:
    sc = S.build(fr)
    col, alpha, depth, emis = R.render(W, H, cam, sc.g, sc.l, stop, outm, lights_array(sc), t1, t2, crest, crest_b,
                                       np.array(sc.banners, float), R.MATCOL, R.SPEC, R.GOLDRAMP, x0, y0, x1, y1,
                                       amb, fog, False, 3, 10)
    rgba = finish(col, alpha, emis, depth, exposure=1.5)
    tile = rgba[y0:y1, x0:x1]
    save(tile, f'{out}/{preset}-king-{fr}.png')
    tiles.append(tile)
    print(fr, flush=True)
sheet = np.concatenate(tiles, axis=1)
save(sheet, f'{out}/{preset}-king-sheet.png')
meta = {'frames': frames, 'frameW': int(x1 - x0), 'frameH': int(y1 - y0),
        'left%': round(x0 / W * 100, 3), 'top%': round(y0 / H * 100, 3),
        'width%': round((x1 - x0) / W * 100, 3), 'height%': round((y1 - y0) / H * 100, 3)}
json.dump(meta, open(f'{out}/{preset}-king-sheet.json', 'w'), indent=1)
print(meta)
