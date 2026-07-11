from pathlib import Path
from PIL import Image

source = Image.open("prototype/assets/items-work/items_alpha.png").convert("RGBA")
alpha = source.getchannel("A")
occupied = [alpha.crop((x, 0, x + 1, source.height)).getbbox() is not None for x in range(source.width)]
runs, start = [], None
for x, value in enumerate(occupied + [False]):
    if value and start is None:
        start = x
    elif not value and start is not None:
        if x - start > 40:
            runs.append((start, x))
        start = None
if len(runs) != 6:
    raise RuntimeError(f"Expected six items, found {runs}")

output = Path("prototype/assets/items")
output.mkdir(parents=True, exist_ok=True)
names = ["flakes", "test_kit", "plant", "medicine", "siphon", "journal"]
for name, (left, right) in zip(names, runs):
    item = source.crop((left, 0, right, source.height))
    item = item.crop(item.getchannel("A").getbbox())
    item.thumbnail((60, 60), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    canvas.alpha_composite(item, ((64 - item.width) // 2, 64 - item.height))
    canvas.save(output / f"item_{name}.png", optimize=True)
