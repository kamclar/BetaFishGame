from pathlib import Path
from PIL import Image

work = Path("prototype/assets/decor-work")
output = Path("prototype/assets/decor")
output.mkdir(parents=True, exist_ok=True)

plants = Image.open(work / "plants_alpha.png").convert("RGBA")
alpha = plants.getchannel("A")
occupied = [alpha.crop((x, 0, x + 1, plants.height)).getbbox() is not None for x in range(plants.width)]
runs, start = [], None
for x, value in enumerate(occupied + [False]):
    if value and start is None:
        start = x
    elif not value and start is not None:
        if x - start > 40:
            runs.append((start, x))
        start = None
if len(runs) != 4:
    raise RuntimeError(f"Expected four plants, found {runs}")

names = ["vallisneria", "anubias", "red_ludwigia", "glow_fern"]
for name, (left, right) in zip(names, runs):
    plant = plants.crop((left, 0, right, plants.height))
    plant = plant.crop(plant.getchannel("A").getbbox())
    plant.thumbnail((92, 156), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (96, 160), (0, 0, 0, 0))
    canvas.alpha_composite(plant, ((96 - plant.width) // 2, 160 - plant.height))
    canvas.save(output / f"plant_{name}.png", optimize=True)

bottom = Image.open(work / "bottom_alpha.png").convert("RGBA")
bbox = bottom.getchannel("A").getbbox()
bottom = bottom.crop((0, bbox[1], bottom.width, bottom.height))
bottom = bottom.resize((1120, 150), Image.Resampling.NEAREST)
bottom.save(output / "aquarium_bottom.png", optimize=True)
