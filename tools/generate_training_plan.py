#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from training_state import load_state, recent_sessions, ensure_session_ids


def build_plan(state: dict[str, Any]) -> dict[str, Any]:
    ensure_session_ids(state)
    recent = recent_sessions(state, limit=3)
    latest = recent[0] if recent else {}
    latest_focus = {str(item).lower() for item in latest.get("focus", [])}
    latest_exercise_names = [str(item.get("name", "")).strip() for item in latest.get("exercises", []) if item.get("name")]
    latest_constraints = latest.get("next_session_constraints", [])
    lower_bias = "lower body" in latest_focus or "posterior chain" in latest_focus

    title = "Posterior Chain Reset" if lower_bias else "Full Body Strength Builder"
    goal = (
        "Controlled posterior-chain strength without repeating the same lower-body loading pattern harder."
        if lower_bias
        else "Simple full-body strength that builds momentum from recent training without repeating the last stressor blindly."
    )
    notes = [
        "Keep the session phone-friendly and easy to log.",
        "Use proven movements, but shift the stress enough that this feels like a real next step rather than a copy."
    ]
    if latest_constraints:
        notes.append(f"Recent constraint carried forward: {latest_constraints[0]}")

    influences = []
    if latest.get("session_id"):
        observation = latest.get("summary") or "Recent training history is available."
        if latest_exercise_names:
            observation += f" Recent exercises: {', '.join(latest_exercise_names[:3])}."
        influences.append(
            {
                "source_session_id": latest["session_id"],
                "observation": observation,
                "adjustment": (
                    "Avoid increasing the same squat or hinge stressor; use hip thrust and leg curl patterns instead."
                    if lower_bias
                    else "Keep variety high and do not repeat the exact same movement order or focus."
                ),
            }
        )

    exercises = (
        [
            {
                "exercise_id": "Barbell_Hip_Thrust",
                "name": "Barbell Hip Thrust",
                "sets": 4,
                "reps": 8,
                "rest_seconds": 90,
                "load": "moderate",
                "classification": "favorable",
                "reason": "Posterior-chain emphasis that moves away from repeating the last squat pattern harder.",
                "execution_notes": [
                    "Drive through the heels and pause for a beat at the top.",
                    "Leave 2 clean reps in reserve."
                ],
                "alternatives": [
                    {
                        "exercise_id": "Barbell_Glute_Bridge",
                        "name": "Barbell Glute Bridge",
                        "sets": 4,
                        "reps": 8,
                        "rest_seconds": 90,
                        "load": "moderate",
                        "note": "Use this if the hip thrust setup is busy."
                    }
                ],
            },
            {
                "exercise_id": "Ball_Leg_Curl",
                "name": "Ball Leg Curl",
                "sets": 3,
                "reps": 10,
                "rest_seconds": 60,
                "load": "bodyweight",
                "classification": "favorable",
                "reason": "Keeps hamstring work in the plan while staying friendlier than repeating a heavier hinge day.",
                "execution_notes": [
                    "Keep hips up through the rep.",
                    "Shorten the range if the knee feels irritable."
                ],
                "alternatives": [
                    {
                        "exercise_id": "Glute_Ham_Raise",
                        "name": "Glute Ham Raise",
                        "sets": 3,
                        "reps": 8,
                        "rest_seconds": 75,
                        "load": "bodyweight or assisted",
                        "note": "Use this if no exercise ball is available."
                    }
                ],
            },
            {
                "exercise_id": "Air_Bike",
                "name": "Air Bike",
                "sets": 5,
                "duration": "45s",
                "rest_seconds": 45,
                "load": "hard but smooth",
                "classification": "favorable",
                "reason": "Adds low-impact conditioning and calorie expenditure without turning the session into a second heavy lower-body day.",
                "execution_notes": [
                    "Build in the first 10 seconds, then hold a repeatable pace.",
                    "Breathe down during the rest block."
                ],
                "alternatives": [
                    {
                        "exercise_id": "Recumbent_Bike",
                        "name": "Recumbent Bike",
                        "sets": 5,
                        "duration": "45s",
                        "rest_seconds": 45,
                        "load": "hard but smooth",
                        "note": "Use this if the air bike is unavailable."
                    }
                ],
            },
        ]
        if lower_bias
        else [
            {
                "exercise_id": "Dumbbell_Bench_Press",
                "name": "Dumbbell Bench Press",
                "sets": 4,
                "reps": 6,
                "rest_seconds": 90,
                "load": "challenging but smooth",
                "classification": "favorable",
                "reason": "Simple upper-body press that keeps the plan distinct from the last lower-body-focused session.",
                "execution_notes": [
                    "Move the dumbbells fast off the chest.",
                    "Stop 1 to 2 reps before technique slows."
                ],
                "alternatives": [],
            }
        ]
    )

    return {
        "title": title,
        "subtitle": "45-minute gym session",
        "goal": goal,
        "duration": "45 minutes",
        "motivation_focus": "Keep it simple, confidence-building, and different enough from the last session to stay fresh.",
        "monitor": [
            "Back off if the same lower-body pattern starts to feel beaten up.",
            "Keep effort repeatable rather than chasing load jumps."
        ],
        "notes": notes,
        "planning_context": {
            "recent_sessions_considered": [session.get("session_id") for session in recent if session.get("session_id")],
            "influences": influences,
        },
        "exercises": exercises,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the next training plan from local state")
    parser.add_argument("--output", help="Output JSON path")
    args = parser.parse_args()

    plan = build_plan(load_state())
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(plan, indent=2) + "\n")
        print(json.dumps({"ok": True, "output_path": str(output_path), "title": plan["title"]}, indent=2))
        return

    print(json.dumps(plan, indent=2))


if __name__ == "__main__":
    main()
