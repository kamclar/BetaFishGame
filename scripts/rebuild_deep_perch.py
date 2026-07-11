from pathlib import Path
from PIL import Image

source_path = Path("prototype/assets/fish - Copy/deep_perch_alpha.png")
output_path = Path("prototype/assets/fish/fish_deep_perch.png")
source = Image.open(source_path).convert("RGBA")
alpha = source.getchannel("A")

# Find the four fish by real empty gaps, avoiding fixed-width cuts through mouths.
occupied = []
for x in range(source.width):
    occupied.append(alpha.crop((x, 0, x + 1, source.height)).getbbox() is not None)

runs = []
start = None
for x, value in enumerate(occupied + [False]):
    if value and start is None:
        start = x
    elif not value and start is not None:
        if x - start > 40:
            runs.append((start, x))
        start = None

if len(runs) != 4:
    raise RuntimeError(f"Expected four fish, found {len(runs)}: {runs}")

frames = []
for left, right in runs:
    piece = source.crop((left, 0, right, source.height))
    bbox = piece.getchannel("A").getbbox()
    frames.append(piece.crop(bbox))

# One scale for every pose prevents apparent body-size pulsing.
scale = min(90 / max(frame.width for frame in frames), 60 / max(frame.height for frame in frames))
sheet = Image.new("RGBA", (384, 64), (0, 0, 0, 0))
for index, frame in enumerate(frames):
    size = (max(1, round(frame.width * scale)), max(1, round(frame.height * scale)))
    frame = frame.resize(size, Image.Resampling.NEAREST)
    x = index * 96 + (96 - frame.width) // 2
    y = (64 - frame.height) // 2
    sheet.alpha_composite(frame, (x, y))

sheet.save(output_path, optimize=True)
print(output_path)
