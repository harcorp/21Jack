"""Grand Hall palette: shared by the voxel renderer, the sprites and the CSS tokens."""

def hx(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

# Core families (match tokens.css)
STONE = ['#14121A', '#1E1B24', '#2A2630', '#38333D', '#4A4450', '#615A66', '#7D7682']
WOOD = ['#2A160C', '#3E2211', '#5A3318', '#784622', '#96602F', '#B47C41']
CRIMSON = ['#3A0A10', '#5C0F18', '#7E1622', '#A11F2D', '#C4323F', '#E0566A']
FELT = ['#0B2A1C', '#0F3A26', '#145032', '#1A6340', '#23784F']
GOLD = ['#4A2C0A', '#8A5A14', '#C8902A', '#E8B53A', '#FFE08A']
TORCH = ['#7A2A06', '#C2410C', '#F07A1A', '#FFAA3B', '#FFD27A']
CREAM = ['#B8A88A', '#D9CBAE', '#EFE3C8', '#FBF4E4']
SKY = ['#1B1638', '#3B2456', '#7A2E5C', '#C24A4A', '#F08A4B', '#FFC46B']
