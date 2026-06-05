#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
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
        return {"__config_path": None, "__config_source": None}
    payload = load_json(config_path)
    payload["__config_path"] = str(config_path)
    payload["__config_source"] = "env" if config_override else "local"
    return payload


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


def ensure_session_ids(state: dict[str, Any]) -> bool:
    changed = False
    for session in state.get("sessions", []):
        if session.get("session_id"):
            continue
        session["session_id"] = build_session_id(session)
        changed = True
    return changed


def build_session_id(payload: dict[str, Any]) -> str:
    date_part = str(payload.get("date") or date.today())
    base = str(payload.get("source_training_id") or payload.get("id") or "session").strip().lower()
    safe = "".join(char if char.isalnum() or char in {"-", "_"} else "-" for char in base)
    safe = "-".join(filter(None, safe.split("-")))[:48] or "session"
    normalized = {key: value for key, value in payload.items() if key != "session_id"}
    digest = hashlib.sha1(json.dumps(normalized, sort_keys=True).encode("utf-8")).hexdigest()[:6]
    return f"{date_part}-{safe}-{digest}"


def find_session_index(state: dict[str, Any], session_id: str) -> int:
    for index, session in enumerate(state.get("sessions", [])):
        if session.get("session_id") == session_id:
            return index
    raise SystemExit(f"Session not found: {session_id}")


def session_summary(session: dict[str, Any]) -> dict[str, Any]:
    return {
        "session_id": session.get("session_id"),
        "date": session.get("date"),
        "title": session.get("title"),
        "source_training_id": session.get("source_training_id"),
        "difficulty": session.get("difficulty"),
        "focus": session.get("focus", []),
    }


def ticks_to_seconds(value: int | float | None, tick_ms: int) -> float:
    if value is None:
        return 0.0
    return round((float(value) * tick_ms) / 1000, 1)


def normalize_timer_event(event: list[Any], tick_ms: int) -> dict[str, Any] | None:
    if not isinstance(event, list) or len(event) < 2:
        return None
    event_type = event[0]
    at_tick = event[1]
    remaining_ticks = event[2] if len(event) > 2 else 0
    return {
        "type": str(event_type),
        "at_seconds": ticks_to_seconds(at_tick, tick_ms),
        "remaining_seconds": ticks_to_seconds(remaining_ticks, tick_ms),
    }


def normalize_exercise_telemetry(raw: dict[str, Any], tick_ms: int) -> dict[str, Any]:
    active_windows = [
        {
            "start_seconds": ticks_to_seconds(window[0], tick_ms),
            "end_seconds": ticks_to_seconds(window[1], tick_ms),
            "duration_seconds": round(
                max(0.0, ticks_to_seconds(window[1], tick_ms) - ticks_to_seconds(window[0], tick_ms)),
                1,
            ),
        }
        for window in raw.get("aw", [])
        if isinstance(window, list) and len(window) == 2
    ]
    set_completion_seconds = [ticks_to_seconds(value, tick_ms) for value in raw.get("st", [])]
    focus_seconds = [ticks_to_seconds(value, tick_ms) for value in raw.get("fc", [])]
    swap_seconds = [ticks_to_seconds(value, tick_ms) for value in raw.get("swt", [])]
    completion_events = [
        {
            "at_seconds": ticks_to_seconds(event[0], tick_ms),
            "completed": bool(event[1]),
        }
        for event in raw.get("ce", [])
        if isinstance(event, list) and len(event) == 2
    ]
    timer_events = [
        normalized
        for normalized in (normalize_timer_event(event, tick_ms) for event in raw.get("ti", []))
        if normalized
    ]
    between_set_elapsed_seconds = [
        round(set_completion_seconds[index] - set_completion_seconds[index - 1], 1)
        for index in range(1, len(set_completion_seconds))
    ]
    active_total_seconds = round(sum(window["duration_seconds"] for window in active_windows), 1)
    wall_elapsed_seconds = round(
        max(0.0, active_windows[-1]["end_seconds"] - active_windows[0]["start_seconds"]),
        1,
    ) if active_windows else 0.0
    final_completion_seconds = next(
        (event["at_seconds"] for event in reversed(completion_events) if event["completed"]),
        None,
    )
    return {
        "active_windows": active_windows,
        "active_total_seconds": active_total_seconds,
        "wall_elapsed_seconds": wall_elapsed_seconds,
        "set_completion_seconds": set_completion_seconds,
        "between_set_elapsed_seconds": between_set_elapsed_seconds,
        "timer_events": timer_events,
        "focus_seconds": focus_seconds,
        "swap_seconds": swap_seconds,
        "completion_events": completion_events,
        "swap_count": len(swap_seconds),
        "reopen_count": sum(1 for event in completion_events if not event["completed"]),
        "completion_count": sum(1 for event in completion_events if event["completed"]),
        "final_completion_seconds": final_completion_seconds,
        "first_active_seconds": active_windows[0]["start_seconds"] if active_windows else None,
    }


def normalize_tl1_log(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if not text.startswith("TL1 "):
        raise ValueError("Expected log to start with 'TL1 '")

    payload = json.loads(text[4:])
    telemetry_meta = payload.get("tm", {}) if isinstance(payload.get("tm"), dict) else {}
    tick_ms = int(telemetry_meta.get("tk") or 100)
    exercises: list[dict[str, Any]] = []
    for exercise in payload.get("ex", []):
        raw_telemetry = exercise.get("tm", {}) if isinstance(exercise.get("tm"), dict) else {}
        telemetry = normalize_exercise_telemetry(raw_telemetry, tick_ms) if raw_telemetry else None
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
                "telemetry": telemetry,
            }
        )

    for index, exercise in enumerate(exercises[:-1]):
        telemetry = exercise.get("telemetry")
        next_telemetry = exercises[index + 1].get("telemetry")
        if not telemetry or not next_telemetry:
            continue
        current_done = telemetry.get("final_completion_seconds")
        next_start = next_telemetry.get("first_active_seconds")
        telemetry["next_exercise_start_gap_seconds"] = (
            round(max(0.0, next_start - current_done), 1)
            if current_done is not None and next_start is not None
            else None
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
        "telemetry": {
            "schema_version": telemetry_meta.get("v"),
            "tick_ms": tick_ms,
        } if telemetry_meta else None,
        "exercises": exercises,
    }


