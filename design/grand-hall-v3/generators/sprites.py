"""Original pixel sprites for Grand Hall: 12 chibi avatars, the king portrait, coin, hearts,
suit pips and UI icons (as SVG path data)."""
import json, sys
import numpy as np
from PIL import Image

OUT = sys.argv[1]
OUTLINE = '#1A1014'
SKINS = ['#F2C9A0', '#E3A57C', '#C98A5E', '#9A6240', '#6B4128']


def hx(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def shade(h, k):
    r, g, b = hx(h)
    if k < 1:
        return '#%02X%02X%02X' % (int(r * k), int(g * k), int(b * k))
    return '#%02X%02X%02X' % (min(255, int(r + (255 - r) * (k - 1))), min(255, int(g + (255 - g) * (k - 1))),
                               min(255, int(b + (255 - b) * (k - 1))))


class Px:
    def __init__(self, n=32):
        self.n = n
        self.c = [[None] * n for _ in range(n)]

    def p(self, x, y, col):
        if 0 <= x < self.n and 0 <= y < self.n:
            self.c[y][x] = col

    def rect(self, x0, y0, x1, y1, col):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.p(x, y, col)

    def rows(self, spans, col):
        for y, (a, b) in spans.items():
            for x in range(a, b + 1):
                self.p(x, y, col)

    def disc(self, cx, cy, r, col):
        for y in range(self.n):
            for x in range(self.n):
                if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                    self.p(x, y, col)

    def get(self, x, y):
        if 0 <= x < self.n and 0 <= y < self.n:
            return self.c[y][x]
        return None

    def outline(self, col=OUTLINE):
        add = []
        for y in range(self.n):
            for x in range(self.n):
                if self.c[y][x] is None and any(self.get(x + dx, y + dy) not in (None,) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    add.append((x, y))
        for x, y in add:
            self.c[y][x] = col

    def img(self):
        a = np.zeros((self.n, self.n, 4), np.uint8)
        for y in range(self.n):
            for x in range(self.n):
                if self.c[y][x]:
                    a[y, x, :3] = hx(self.c[y][x])
                    a[y, x, 3] = 255
        return Image.fromarray(a, 'RGBA')


HEAD = {6: (11, 20), 7: (9, 22), **{y: (8, 23) for y in range(8, 20)}, 20: (9, 22), 21: (10, 21), 22: (12, 19)}


def body(pc, cloth, collar, trim=None):
    for y in range(23, 32):
        w = 8 + (y - 23)
        pc.rect(16 - w, y, 15 + w, y, cloth)
    # shoulder shading
    for y in range(25, 32):
        pc.p(16 + 8 + (y - 23) - 1, y, shade(cloth, 0.75))
    # collar V
    for i in range(4):
        pc.p(14 - 0 + i // 2, 23 + i, collar)
        pc.p(17 - i // 2, 23 + i, collar)
    pc.rect(13, 23, 18, 23, collar)
    if trim:
        pc.rect(4, 31, 27, 31, trim)


def face(pc, skin, eye='#1A1014', mouth='smile', brow=None):
    pc.rows(HEAD, skin)
    sh = shade(skin, 0.82)
    for y in range(9, 20):
        pc.p(23, y, sh)
    pc.rows({20: (19, 22), 21: (18, 21), 22: (16, 19)}, sh)
    pc.rect(14, 22, 17, 23, sh)  # neck
    # eyes
    for ex in (11, 19):
        pc.rect(ex, 14, ex + 1, 16, eye)
        pc.p(ex, 14, '#FFFFFF')
    # blush
    pc.rect(10, 17, 11, 17, '#E8857A')
    pc.rect(20, 17, 21, 17, '#E8857A')
    if mouth == 'smile':
        pc.p(14, 18, '#7A2E2E'); pc.rect(15, 19, 16, 19, '#7A2E2E'); pc.p(17, 18, '#7A2E2E')
    elif mouth == 'flat':
        pc.rect(15, 19, 16, 19, '#7A2E2E')
    elif mouth == 'grin':
        pc.rect(14, 18, 17, 18, '#7A2E2E'); pc.rect(15, 19, 16, 19, '#FFFFFF')
    if brow:
        pc.rect(10, 12, 12, 12, brow)
        pc.rect(19, 12, 21, 12, brow)


def hair_short(pc, col, fringe=True):
    hl = shade(col, 1.25)
    pc.rows({4: (11, 20), 5: (9, 22), 6: (8, 23), 7: (7, 24), 8: (7, 24), 9: (7, 24), 10: (7, 9), 11: (7, 8),
             12: (7, 8), 13: (7, 8)}, col)
    pc.rows({10: (22, 24), 11: (23, 24), 12: (23, 24), 13: (23, 24)}, col)
    if fringe:
        for x in range(10, 22):
            if x % 3 != 1:
                pc.p(x, 10, col)
        pc.p(10, 11, col); pc.p(13, 11, col); pc.p(18, 11, col); pc.p(21, 11, col)
    pc.rect(11, 5, 15, 5, hl)
    pc.rect(9, 6, 11, 6, hl)


def hair_long(pc, col):
    hair_short(pc, col)
    for y in range(14, 25):
        pc.rect(6, y, 8, y, col)
        pc.rect(23, y, 25, y, col)
    pc.p(7, 25, col); pc.p(24, 25, col)


def hair_curly(pc, col):
    hl = shade(col, 1.2)
    for cx, cy in [(10, 7), (14, 5), (18, 5), (22, 7), (8, 10), (24, 10), (12, 6), (20, 6), (16, 4)]:
        pc.disc(cx, cy, 2.6, col)
    for cx, cy in [(8, 13), (24, 13)]:
        pc.disc(cx, cy, 2.0, col)
    for x, y in [(13, 3), (17, 3), (9, 6), (21, 5)]:
        pc.p(x, y, hl)


def ponytail(pc, col):
    for y in range(9, 23):
        w = 2 if y < 18 else 1
        pc.rect(25, y, 25 + w, y, col)
    pc.rect(24, 8, 26, 9, '#C8902A')


def braids(pc, col, band):
    for x0 in (6, 24):
        for y in range(13, 28):
            pc.rect(x0, y, x0 + 1, y, col if (y // 2) % 2 == 0 else shade(col, 1.25))
        pc.rect(x0, 25, x0 + 1, 25, band)


def bun(pc, col):
    pc.disc(16, 3, 3.2, col)
    pc.p(15, 1, shade(col, 1.3))


def hood(pc, col, inner):
    for y in range(3, 26):
        a = 7 if y < 6 else 5
        if y == 3:
            pc.rect(11, y, 20, y, col)
        elif y == 4:
            pc.rect(9, y, 22, y, col)
        elif y == 5:
            pc.rect(7, y, 24, y, col)
        else:
            pc.rect(5, y, 26, y, col)
    pc.rows({8: (11, 20)}, inner)
    for y in range(9, 23):
        pc.p(8, y, inner); pc.p(23, y, inner)
    pc.p(9, 9, inner); pc.p(22, 9, inner)
    pc.rect(6, 7, 7, 25, shade(col, 0.75))


def helmet(pc, metal, plume):
    hi = shade(metal, 1.3)
    lo = shade(metal, 0.7)
    pc.rows({3: (11, 20), 4: (9, 22), 5: (8, 23), 6: (7, 24), 7: (7, 24), 8: (7, 24), 9: (7, 24), 10: (7, 24),
             11: (7, 24)}, metal)
    for y in range(12, 21):
        pc.rect(7, y, 9, y, metal)
        pc.rect(22, y, 24, y, lo)
    pc.rect(15, 10, 16, 15, lo)      # nose guard
    pc.rect(10, 4, 14, 4, hi)
    pc.rect(8, 6, 9, 9, hi)
    pc.rect(7, 11, 24, 11, lo)
    # plume
    for i, y in enumerate(range(0, 4)):
        pc.rect(15 - i, y, 17 + i, y, plume)
    pc.rect(16, 0, 16, 0, shade(plume, 1.3))


def wizard_hat(pc, col, band):
    pc.rect(4, 9, 27, 10, col)
    pc.rect(5, 11, 26, 11, shade(col, 0.7))
    for y in range(0, 9):
        a = 12 + (8 - y) * 0 - (y // 2) + 4 - 4
        half = 2 + y
        pc.rect(16 - half // 1 + (0 if y > 2 else 1), y, 16 + half - 1, y, col)
    pc.p(20, 0, col); pc.p(21, 0, col); pc.p(22, 1, col)
    pc.rect(9, 8, 22, 8, band)
    pc.p(15, 5, '#FFE08A'); pc.p(13, 6, '#FFE08A'); pc.p(18, 3, '#FFE08A')


def feathered_cap(pc, col, feather):
    pc.rows({4: (10, 21), 5: (8, 23), 6: (7, 24), 7: (7, 24), 8: (6, 25), 9: (6, 25)}, col)
    pc.rect(6, 9, 25, 9, shade(col, 0.7))
    for i in range(7):
        pc.p(22 + i // 2, 7 - i, feather)
        pc.p(23 + i // 2, 7 - i, shade(feather, 1.2))


def bandana(pc, col):
    pc.rows({6: (9, 22), 7: (8, 23), 8: (7, 24), 9: (7, 24)}, col)
    for y in range(6, 10):
        if y % 2 == 0:
            for x in range(8, 24, 3):
                pc.p(x, y, '#EFE3C8')
    pc.rect(24, 9, 26, 10, col); pc.rect(25, 11, 27, 12, col)


def circlet(pc, gold='#E8B53A', gem='#2EC27E'):
    pc.rect(8, 9, 23, 9, gold)
    pc.p(15, 8, gold); pc.p(16, 8, gold)
    pc.p(15, 9, gem); pc.p(16, 9, gem)


def jester(pc, a, b):
    pc.rows({5: (9, 22), 6: (8, 23), 7: (7, 24), 8: (7, 24), 9: (7, 24)}, a)
    pc.rect(16, 5, 24, 9, b)
    for i in range(6):
        pc.rect(4 + i, 4 - i // 2, 6 + i, 5 - i // 2, a)
        pc.rect(22 + i // 1 - 0, 2 + i // 2, 24 + i, 3 + i // 2, b)
    pc.disc(3.5, 2.5, 1.6, '#E8B53A')
    pc.disc(29.5, 6.5, 1.6, '#E8B53A')
    pc.rect(7, 9, 24, 9, '#E8B53A')


def beard(pc, col, full=True):
    rows = {18: (9, 10), 19: (9, 11), 20: (9, 22), 21: (10, 21), 22: (11, 20), 23: (12, 19), 24: (14, 17)} if full else \
        {20: (12, 19), 21: (13, 18), 22: (14, 17)}
    pc.rows(rows, col)
    if full:
        pc.rows({18: (21, 22), 19: (20, 22)}, col)
        pc.rect(14, 19, 17, 19, col)
        pc.rect(15, 20, 16, 20, '#7A2E2E')


def mask(pc, col):
    pc.rect(8, 13, 23, 17, col)
    for ex in (11, 19):
        pc.rect(ex, 14, ex + 1, 16, '#1A1014')
        pc.p(ex, 14, '#FFFFFF')


AVATARS = [
    # id, name, skin, cloth, collar
    ('squire', 'Squire', 1, '#1A6340', '#EFE3C8'),
    ('archer', 'Archer', 0, '#2C5A2E', '#C8902A'),
    ('mage', 'Mage', 3, '#3B2A6E', '#E8B53A'),
    ('knight', 'Knight', 2, '#7E1622', '#C8902A'),
    ('bard', 'Bard', 4, '#C2410C', '#EFE3C8'),
    ('smith', 'Smith', 2, '#4A3A30', '#96602F'),
    ('healer', 'Healer', 0, '#EFE3C8', '#E8B53A'),
    ('rogue', 'Rogue', 3, '#26232B', '#7E1622'),
    ('noble', 'Noble', 1, '#5C0F18', '#E8B53A'),
    ('ranger', 'Ranger', 4, '#1E5A5A', '#C8902A'),
    ('monk', 'Monk', 2, '#E07A1A', '#7A2A06'),
    ('jester', 'Jester', 1, '#A11F2D', '#E8B53A'),
]


def avatar(i):
    key, name, si, cloth, collar = AVATARS[i]
    skin = SKINS[si]
    pc = Px(32)
    body(pc, cloth, collar)
    if key == 'squire':
        face(pc, skin, brow='#5A3318'); hair_short(pc, '#784622')
    elif key == 'archer':
        face(pc, skin, brow='#A0401A'); hair_short(pc, '#C2501E'); ponytail(pc, '#C2501E')
        pc.rect(4, 26, 6, 31, '#5A3318')  # bow strap
    elif key == 'mage':
        face(pc, skin, mouth='flat', brow='#E6E2EE'); beard(pc, '#E6E2EE', full=True); wizard_hat(pc, '#3B2A6E', '#E8B53A')
    elif key == 'knight':
        face(pc, skin, mouth='flat'); helmet(pc, '#8A8F99', '#C4323F')
    elif key == 'bard':
        face(pc, skin, mouth='grin'); hair_curly(pc, '#1E1612'); feathered_cap(pc, '#2D7A4A', '#F07A1A')
    elif key == 'smith':
        face(pc, skin, mouth='flat', brow='#2A1A12'); bandana(pc, '#A11F2D'); beard(pc, '#2A1A12')
    elif key == 'healer':
        hood(pc, '#EFE3C8', '#D9CBAE'); face(pc, skin)
        pc.rows({8: (10, 21), 9: (9, 22), 10: (9, 12)}, '#E8C46A'); pc.rows({10: (19, 22)}, '#E8C46A')
        for y in range(11, 21):
            pc.p(9, y, '#E8C46A'); pc.p(22, y, '#E8C46A')
        pc.rect(12, 8, 15, 8, '#F6DE9A')
    elif key == 'rogue':
        hood(pc, '#2B2A30', '#1A1014'); face(pc, skin); mask(pc, '#4A1414')
        pc.rows({8: (9, 22), 9: (9, 22)}, '#1A1014')
    elif key == 'noble':
        face(pc, skin, brow='#B8BCC8'); hair_short(pc, '#C9CDD6', fringe=False); bun(pc, '#C9CDD6'); circlet(pc)
    elif key == 'ranger':
        face(pc, skin, brow='#1A1014'); hair_short(pc, '#1E1612'); braids(pc, '#1E1612', '#E8B53A')
        pc.rect(4, 24, 27, 25, '#145032')
    elif key == 'monk':
        face(pc, skin, mouth='smile'); pc.rect(15, 7, 16, 8, '#C8902A')
        pc.rect(4, 26, 27, 26, '#7A2A06')
    elif key == 'jester':
        face(pc, skin, mouth='grin'); jester(pc, '#A11F2D', '#E8B53A')
    pc.outline()
    return key, name, pc.img()


def king_portrait():
    pc = Px(32)
    body(pc, '#A11F2D', '#EFE3C8')
    pc.rect(4, 23, 27, 25, '#EFE3C8')            # fur mantle
    for x in range(5, 27, 4):
        pc.p(x, 24, '#26232B')
    face(pc, SKINS[1], mouth='flat', brow='#5A2A12')
    pc.rect(8, 9, 9, 18, '#7E4626'); pc.rect(22, 9, 23, 18, '#7E4626')
    beard(pc, '#7E4626')
    pc.rect(13, 18, 18, 18, '#7E4626')           # moustache
    pc.rect(15, 20, 16, 20, '#2A0A0A')
    # crown
    pc.rect(8, 6, 23, 9, '#E8B53A')
    pc.rect(8, 9, 23, 9, '#C8902A')
    for x in (8, 12, 15, 19, 23):
        pc.rect(x, 2 if x == 15 else 3, x + (1 if x == 15 else 0), 5, '#E8B53A')
    pc.p(15, 1, '#E02040'); pc.p(16, 1, '#E02040')
    pc.p(11, 7, '#2EC27E'); pc.rect(15, 7, 16, 7, '#E02040'); pc.p(20, 7, '#2EC27E')
    pc.rect(9, 6, 12, 6, '#FFE08A')
    pc.outline()
    return pc.img()


def coin(n=16):
    pc = Px(n)
    c = n / 2
    pc.disc(c, c, n / 2 - 1, '#8A5A14')
    pc.disc(c, c, n / 2 - 2, '#E8B53A')
    pc.disc(c, c, n / 2 - 4, '#C8902A')
    pc.disc(c - 0.5, c - 0.5, n / 2 - 5, '#E8B53A')
    # simple embossed crown mark
    pc.rect(5, 6, 10, 9, '#8A5A14') if n == 16 else None
    pc.p(5, 5, '#8A5A14'); pc.p(8, 5, '#8A5A14'); pc.p(7, 4, '#8A5A14') if n == 16 else None
    pc.p(10, 5, '#8A5A14')
    pc.rect(4, 3, 5, 3, '#FFE08A'); pc.p(3, 4, '#FFE08A')
    pc.outline('#4A2C0A')
    return pc.img()


HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...']


def heart(full=True):
    pc = Px(9)
    for y, row in enumerate(HEART):
        for x, ch in enumerate(row):
            if ch == '#':
                pc.p(x + 1, y + 1, '#C4323F' if full else '#38333D')
    if full:
        pc.p(2, 2, '#FFB3BC'); pc.p(3, 2, '#E0566A')
    pc.outline('#1A1014')
    return pc.img()


# 7x7 suit pips + 12x12 UI icons, emitted as SVG path data (1 unit = 1 pixel)
PIPS = {
    'spade': ['...#...', '..###..', '.#####.', '#######', '#######', '.#.#.#.', '..###..'],
    'heart': ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
    'diamond': ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
    'club': ['..###..', '..###..', '##.#.##', '#######', '##.#.##', '...#...', '..###..'],
}
ICONS = {
    'menu': ['............', '############', '############', '............', '............', '############',
             '############', '............', '............', '############', '############', '............'],
    'close': ['##........##', '###......###', '.###....###.', '..###..###..', '...######...', '....####....',
              '....####....', '...######...', '..###..###..', '.###....###.', '###......###', '##........##'],
    'plus': ['.....##.....'] * 5 + ['############'] * 2 + ['.....##.....'] * 5,
    'back': ['.....##.....', '....##......', '...##.......', '..##........', '.##.........', '############',
             '############', '.##.........', '..##........', '...##.......', '....##......', '.....##.....'],
    'sound': ['.....##.....', '....###.....', '...####..#..', '######...#..', '######.#..#.', '######.#..#.',
              '######.#..#.', '######.#..#.', '######...#..', '...####..#..', '....###.....', '.....##.....'],
    'mute': ['.....##.....', '....###.....', '...####.....', '######..#..#', '######...##.', '######...##.',
             '######..#..#', '######......', '######......', '...####.....', '....###.....', '.....##.....'],
    'eye': ['............', '............', '....####....', '..########..', '.###....###.', '###..##..###',
            '###..##..###', '.###....###.', '..########..', '....####....', '............', '............'],
    'nosignal': ['............', '....####....', '..##....##..', '.#........#.', '...######...', '..#......#..',
                 '.....##.....', '....#..#....', '............', '.....##.....', '.....##.....', '............'],
    'crown': ['............', '#....##....#', '##..####..##', '##.######.##', '############', '############',
              '############', '############', '############', '............', '############', '############'],
    'lock': ['....####....', '...##..##...', '...#....#...', '...#....#...', '.##########.', '.##########.',
             '.####..####.', '.####..####.', '.#####.####.', '.##########.', '.##########.', '............'],
    'user': ['....####....', '...######...', '...######...', '...######...', '....####....', '............',
             '..########..', '.##########.', '############', '############', '############', '............'],
    'chest': ['............', '.##########.', '#....##....#', '#....##....#', '############', '#####..#####',
              '#####..#####', '#..........#', '#..........#', '#..........#', '############', '............'],
    'scroll': ['.#########..', '#.#......#..', '#.#......#..', '.##.####.#..', '..#......#..', '..#.####.#..',
               '..#......#..', '..#.###..#..', '..#......#..', '..#########.', '..#.......#.', '...########.'],
    'refresh': ['....####.#..', '..##....##..', '.#.....###..', '.#..........', '#...........', '#..........#',
                '#..........#', '...........#', '..........#.', '..###.....#.', '..##....##..', '..#.####....'],
    'info': ['....####....', '..########..', '.####..####.', '.##########.', '#####..#####', '#####..#####',
             '#####..#####', '#####..#####', '.####..####.', '.##########.', '..########..', '....####....'],
    'check': ['............', '..........##', '.........###', '........###.', '.......###..', '##....###...',
              '###..###....', '.#####......', '..###.......', '...#........', '............', '............'],
    'swords': ['##........##', '###......###', '.###....###.', '..###..###..', '...######...', '....####....',
               '...######...', '..###..###..', '.##......##.', '###......###', '##........##', '............'],
    'logout': ['######......', '#....#......', '#....#..#...', '#....#..##..', '#..#########', '#..#########',
               '#....#..##..', '#....#..#...', '#....#......', '#....#......', '######......', '............'],
    'door': ['..########..', '.#........#.', '.#........#.', '.#........#.', '.#........#.', '.#......#.#.',
             '.#......#.#.', '.#........#.', '.#........#.', '.#........#.', '.#........#.', '############'],
}


def path_d(grid):
    d = []
    for y, row in enumerate(grid):
        x = 0
        while x < len(row):
            if row[x] == '#':
                s = x
                while x < len(row) and row[x] == '#':
                    x += 1
                d.append(f'M{s} {y}h{x - s}v1h{s - x}z')
            else:
                x += 1
    return ''.join(d)


if __name__ == '__main__':
    meta = {'avatars': []}
    sheet = Image.new('RGBA', (32 * 12, 32))
    for i in range(12):
        key, name, im = avatar(i)
        im.save(f'{OUT}/avatar-{i + 1:02d}-{key}.png')
        sheet.paste(im, (32 * i, 0))
        meta['avatars'].append({'id': i + 1, 'key': key, 'name': name, 'file': f'avatar-{i + 1:02d}-{key}.png'})
    sheet.save(f'{OUT}/avatars-sheet.png')
    sheet.resize((32 * 12 * 6, 32 * 6), Image.NEAREST).save(f'{OUT}/avatars-sheet@6x.png')
    king_portrait().save(f'{OUT}/king-portrait.png')
    king_portrait().resize((256, 256), Image.NEAREST).save(f'{OUT}/king-portrait@8x.png')
    coin().save(f'{OUT}/coin-16.png')
    coin().resize((128, 128), Image.NEAREST).save(f'{OUT}/coin@8x.png')
    heart(True).save(f'{OUT}/heart-full.png')
    heart(False).save(f'{OUT}/heart-empty.png')
    meta['pips'] = {k: path_d(v) for k, v in PIPS.items()}
    meta['icons'] = {k: path_d(v) for k, v in ICONS.items()}
    json.dump(meta, open(f'{OUT}/sprites.json', 'w'), indent=1)
    print('ok')
