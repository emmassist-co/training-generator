#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LOCAL_STATE_PATH = ROOT / "data" / "local" / "training-state.json"
EXAMPLE_STATE_PATH = ROOT / "data" / "training_state.json"
EXERCISES_PATH = ROOT / "free-exercise-db" / "dist" / "exercises.json"
DEFAULT_CONFIG_PATH = ROOT / "config" / "training-generator.local.json"

LOWER_STRESS_PRIMARY = {"glutes", "hamstrings", "calves", "abdominals", "lower back", "middle back"}
LOWER_BODY_RELEVANT = {"quadriceps", "hamstrings", "glutes", "calves", "adductors", "abductors"}

HIGH_RISK_KEYWORDS = {
    "jump",
    "jerk",
    "snatch",
    "clean",
    "shuffle",
    "bounding",
    "depth",
    "plyometric",
    "hop",
    "sprint",
    "suicide",
    "cut",
    "twist",
}
CAUTION_KEYWORDS = {
    "squat",
    "lunge",
    "step-up",
    "step up",
    "leg press",
    "split squat",
    "single leg",
    "pistol",
    "skater",
    "deadlift",
}


def load_workspace_config() -> dict[str, Any]:
    config_override = os.environ.get("TRAINING_GENERATOR_CONFIG")
    config_path = Path(config_override).expanduser() if config_override else DEFAULT_CONFIG_PATH
    if not config_path.exists():
        return {}
    return load_json(config_path)


def resolve_local_state_path() -> Path:
    override = os.environ.get("TRAINING_GENERATOR_STATE_PATH")
    if override:
        return Path(override).expanduser()

    config_state_path = load_workspace_config().get("statePath")
    if config_state_path:
        return (ROOT / config_state_path).resolve()

    return DEFAULT_LOCAL_STATE_PATH


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")


def load_state() -> dict[str, Any]:
    local_path = resolve_local_state_path()
    if local_path.exists():
        return load_json(local_path)
    return load_json(EXAMPLE_STATE_PATH)


