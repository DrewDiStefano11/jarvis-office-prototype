"""Normalize an alpha sprite grid into collision-free, fixed-anchor cells."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def normalize(source: Path, output: Path, rows: int, columns: int, gutter: int) -> None:
    image = Image.open(source).convert("RGBA")
    if image.width % columns or image.height % rows:
        raise ValueError("Sprite sheet dimensions must divide evenly by the declared grid.")
    cell_width = image.width // columns
    cell_height = image.height // rows
    maximum_width = cell_width - gutter * 2
    maximum_height = cell_height - gutter * 2
    normalized = Image.new("RGBA", image.size, (0, 0, 0, 0))

    for row in range(rows):
        for column in range(columns):
            left = column * cell_width
            top = row * cell_height
            cell = image.crop((left, top, left + cell_width, top + cell_height))
            alpha_bounds = cell.getchannel("A").getbbox()
            if alpha_bounds is None:
                raise ValueError(f"Frame {row * columns + column} is empty.")
            content = cell.crop(alpha_bounds)
            scale = min(1, maximum_width / content.width, maximum_height / content.height)
            size = (max(1, round(content.width * scale)), max(1, round(content.height * scale)))
            if size != content.size:
                content = content.resize(size, Image.Resampling.NEAREST)
            x = left + (cell_width - content.width) // 2
            y = top + cell_height - gutter - content.height
            normalized.alpha_composite(content, (x, y))

    output.parent.mkdir(parents=True, exist_ok=True)
    normalized.save(output, format="PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--rows", type=int, default=6)
    parser.add_argument("--columns", type=int, default=6)
    parser.add_argument("--gutter", type=int, default=16)
    args = parser.parse_args()
    normalize(args.input, args.output, args.rows, args.columns, args.gutter)


if __name__ == "__main__":
    main()
