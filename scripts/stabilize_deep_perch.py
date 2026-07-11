from pathlib import Path
from PIL import Image

path = Path("prototype/assets/fish/fish_deep_perch.png")
source = Image.open(path).convert("RGBA")
stable = source.crop((0, 0, 96, 64))
output = Image.new("RGBA", (384, 64), (0, 0, 0, 0))

# Hlubinka is deliberately calm: keep her body and mouth fixed across frames.
# A tiny vertical fin/body drift gives life without the previous violent wobble.
offsets = (0, -1, 0, 1)
for index, offset_y in enumerate(offsets):
    output.alpha_composite(stable, (index * 96, offset_y))

output.save(path, optimize=True)
print(path)
