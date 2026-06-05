#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from training_rendering import (
    DEFAULT_OUTPUT_DIR,
    build_exercise_lookup,
    load_json,
    render_plan,
    slugify,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Render a mobile-friendly training plan HTML file")
    parser.add_argument("--input", required=True, help="Path to plan JSON")
    parser.add_argument("--output", help="Output HTML path")
    args = parser.parse_args()

    plan = load_json(Path(args.input))
    lookup = build_exercise_lookup()

    output_path = Path(args.output) if args.output else DEFAULT_OUTPUT_DIR / f"{slugify(plan.get('title', 'training-plan'))}.html"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(render_plan(plan, lookup))

    print(json.dumps({"ok": True, "output_path": str(output_path)}, indent=2))


if __name__ == "__main__":
    main()