def normalize_tl1_log(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if not text.startswith("TL1 "):
        raise ValueError("Expected log to start with 'TL1 '")

    payload = json.loads(text[4:])
    exercises: list[dict[str, Any]] = []
    for exercise in payload.get("ex", []):
        exercises.append(
            {
                "step": exercise.get("s"),
                "planned_name": exercise.get("p"),
                "actual_name": exercise.get("a"),
                "swapped": bool(exercise.get("sw")),
                "prescription_summary": exercise.get("ps"),
                "completed_sets": exercise.get("cs"),
                "set_target": exercise.get("st"),
                "timer_seconds": exercise.get("tt"),
                "completed": bool(exercise.get("ok")),
            }
        )

    return {
        "schema": "TL1",
        "id": payload.get("id"),
        "title": payload.get("t"),
        "url": payload.get("u"),
        "started_at": payload.get("sa"),
        "ended_at": payload.get("ea"),
        "difficulty": payload.get("d"),
        "notes": payload.get("n", ""),
        "exercise_count": len(exercises),
        "exercises": exercises,
    }


def load_exercises() -> list[dict[str, Any]]:
    return load_json(EXERCISES_PATH)


def normalize(text: str) -> str:
    return text.lower().replace("_", " ").strip()


def classify_risk(exercise: dict[str, Any]) -> tuple[str, list[str]]:
    reasons: list[str] = []
    haystacks = [normalize(exercise.get("name", "")), normalize(exercise.get("id", ""))]
    haystacks += [normalize(step) for step in exercise.get("instructions", [])]
    combined = " ".join(haystacks)

    if exercise.get("category") == "plyometrics":
        reasons.append("plyometrics category")
    if any(word in combined for word in HIGH_RISK_KEYWORDS):
        reasons.append("jump/rotation/high-velocity pattern")
    if any(word in combined for word in CAUTION_KEYWORDS):
        reasons.append("loaded lower-body or unilateral pattern")

    primary = set(exercise.get("primaryMuscles", []))
    if "quadriceps" in primary:
        reasons.append("quad-dominant loading")
    if primary & LOWER_STRESS_PRIMARY:
        reasons.append("posterior-chain or trunk bias")

    if any("rotation" in step.lower() for step in exercise.get("instructions", [])):
        reasons.append("rotational demand")

    if "plyometrics category" in reasons or "jump/rotation/high-velocity pattern" in reasons:
        return "avoid", dedupe(reasons)
    if "quad-dominant loading" in reasons or "loaded lower-body or unilateral pattern" in reasons:
        return "caution", dedupe(reasons)
    return "prefer", dedupe(reasons)


def dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if item not in seen:
            out.append(item)
            seen.add(item)
    return out


def recent_sessions(state: dict[str, Any], limit: int = 6) -> list[dict[str, Any]]:
    sessions = state.get("sessions", [])
    return list(sorted(sessions, key=lambda s: s.get("date", ""), reverse=True))[:limit]


def recent_focus_summary(state: dict[str, Any]) -> dict[str, int]:
    counter: Counter[str] = Counter()
    for session in recent_sessions(state, limit=10):
        for focus in session.get("focus", []):
            counter[focus] += 1
    return dict(counter)


def search_exercises(
    exercises: list[dict[str, Any]],
    *,
    include_muscles: list[str],
    exclude_muscles: list[str],
    allowed_risk: set[str],
    categories: set[str] | None,
    equipment: set[str] | None,
    limit: int,
) -> list[dict[str, Any]]:
    scored: list[tuple[int, dict[str, Any]]] = []
    include_set = {m.lower() for m in include_muscles if m}
    exclude_set = {m.lower() for m in exclude_muscles if m}

    for exercise in exercises:
        risk, reasons = classify_risk(exercise)
        if risk not in allowed_risk:
            continue

        primary = {m.lower() for m in exercise.get("primaryMuscles", [])}
        secondary = {m.lower() for m in exercise.get("secondaryMuscles", [])}
        all_muscles = primary | secondary
        if include_set and not (all_muscles & include_set):
            continue
        if exclude_set and (all_muscles & exclude_set):
            continue
        if categories and exercise.get("category") not in categories:
            continue
        if equipment and exercise.get("equipment") not in equipment:
            continue

        score = 0
        score += len(primary & include_set) * 5
        score += len(secondary & include_set) * 2
        score += 3 if primary & LOWER_STRESS_PRIMARY else 0
        score += 1 if primary & LOWER_BODY_RELEVANT else 0
        score += 2 if risk == "prefer" else 0
        score -= 2 if risk == "caution" else 0
        scored.append(
            (
                score,
                {
                    "id": exercise["id"],
                    "name": exercise["name"],
                    "risk": risk,
                    "category": exercise.get("category"),
                    "equipment": exercise.get("equipment"),
                    "primaryMuscles": exercise.get("primaryMuscles", []),
                    "secondaryMuscles": exercise.get("secondaryMuscles", []),
                    "reasons": reasons,
                    "instructions": exercise.get("instructions", [])[:3],
                },
            )
        )

    return [item for _, item in sorted(scored, key=lambda pair: (-pair[0], pair[1]["name"]))[:limit]]


def cmd_summarize_state(_: argparse.Namespace) -> None:
    state = load_state()
    profile = state.get("profile", {})
    summary = {
        "profile": profile,
        "preferences": state.get("preferences", {}),
        "state_path": str(resolve_local_state_path()),
        "using_example_state": not resolve_local_state_path().exists(),
        "latest_session_date": recent_sessions(state, 1)[0]["date"] if state.get("sessions") else None,
        "session_count": len(state.get("sessions", [])),
        "recent_focus_counts": recent_focus_summary(state),
        "latest_sessions": recent_sessions(state, 3),
    }
    print(json.dumps(summary, indent=2))


def cmd_summarize_context(_: argparse.Namespace) -> None:
    state = load_state()
    config = load_workspace_config()
    context = {
        "profile": state.get("profile", {}),
        "preferences": state.get("preferences", {}),
        "recent_focus_counts": recent_focus_summary(state),
        "latest_sessions": recent_sessions(state, 3),
        "state": {
            "path": str(resolve_local_state_path()),
            "using_example_state": not resolve_local_state_path().exists(),
        },
        "publish": {
            "pagesProject": config.get("pagesProject"),
            "pagesSection": config.get("pagesSection", "training"),
            "pagesBaseUrl": config.get("pagesBaseUrl"),
            "config_path": str(DEFAULT_CONFIG_PATH),
            "using_local_config": DEFAULT_CONFIG_PATH.exists(),
        },
    }
    print(json.dumps(context, indent=2))


def cmd_search_exercises(args: argparse.Namespace) -> None:
    exercises = load_exercises()
    results = search_exercises(
        exercises,
        include_muscles=args.include_muscles,
        exclude_muscles=args.exclude_muscles,
        allowed_risk=set(args.allowed_risk),
        categories=set(args.categories) if args.categories else None,
        equipment=set(args.equipment) if args.equipment else None,
        limit=args.limit,
    )
    print(json.dumps(results, indent=2))


def cmd_log_session(args: argparse.Namespace) -> None:
    state = load_state()
    payload = json.loads(Path(args.input).read_text())
    payload.setdefault("logged_at", datetime.now().isoformat(timespec="seconds"))
    payload.setdefault("date", str(date.today()))
    state.setdefault("sessions", []).append(payload)
    save_json(resolve_local_state_path(), state)
    print(
        json.dumps(
            {
                "ok": True,
                "session_count": len(state["sessions"]),
                "date": payload["date"],
                "state_path": str(resolve_local_state_path()),
                "summary": f"Logged session to {resolve_local_state_path()} ({len(state['sessions'])} total).",
            },
            indent=2,
        )
    )


def cmd_show_recent(args: argparse.Namespace) -> None:
    state = load_state()
    print(json.dumps(recent_sessions(state, args.limit), indent=2))


def cmd_validate_tl1(args: argparse.Namespace) -> None:
    raw = Path(args.input).read_text() if args.input else args.log
    print(json.dumps(normalize_tl1_log(raw), indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Training state helper")
    subparsers = parser.add_subparsers(dest="command", required=True)

    summarize = subparsers.add_parser("summarize-state")
    summarize.set_defaults(func=cmd_summarize_state)

    context = subparsers.add_parser("summarize-context")
    context.set_defaults(func=cmd_summarize_context)

    search = subparsers.add_parser("search-exercises")
    search.add_argument("--include-muscles", nargs="*", default=[])
    search.add_argument("--exclude-muscles", nargs="*", default=[])
    search.add_argument("--allowed-risk", nargs="*", default=["prefer", "caution"])
    search.add_argument("--categories", nargs="*", default=[])
    search.add_argument("--equipment", nargs="*", default=[])
    search.add_argument("--limit", type=int, default=12)
    search.set_defaults(func=cmd_search_exercises)

    log = subparsers.add_parser("log-session")
    log.add_argument("--input", required=True)
    log.set_defaults(func=cmd_log_session)

    recent = subparsers.add_parser("show-recent")
    recent.add_argument("--limit", type=int, default=5)
    recent.set_defaults(func=cmd_show_recent)

    validate_tl1 = subparsers.add_parser("validate-tl1")
    validate_group = validate_tl1.add_mutually_exclusive_group(required=True)
    validate_group.add_argument("--input")
    validate_group.add_argument("--log")
    validate_tl1.set_defaults(func=cmd_validate_tl1)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
