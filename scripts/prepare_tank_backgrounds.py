from pathlib import Path
from PIL import Image

work = Path("prototype/assets/decor-work")
output = Path("prototype/assets/decor")
for source_name, output_name in [
    ("quarantine_alpha.png", "quarantine_bottom.png"),
    ("nursery_alpha.png", "nursery_bottom.png"),
]:
    image = Image.open(work / source_name).convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    image = image.crop((0, bbox[1], image.width, image.height))
    image = image.resize((1120, 150), Image.Resampling.NEAREST)
    image.save(output / output_name, optimize=True)
