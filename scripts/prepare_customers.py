from pathlib import Path
from PIL import Image

source = Image.open("prototype/assets/customers-work/customers_alpha.png").convert("RGBA")
alpha = source.getchannel("A")
occupied = [alpha.crop((x, 0, x + 1, source.height)).getbbox() is not None for x in range(source.width)]
runs, start = [], None
for x, value in enumerate(occupied + [False]):
    if value and start is None: start = x
    elif not value and start is not None:
        if x - start > 50: runs.append((start, x))
        start = None
if len(runs) != 4: raise RuntimeError(runs)
out = Path("prototype/assets/customers"); out.mkdir(parents=True, exist_ok=True)
for index, (left, right) in enumerate(runs):
    person = source.crop((left, 0, right, source.height))
    person = person.crop(person.getchannel("A").getbbox())
    person.thumbnail((124, 156), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (128, 160), (0, 0, 0, 0))
    canvas.alpha_composite(person, ((128-person.width)//2, 160-person.height))
    canvas.save(out / f"customer_{index}.png", optimize=True)
