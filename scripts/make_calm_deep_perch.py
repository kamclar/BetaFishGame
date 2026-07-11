from pathlib import Path
from PIL import Image

source_path = Path("prototype/assets/fish/fish_deep_perch.png")
output_path = source_path
source = Image.open(source_path).convert("RGBA")
base = source.crop((0, 0, 96, 64))

# Eight gentle steps. Only the rear half moves; head and mouth remain fixed.
offsets = (0, -1, -2, -1, 0, 1, 2, 1)
split_x = 53
rear = base.crop((0, 0, split_x + 2, 64))
front = base.crop((split_x - 2, 0, 96, 64))
sheet = Image.new("RGBA", (96 * len(offsets), 64), (0, 0, 0, 0))

for index, offset_y in enumerate(offsets):
    frame = Image.new("RGBA", (96, 64), (0, 0, 0, 0))
    frame.alpha_composite(rear, (0, offset_y))
    frame.alpha_composite(front, (split_x - 2, 0))
    sheet.alpha_composite(frame, (index * 96, 0))

sheet.save(output_path, optimize=True)
print(output_path)