def load_exercises() -> list[dict[str, Any]]:
    return load_json(EXERCISES_PATH)


def primitive_exercise_summary(exercise: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": exercise.get("id"),
        "name": exercise.get("name"),
        "category": exercise.get("category"),
        "equipment": exercise.get("equipment"),
        "primaryMuscles": exercise.get("primaryMuscles", []),
        "secondaryMuscles": exercise.get("secondaryMuscles", []),
    }


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
            "config_path": config.get("__config_path"),
            "config_source": config.get("__config_source"),
            "using_local_config": bool(config.get("__config_path")),
        },
    }
    print(json.dumps(context, indent=2))


def cmd_read_state(_: argparse.Namespace) -> None:
    print(json.dumps(load_state(), indent=2))


def cmd_read_profile(_: argparse.Namespace) -> None:
    state = load_state()
    print(json.dumps({
        "profile": state.get("profile", {}),
        "preferences": state.get("preferences", {}),
    }, indent=2))


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


def cmd_list_exercises(args: argparse.Namespace) -> None:
    exercises = load_exercises()
    items = [primitive_exercise_summary(exercise) for exercise in exercises]
    if args.limit:
        items = items[:args.limit]
    print(json.dumps(items, indent=2))


def cmd_read_exercise(args: argparse.Namespace) -> None:
    exercise = next((item for item in load_exercises() if item.get("id") == args.id), None)
    if not exercise:
        raise SystemExit(f"Exercise not found: {args.id}")
    print(json.dumps(exercise, indent=2))


def cmd_log_session(args: argparse.Namespace) -> None:
    state = load_state()
    payload = json.loads(Path(args.input).read_text())
    payload.setdefault("logged_at", datetime.now().isoformat(timespec="seconds"))
    payload.setdefault("date", str(date.today()))
    payload.setdefault("session_id", build_session_id(payload))
    state.setdefault("sessions", []).append(payload)
    save_json(resolve_local_state_path(), state)
    print(
        json.dumps(
            {
                "ok": True,
                "session_id": payload["session_id"],
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


def cmd_list_sessions(args: argparse.Namespace) -> None:
    state = load_state()
    ensure_session_ids(state)
    sessions = [
        session_summary(session)
        for session in sorted(state.get("sessions", []), key=lambda item: item.get("date", ""), reverse=True)
    ]
    if args.limit:
        sessions = sessions[:args.limit]
    print(json.dumps(sessions, indent=2))


def cmd_read_session(args: argparse.Namespace) -> None:
    state = load_state()
    ensure_session_ids(state)
    session = state.get("sessions", [])[find_session_index(state, args.session_id)]
    print(json.dumps(session, indent=2))


def cmd_update_session(args: argparse.Namespace) -> None:
    state = load_state()
    ensure_session_ids(state)
    session_index = find_session_index(state, args.session_id)
    current = state["sessions"][session_index]
    patch = json.loads(Path(args.input).read_text())
    patch.pop("session_id", None)
    updated = {**current, **patch, "session_id": args.session_id}
    state["sessions"][session_index] = updated
    save_json(resolve_local_state_path(), state)
    print(
        json.dumps(
            {
                "ok": True,
                "action": "updated",
                "session": session_summary(updated),
                "state_path": str(resolve_local_state_path()),
            },
            indent=2,
        )
    )


def cmd_delete_session(args: argparse.Namespace) -> None:
    state = load_state()
    ensure_session_ids(state)
    session_index = find_session_index(state, args.session_id)
    removed = state["sessions"].pop(session_index)
    save_json(resolve_local_state_path(), state)
    print(
        json.dumps(
            {
                "ok": True,
                "action": "deleted",
                "session": session_summary(removed),
                "session_count": len(state.get("sessions", [])),
                "state_path": str(resolve_local_state_path()),
            },
            indent=2,
        )
    )


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

    read_state = subparsers.add_parser("read-state")
    read_state.set_defaults(func=cmd_read_state)

    read_profile = subparsers.add_parser("read-profile")
    read_profile.set_defaults(func=cmd_read_profile)

    list_exercises = subparsers.add_parser("list-exercises")
    list_exercises.add_argument("--limit", type=int, default=25)
    list_exercises.set_defaults(func=cmd_list_exercises)

    read_exercise = subparsers.add_parser("read-exercise")
    read_exercise.add_argument("--id", required=True)
    read_exercise.set_defaults(func=cmd_read_exercise)

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

    list_sessions = subparsers.add_parser("list-sessions")
    list_sessions.add_argument("--limit", type=int, default=10)
    list_sessions.set_defaults(func=cmd_list_sessions)

    read_session = subparsers.add_parser("read-session")
    read_session.add_argument("--session-id", required=True)
    read_session.set_defaults(func=cmd_read_session)

    update_session = subparsers.add_parser("update-session")
    update_session.add_argument("--session-id", required=True)
    update_session.add_argument("--input", required=True)
    update_session.set_defaults(func=cmd_update_session)

    delete_session = subparsers.add_parser("delete-session")
    delete_session.add_argument("--session-id", required=True)
    delete_session.set_defaults(func=cmd_delete_session)

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
