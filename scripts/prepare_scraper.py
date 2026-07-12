from pathlib import Path
from PIL import Image

source = Image.open("prototype/assets/items-work/scraper_alpha.png").convert("RGBA")
scraper = source.crop(source.getchannel("A").getbbox())
scraper.thumbnail((60, 60), Image.Resampling.NEAREST)
canvas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
canvas.alpha_composite(scraper, ((64 - scraper.width) // 2, (64 - scraper.height) // 2))
canvas.save(Path("prototype/assets/items/item_scraper.png"), optimize=True)
