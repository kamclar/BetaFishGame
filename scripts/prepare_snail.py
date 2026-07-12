from pathlib import Path
from PIL import Image

source = Image.open("prototype/assets/creatures-work/ampullaria_alpha.png").convert("RGBA")
bbox = source.getchannel("A").getbbox()
snail = source.crop(bbox)
snail.thumbnail((44, 44), Image.Resampling.NEAREST)
canvas = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
canvas.alpha_composite(snail, ((48 - snail.width) // 2, (48 - snail.height) // 2))
output = Path("prototype/assets/creatures")
output.mkdir(parents=True, exist_ok=True)
canvas.save(output / "ampullaria.png", optimize=True)
