import argparse
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("input", nargs="?", default="prototype/assets/fish/storm_spine_alpha.png")
parser.add_argument("output", nargs="?", default="prototype/assets/fish/fish_storm_spine.png")
args = parser.parse_args()

source = Image.open(args.input).convert("RGBA")
sheet = Image.new("RGBA", (384, 64), (0, 0, 0, 0))

frame_width = source.width // 4
for index in range(4):
    frame = source.crop((index * frame_width, 0, (index + 1) * frame_width, source.height))
    alpha = frame.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        continue
    fish = frame.crop(bbox)
    fish.thumbnail((90, 60), Image.Resampling.NEAREST)
    x = index * 96 + (96 - fish.width) // 2
    y = (64 - fish.height) // 2
    sheet.alpha_composite(fish, (x, y))

output = Path(args.output)
sheet.save(output, optimize=True)
print(output)
