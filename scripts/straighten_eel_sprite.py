from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "prototype" / "assets" / "fish" / "body_eel_v1.png"
TARGET = ROOT / "prototype" / "assets" / "fish" / "body_eel_v2.png"
FRAME_WIDTH = 96
TARGET_AXIS_Y = 32


def straighten_frame(frame: Image.Image) -> Image.Image:
    result = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    for x in range(frame.width):
        opaque_y = [y for y in range(frame.height) if frame.getpixel((x, y))[3] > 8]
        if not opaque_y:
            continue
        center = (opaque_y[0] + opaque_y[-1]) / 2
        shift = round(TARGET_AXIS_Y - center)
        for y in opaque_y:
            target_y = y + shift
            if 0 <= target_y < frame.height:
                result.putpixel((x, target_y), frame.getpixel((x, y)))
    return result


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    output = Image.new("RGBA", source.size, (0, 0, 0, 0))
    frame_count = source.width // FRAME_WIDTH
    for frame_index in range(frame_count):
        left = frame_index * FRAME_WIDTH
        frame = source.crop((left, 0, left + FRAME_WIDTH, source.height))
        output.alpha_composite(straighten_frame(frame), (left, 0))
    output.save(TARGET, optimize=True)
    print(TARGET)


if __name__ == "__main__":
    main()
