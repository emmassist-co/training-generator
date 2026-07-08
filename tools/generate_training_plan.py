#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from training_state import (
    classify_risk,
    ensure_session_ids,
    load_exercises,
    load_state,
    recent_focus_summary,
    recent_sessions,
)


Exercise = dict[str, Any]
State = dict[str, Any]


LOWER_FOCUS_TERMS = {"lower body", "knee-friendly lower body", "posterior chain", "trunk"}
UPPER_FOCUS_TERMS = {"upper body", "horizontal push", "horizontal pull", "vertical pull", "full body"}
PRACTICAL_GYM_EQUIPMENT = {"machine", "cable", "barbell", "dumbbell", "kettlebells"}


LOWER_BUCKET_SPECS: list[dict[str, Any]] = [
    {
        "id": "posterior_chain",
        "label": "posterior-chain anchor",
        "include_muscles": ["glutes", "hamstrings", "lower back"],
        "categories": ["strength", "powerlifting"],
        "allowed_risk": ["prefer", "caution"],
        "exact_ids": [
            "Barbell_Hip_Thrust",
            "Barbell_Glute_Bridge",
            "Pull_Through",
            "Romanian_Deadlift",
            "Glute_Ham_Raise",
        ],
        "name_keywords": ["hip thrust", "glute bridge", "pull through", "romanian deadlift", "good morning"],
        "prefer_equipment": ["barbell", "cable", "machine", "dumbbell"],
        "avoid_equipment": ["exercise ball"],
        "practical_only": True,
        "prescription": {"sets": 4, "reps": 8, "rest_seconds": 90, "load": "moderate"},
        "classification_default": "favorable",
        "reason": "Posterior-chain anchor chosen from the retrieved pool instead of repeating the same lower-body stressor by default.",
        "execution_cue": "Drive through the feet and finish each rep cleanly without turning it into a grind.",
        "alternative_note": "Use this if the primary setup is taken or the first option feels like too much setup friction today.",
    },
    {
        "id": "knee_dominant",
        "label": "knee-dominant strength",
        "include_muscles": ["quadriceps", "glutes"],
        "categories": ["strength", "powerlifting"],
        "allowed_risk": ["prefer", "caution"],
        "exact_ids": ["Leg_Press", "Hack_Squat", "Goblet_Squat", "Smith_Single-Leg_Split_Squat"],
        "name_keywords": ["leg press", "hack squat", "goblet squat", "split squat", "step-up"],
        "prefer_equipment": ["machine", "dumbbell"],
        "practical_only": True,
        "prescription": {"sets": 3, "reps": 8, "rest_seconds": 90, "load": "controlled moderate effort"},
        "classification_default": "favorable",
        "reason": "Knee-dominant slot that keeps the session grounded while letting history and feedback decide whether to repeat or rotate.",
        "execution_cue": "Use the smoothest range you can repeat with confidence and back off if the first work set feels worse than expected.",
        "alternative_note": "Use this if you want a similar stress pattern with a different setup.",
    },
    {
        "id": "hamstring_accessory",
        "label": "hamstring accessory",
        "include_muscles": ["hamstrings"],
        "categories": ["strength", "powerlifting"],
        "allowed_risk": ["prefer", "caution"],
        "exact_ids": ["Seated_Leg_Curl", "Lying_Leg_Curls", "Standing_Leg_Curl", "Glute_Ham_Raise"],
        "name_keywords": ["leg curl", "glute ham"],
        "prefer_equipment": ["machine"],
        "avoid_equipment": ["exercise ball"],
        "practical_only": True,
        "prescription": {"sets": 3, "reps": 10, "rest_seconds": 60, "load": "moderate, clean squeeze"},
        "classification_default": "favorable",
        "reason": "Hamstring accessory chosen from practical retrieved options so the plan has real substitutes if one station is busy.",
        "execution_cue": "Own the squeeze and lower each rep with control instead of chasing more load.",
        "alternative_note": "Use this if the first hamstring setup is unavailable.",
    },
    {
        "id": "trunk",
        "label": "trunk support",
        "include_muscles": ["abdominals", "lower back"],
        "categories": ["strength"],
        "allowed_risk": ["prefer", "caution"],
        "exact_ids": ["Pallof_Press", "Cable_Crunch", "Ab_Crunch_Machine", "Dead_Bug"],
        "name_keywords": ["pallof", "cable crunch", "dead bug", "ab crunch"],
        "prefer_equipment": ["cable", "machine", "body only"],
        "avoid_keywords": ["rotation"],
        "practical_only": True,
        "prescription": {"sets": 3, "reps": 12, "rest_seconds": 45, "load": "moderate, controlled"},
        "classification_default": "favorable",
        "reason": "Simple trunk slot from the retrieved pool so the session stays easy to execute in a busy gym.",
        "execution_cue": "Move slowly enough that you keep tension where you want it instead of letting the setup yank you around.",
        "alternative_note": "Use this if the first core setup is awkward or unavailable.",
    },
    {
        "id": "conditioning",
        "label": "simple conditioning close",
        "exact_ids": ["Recumbent_Bike", "Elliptical_Trainer", "Rowing_Stationary", "Walking_Treadmill"],
        "categories": ["cardio"],
        "allowed_risk": ["prefer", "caution"],
        "prefer_equipment": ["machine"],
        "practical_only": True,
        "prescription": {"sets": 1, "duration": "8 minutes", "rest_seconds": 0, "load": "easy to moderate steady pace"},
        "classification_default": "favorable",
        "reason": "Conditioning finish chosen from simple machine options so the session closes cleanly without adding chaos.",
        "execution_cue": "Keep the pace repeatable and finish with some gas left in the tank.",
        "alternative_note": "Use this if the first cardio station is taken.",
    },
]

UPPER_BUCKET_SPECS: list[dict[str, Any]] = [
    {
        "id": "horizontal_push",
        "label": "horizontal push",
        "include_muscles": ["chest", "triceps", "shoulders"],
        "categories": ["strength", "powerlifting"],
        "allowed_risk": ["prefer", "caution"],
        "exact_ids": [
            "Dumbbell_Bench_Press_with_Neutral_Grip",
            "Alternating_Floor_Press",
            "Dumbbell_Floor_Press",
            "Barbell_Bench_Press_-_Medium_Grip",
        ],
        "name_keywords": ["neutral grip", "floor press", "bench press"],
        "prefer_equipment": ["dumbbell", "kettlebells", "barbell"],
        "practical_only": True,
        "prescription": {"sets": 3, "reps": 8, "rest_seconds": 90, "load": "moderate, smooth"},
        "classification_default": "favorable",
        "reason": "Upper push slot chosen from the retrieved pool so the next session can rotate emphasis without losing simplicity.",
        "execution_cue": "Lower with control and leave one or two clean reps in reserve.",
        "alternative_note": "Use this if the bench area is busy or you want the lower-friction setup.",
    },
    {
        "id": "horizontal_pull",
        "label": "horizontal pull",
        "include_muscles": ["middle back", "lats", "biceps"],
        "categories": ["strength"],
        "allowed_risk": ["prefer", "caution"],
        "exact_ids": ["Seated_Cable_Rows", "One-Arm_Dumbbell_Row", "Lying_T-Bar_Row", "Dumbbell_Incline_Row"],
        "name_keywords": ["cable row", "dumbbell row", "t-bar row", "incline row"],
        "prefer_equipment": ["cable", "dumbbell", "machine"],
        "practical_only": True,
        "prescription": {"sets": 4, "reps": 8, "rest_seconds": 75, "load": "moderate"},
        "classification_default": "favorable",
        "reason": "Horizontal pull selected from retrieved candidates to keep the upper-body work balanced and realistic.",
        "execution_cue": "Drive the elbows back without shrugging and pause briefly in the squeeze.",
        "alternative_note": "Use this if the first row setup is tied up.",
    },
    {
        "id": "vertical_pull",
        "label": "vertical pull",
        "include_muscles": ["lats", "middle back", "biceps"],
        "categories": ["strength"],
        "allowed_risk": ["prefer", "caution"],
        "exact_ids": ["Close-Grip_Front_Lat_Pulldown", "Wide-Grip_Lat_Pulldown", "Full_Range-Of-Motion_Lat_Pulldown"],
        "name_keywords": ["lat pulldown", "pulldown"],
        "prefer_equipment": ["cable", "machine"],
        "practical_only": True,
        "prescription": {"sets": 3, "reps": 10, "rest_seconds": 75, "load": "moderate, smooth full range"},
        "classification_default": "favorable",
        "reason": "Vertical pull chosen from the wider candidate pool so the session can change feel without becoming random.",
        "execution_cue": "Keep the path smooth and stop before the rep speed falls off hard.",
        "alternative_note": "Use this if the first pull station is crowded.",
    },
    {
        "id": "trunk",
        "label": "trunk support",
        "include_muscles": ["abdominals", "lower back"],
        "categories": ["strength"],
        "allowed_risk": ["prefer", "caution"],
        "exact_ids": ["Dead_Bug", "Ab_Crunch_Machine", "Pallof_Press", "Cable_Crunch"],
        "name_keywords": ["dead bug", "ab crunch", "pallof", "cable crunch"],
        "prefer_equipment": ["body only", "machine", "cable"],
        "avoid_keywords": ["rotation"],
        "practical_only": True,
        "prescription": {"sets": 3, "reps": 8, "rest_seconds": 45, "load": "8 each side, slow controlled reps"},
        "classification_default": "favorable",
        "reason": "Trunk slot chosen from the retrieved pool with a bias toward easy setup and clear logging.",
        "execution_cue": "Keep the movement blunt and controlled so the trunk work supports the session instead of hijacking it.",
        "alternative_note": "Use this if the floor or cable setup is awkward.",
    },
    {
        "id": "conditioning",
        "label": "simple conditioning close",
        "exact_ids": ["Recumbent_Bike", "Elliptical_Trainer", "Rowing_Stationary", "Walking_Treadmill"],
        "categories": ["cardio"],
        "allowed_risk": ["prefer", "caution"],
        "prefer_equipment": ["machine"],
        "practical_only": True,
        "prescription": {"sets": 1, "duration": "8 minutes", "rest_seconds": 0, "load": "easy to moderate steady pace"},
        "classification_default": "favorable",
        "reason": "Conditioning finish selected from simple machine options so the day ends with a low-friction close.",
        "execution_cue": "Treat it as a steady finish, not a test.",
        "alternative_note": "Use this if the first cardio station is unavailable.",
    },
]


def normalize(value: Any) -> str:
    return str(value or "").strip().lower()


def clone(value: Any) -> Any:
    return json.loads(json.dumps(value))


def session_focus_values(session: dict[str, Any]) -> set[str]:
    return {normalize(item) for item in session.get("focus", []) if item}


def exercise_names(session: dict[str, Any]) -> list[str]:
    return [
        str(item.get("name", "")).strip()
        for item in session.get("exercises", [])
        if str(item.get("name", "")).strip()
    ]


def feedback_signals(state: State, *, category: str | None = None, preference: str | None = None) -> list[dict[str, Any]]:
    profile = state.get("planning_feedback_profile", {}) or {}
    signals = profile.get("signals", []) or []
    matched: list[dict[str, Any]] = []
    for signal in signals:
        if category and normalize(signal.get("category")) != normalize(category):
            continue
        if preference and normalize(signal.get("preference")) != normalize(preference):
            continue
        matched.append(signal)
    return matched


def has_feedback_signal(
    state: State,
    *,
    category: str | None = None,
    target_terms: list[str] | None = None,
    preference: str | None = None,
) -> bool:
    targets = [normalize(term) for term in (target_terms or []) if normalize(term)]
    for signal in feedback_signals(state, category=category, preference=preference):
        target = normalize(signal.get("target"))
        if targets and not any(term in target for term in targets):
            continue
        return True
    return False


def recent_explicit_focus_count(sessions: list[dict[str, Any]], keyword: str) -> int:
    target = normalize(keyword)
    return sum(1 for session in sessions if target in session_focus_values(session))


def recent_name_counts(sessions: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for session in sessions:
        for name in exercise_names(session):
            key = normalize(name)
            counts[key] = counts.get(key, 0) + 1
    return counts


def infer_equipment_access(state: State) -> set[str]:
    tokens: set[str] = set()
    for source in (state.get("preferences", {}), state.get("profile", {})):
        raw = source.get("equipment_access")
        if isinstance(raw, list):
            for item in raw:
                token = normalize(item)
                if token:
                    tokens.add(token)
        elif raw:
            token = normalize(raw)
            if token:
                tokens.add(token)
    if not tokens:
        tokens.update({"commercial gym", "machine", "cable", "barbell", "dumbbell"})
    return tokens


def build_attention_flags(state: State, recent: list[dict[str, Any]], wants_rotation: bool) -> list[str]:
    flags: list[str] = []
    latest = recent[0] if recent else {}
    recent_lower_count = recent_explicit_focus_count(recent, "knee-friendly lower body") + recent_explicit_focus_count(recent, "lower body")
    if wants_rotation and recent_lower_count >= 2:
        flags.append("Recent history leans lower-body heavy, so widen the next session emphasis instead of cloning the same stressor.")
    latest_constraints = latest.get("next_session_constraints", []) or []
    if latest_constraints:
        flags.append(f"Carry forward this recent constraint: {latest_constraints[0]}")
    for note in (state.get("planning_feedback_profile", {}) or {}).get("summary_notes", [])[:2]:
        clean = str(note).strip()
        if clean:
            flags.append(clean)
    if not flags:
        flags.append("Prefer a simple, phone-friendly session with realistic substitutions.")
    return flags


def choose_session_shape(state: State, recent: list[dict[str, Any]]) -> dict[str, Any]:
    latest = recent[0] if recent else {}
    latest_focus = session_focus_values(latest)
    wants_rotation = has_feedback_signal(
        state,
        category="progression",
        target_terms=["exercise selection", "lower-body strength sessions", "session-to-session"],
        preference="rotate",
    )
    prefers_repeat = has_feedback_signal(
        state,
        category="progression",
        target_terms=["lower-body strength sessions", "exercise selection", "session-to-session"],
        preference="repeat",
    )
    recent_lower_count = recent_explicit_focus_count(recent, "knee-friendly lower body") + recent_explicit_focus_count(recent, "lower body")
    recent_upper_count = recent_explicit_focus_count(recent, "upper body")
    latest_is_lower = bool(latest_focus & {"knee-friendly lower body", "lower body"})
    latest_is_upper = "upper body" in latest_focus

    if latest_is_lower and wants_rotation and recent_lower_count >= 2:
        return {
            "type": "upper",
            "title": "Full Body Strength Builder",
            "goal": "Shift emphasis away from repeated lower-body stress while keeping the session simple and repeatable.",
            "notes": [
                "Rotate focus when recent sessions are piling up on the same lower-body backbone.",
                "Keep the same blunt, phone-friendly structure while changing the actual exercise pool.",
            ],
            "monitor": [
                "Back off if any push or pull setup feels unexpectedly cranky during the first work set.",
                "Treat the conditioning close as a finish, not a test.",
            ],
            "wants_rotation": wants_rotation,
            "prefers_repeat": prefers_repeat,
        }
    if latest_is_upper and wants_rotation and recent_upper_count >= 2:
        return {
            "type": "lower",
            "title": "Lower Strength Rotation",
            "goal": "Keep the lower-body session familiar enough to trust while rotating the exact movements to reduce staleness.",
            "notes": [
                "Keep the lower-body backbone, but rotate the exact exercise choices when repetition starts to feel stale.",
                "Prefer realistic machine or cable options over novelty-only substitutions.",
            ],
            "monitor": [
                "Use the easier option if the first work set changes your confidence or comfort quickly.",
                "Leave the session feeling trained, not cooked.",
            ],
            "wants_rotation": wants_rotation,
            "prefers_repeat": prefers_repeat,
        }
    if latest_is_lower:
        return {
            "type": "lower",
            "title": "Posterior Chain Reset",
            "goal": "Controlled lower-body strength built from retrieved candidates without blindly repeating the exact same stressor harder.",
            "notes": [
                "Keep the session phone-friendly and easy to log.",
                "Use proven movements where useful, but choose them from the wider retrieved pool instead of a fixed bundle.",
            ],
            "monitor": [
                "Back off if the same lower-body pattern starts to feel beaten up.",
                "Keep effort repeatable rather than chasing load jumps.",
            ],
            "wants_rotation": wants_rotation,
            "prefers_repeat": prefers_repeat,
        }
    return {
        "type": "upper",
        "title": "Full Body Strength Builder",
        "goal": "Build an upper-biased full-body session from retrieved candidates while keeping the output simple and repeatable.",
        "notes": [
            "Rotate focus when it keeps adherence high, but preserve the simple session skeleton.",
            "Choose practical gym options from the retrieved pool rather than from a handwritten bundle.",
        ],
        "monitor": [
            "Keep the pressing and rowing smooth rather than forcing load jumps.",
            "Finish the close with something left in the tank.",
        ],
        "wants_rotation": wants_rotation,
        "prefers_repeat": prefers_repeat,
    }


def keyword_bonus(text: str, keywords: list[str]) -> int:
    return sum(6 for keyword in keywords if keyword and keyword in text)


def keyword_penalty(text: str, keywords: list[str]) -> int:
    return sum(6 for keyword in keywords if keyword and keyword in text)


def exercise_feedback_score(state: State, exercise: Exercise) -> tuple[int, list[str]]:
    score = 0
    notes: list[str] = []
    exercise_name = normalize(exercise.get("name"))
    exercise_id = normalize(exercise.get("id"))
    for signal in feedback_signals(state, category="exercise"):
        target = normalize(signal.get("target"))
        if not target:
            continue
        if target not in exercise_name and target not in exercise_id:
            continue
        preference = normalize(signal.get("preference"))
        if preference == "prefer":
            score += 10
            notes.append(f"Sticky feedback prefers {exercise.get('name')}.")
        elif preference == "avoid":
            score -= 16
            notes.append(f"Sticky feedback avoids {exercise.get('name')}.")
        elif preference == "repeat":
            score += 4
        elif preference == "rotate":
            score -= 4
    return score, notes


def score_candidate(
    exercise: Exercise,
    spec: dict[str, Any],
    *,
    state: State,
    recent_names: dict[str, int],
    latest_names: set[str],
    recent_constraints_blob: str,
    wants_rotation: bool,
    prefers_repeat: bool,
    equipment_access: set[str],
) -> tuple[int, list[str]]:
    risk, reasons = classify_risk(exercise)
    allowed_risk = {normalize(item) for item in spec.get("allowed_risk", [])}
    if allowed_risk and risk not in allowed_risk:
        return (-999, [])

    categories = {normalize(item) for item in spec.get("categories", [])}
    if categories and normalize(exercise.get("category")) not in categories:
        return (-999, [])

    name = normalize(exercise.get("name"))
    exercise_id = str(exercise.get("id", "")).strip()
    primary = {normalize(item) for item in exercise.get("primaryMuscles", [])}
    secondary = {normalize(item) for item in exercise.get("secondaryMuscles", [])}
    include = {normalize(item) for item in spec.get("include_muscles", [])}

    if include and not (primary & include or secondary & include or exercise_id in set(spec.get("exact_ids", []))):
        return (-999, [])

    score = 0
    notes = list(reasons)
    score += len(primary & include) * 8
    score += len(secondary & include) * 3
    if exercise_id in set(spec.get("exact_ids", [])):
        score += 14
    score += keyword_bonus(name, [normalize(item) for item in spec.get("name_keywords", [])])
    score -= keyword_penalty(name, [normalize(item) for item in spec.get("avoid_keywords", [])])

    equipment = normalize(exercise.get("equipment"))
    if equipment in {normalize(item) for item in spec.get("prefer_equipment", [])}:
        score += 5
    if equipment in {normalize(item) for item in spec.get("avoid_equipment", [])}:
        score -= 8
    if spec.get("practical_only"):
        if equipment in PRACTICAL_GYM_EQUIPMENT:
            score += 3
        elif equipment in {"body only", "exercise ball", "bands"}:
            score -= 4
    if "commercial gym" in equipment_access and equipment in PRACTICAL_GYM_EQUIPMENT:
        score += 2

    recent_count = recent_names.get(name, 0)
    if recent_count:
        score -= recent_count * (10 if wants_rotation else 5)
        notes.append("recently used")
    if name in latest_names:
        score -= 10
        notes.append("used in the latest session")
    if prefers_repeat and recent_count == 1 and exercise_id in set(spec.get("exact_ids", [])):
        score += 4
    if wants_rotation and recent_count == 0 and exercise_id in set(spec.get("exact_ids", [])):
        score += 3

    if recent_constraints_blob and any(token in recent_constraints_blob for token in name.split()[:3]):
        score -= 8
    if "do not repeat" in recent_constraints_blob and recent_count and spec.get("id") in {"posterior_chain", "knee_dominant"}:
        score -= 14

    feedback_score, feedback_notes = exercise_feedback_score(state, exercise)
    score += feedback_score
    notes.extend(feedback_notes)

    if risk == "prefer":
        score += 2
    elif risk == "caution":
        score -= 3

    return score, notes


def build_candidate_bucket(
    spec: dict[str, Any],
    exercises: list[Exercise],
    *,
    state: State,
    recent: list[dict[str, Any]],
    shape: dict[str, Any],
    equipment_access: set[str],
) -> list[dict[str, Any]]:
    recent_names = recent_name_counts(recent)
    latest_names = {normalize(name) for name in exercise_names(recent[0])} if recent else set()
    recent_constraints_blob = " ".join(
        normalize(item)
        for session in recent
        for item in session.get("next_session_constraints", [])
    )
    ranked: list[dict[str, Any]] = []
    exact_priority = {exercise_id: index for index, exercise_id in enumerate(spec.get("exact_ids", []))}
    for exercise in exercises:
        score, notes = score_candidate(
            exercise,
            spec,
            state=state,
            recent_names=recent_names,
            latest_names=latest_names,
            recent_constraints_blob=recent_constraints_blob,
            wants_rotation=bool(shape.get("wants_rotation")),
            prefers_repeat=bool(shape.get("prefers_repeat")),
            equipment_access=equipment_access,
        )
        if score <= -999:
            continue
        ranked.append(
            {
                "exercise_id": exercise.get("id"),
                "name": exercise.get("name"),
                "risk": classify_risk(exercise)[0],
                "category": exercise.get("category"),
                "equipment": exercise.get("equipment"),
                "primaryMuscles": exercise.get("primaryMuscles", []),
                "secondaryMuscles": exercise.get("secondaryMuscles", []),
                "instructions": exercise.get("instructions", [])[:3],
                "candidate_reasons": list(dict.fromkeys(notes)),
                "score": score,
                "exact_priority": exact_priority.get(exercise.get("id"), 999),
            }
        )
    ranked.sort(key=lambda item: (-item["score"], item["exact_priority"], item["name"]))
    return ranked[:8]


def choose_primary(bucket: list[dict[str, Any]], chosen_ids: set[str]) -> dict[str, Any]:
    for candidate in bucket:
        if candidate.get("exercise_id") not in chosen_ids:
            return candidate
    raise ValueError("No selectable candidate in bucket")


def choose_alternative(
    primary: dict[str, Any],
    bucket: list[dict[str, Any]],
    chosen_primary_ids: set[str],
) -> dict[str, Any] | None:
    primary_id = primary.get("exercise_id")
    primary_equipment = normalize(primary.get("equipment"))
    ranked = sorted(
        bucket,
        key=lambda item: (
            item.get("exercise_id") == primary_id,
            item.get("exercise_id") in chosen_primary_ids,
            normalize(item.get("equipment")) == primary_equipment,
            -int(item.get("score", 0)),
            item.get("name", ""),
        ),
    )
    for candidate in ranked:
        candidate_id = candidate.get("exercise_id")
        if not candidate_id or candidate_id == primary_id or candidate_id in chosen_primary_ids:
            continue
        return candidate
    return None


def classification_for(candidate: dict[str, Any], spec: dict[str, Any]) -> str:
    risk = normalize(candidate.get("risk"))
    if risk == "caution":
        return "possible with caution"
    return spec.get("classification_default", "favorable")


def exercise_reason(candidate: dict[str, Any], spec: dict[str, Any]) -> str:
    reason = spec.get("reason", "")
    equipment = candidate.get("equipment")
    if equipment:
        return f"{reason} Retrieved option uses {equipment}."
    return reason


def format_prescription(spec: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    prescription = clone(spec.get("prescription", {}))
    if spec.get("id") == "conditioning":
        if candidate.get("exercise_id") == "Rowing_Stationary":
            prescription.update({"sets": 1, "duration": "8 minutes", "rest_seconds": 0, "load": "easy to moderate steady pace"})
        elif candidate.get("exercise_id") == "Walking_Treadmill":
            prescription.update({"sets": 1, "duration": "10 minutes", "rest_seconds": 0, "load": "easy incline walk"})
    if candidate.get("exercise_id") == "Dead_Bug":
        prescription.update({"reps": 8, "load": "8 each side, slow bodyweight reps"})
    return prescription


def build_plan_exercise(
    primary: dict[str, Any],
    alternative: dict[str, Any] | None,
    spec: dict[str, Any],
) -> dict[str, Any]:
    payload = {
        "exercise_id": primary.get("exercise_id"),
        "name": primary.get("name"),
        **format_prescription(spec, primary),
        "classification": classification_for(primary, spec),
        "reason": exercise_reason(primary, spec),
        "execution_notes": [
            spec.get("execution_cue"),
            *(primary.get("instructions", [])[:1]),
        ],
        "alternatives": [],
    }
    if alternative:
        payload["alternatives"].append(
            {
                "exercise_id": alternative.get("exercise_id"),
                "name": alternative.get("name"),
                **format_prescription(spec, alternative),
                "load": format_prescription(spec, alternative).get("load"),
                "note": spec.get("alternative_note"),
            }
        )
    return payload


def sanitize_exercises(items: list[Exercise]) -> list[Exercise]:
    primary_ids = {
        str(item.get("exercise_id", "")).strip()
        for item in items
        if str(item.get("exercise_id", "")).strip()
    }
    primary_names = {
        normalize(item.get("name", ""))
        for item in items
        if normalize(item.get("name", ""))
    }

    sanitized: list[Exercise] = []
    for item in items:
        copy = clone(item)
        own_id = str(copy.get("exercise_id", "")).strip()
        own_name = normalize(copy.get("name", ""))
        filtered_alternatives: list[Exercise] = []
        seen_alt_ids: set[str] = set()
        seen_alt_names: set[str] = set()
        for alternative in copy.get("alternatives", []):
            alt_id = str(alternative.get("exercise_id", "")).strip()
            alt_name = normalize(alternative.get("name", ""))
            if not alt_id or not alt_name:
                continue
            if alt_id == own_id or alt_name == own_name:
                continue
            if alt_id in primary_ids or alt_name in primary_names:
                continue
            if alt_id in seen_alt_ids or alt_name in seen_alt_names:
                continue
            seen_alt_ids.add(alt_id)
            seen_alt_names.add(alt_name)
            filtered_alternatives.append(alternative)
        copy["alternatives"] = filtered_alternatives
        sanitized.append(copy)
    return sanitized


def planning_influences(recent: list[dict[str, Any]], shape: dict[str, Any]) -> list[dict[str, Any]]:
    if not recent:
        return []
    latest = recent[0]
    recent_names = exercise_names(latest)
    observation = latest.get("summary") or "Recent training history is available."
    if recent_names:
        observation += f" Recent exercises: {', '.join(recent_names[:3])}."
    if shape.get("type") == "upper" and shape.get("wants_rotation"):
        adjustment = "Rotate to a different emphasis so the next session does not feel like another copy of the recent lower-body backbone."
    elif shape.get("wants_rotation"):
        adjustment = "Rotate exact movements while keeping the session structure easy to trust."
    else:
        adjustment = "Reuse proven movement patterns where useful, but pick them from the broader retrieved pool instead of repeating blindly."
    session_id = latest.get("session_id")
    if not session_id:
        return []
    return [{"source_session_id": session_id, "observation": observation, "adjustment": adjustment}]


def build_plan(state: State) -> dict[str, Any]:
    ensure_session_ids(state)
    recent = recent_sessions(state, limit=3)
    shape = choose_session_shape(state, recent)
    equipment_access = infer_equipment_access(state)
    attention_flags = build_attention_flags(state, recent, bool(shape.get("wants_rotation")))
    exercises_db = load_exercises()
    bucket_specs = LOWER_BUCKET_SPECS if shape["type"] == "lower" else UPPER_BUCKET_SPECS

    candidate_buckets: dict[str, list[dict[str, Any]]] = {}
    chosen_primary_ids: set[str] = set()
    exercises: list[dict[str, Any]] = []

    for spec in bucket_specs:
        bucket = build_candidate_bucket(
            spec,
            exercises_db,
            state=state,
            recent=recent,
            shape=shape,
            equipment_access=equipment_access,
        )
        candidate_buckets[spec["id"]] = bucket
        if not bucket:
            continue
        primary = choose_primary(bucket, chosen_primary_ids)
        chosen_primary_ids.add(str(primary.get("exercise_id")))
        alternative = choose_alternative(primary, bucket, chosen_primary_ids)
        exercises.append(build_plan_exercise(primary, alternative, spec))

    notes = list(shape.get("notes", []))
    if shape.get("wants_rotation"):
        notes.append("Recent feedback asks for more exercise rotation when sessions start feeling too similar.")
    if shape.get("prefers_repeat") and not shape.get("wants_rotation"):
        notes.append("Sticky feedback still favors proven anchors when repetition pressure is low.")

    return {
        "title": shape["title"],
        "subtitle": "45-minute gym session",
        "goal": shape["goal"],
        "duration": "45 minutes",
        "motivation_focus": "Keep it simple, confidence-building, and grounded in retrieved options from local state plus the exercise DB.",
        "monitor": shape.get("monitor", []),
        "notes": notes,
        "planning_context": {
            "recent_sessions_considered": [session.get("session_id") for session in recent if session.get("session_id")],
            "recent_focus_counts": recent_focus_summary(state),
            "recent_exercise_names": sorted({name for session in recent for name in exercise_names(session)}),
            "recommended_attention": attention_flags,
            "candidate_buckets": candidate_buckets,
            "influences": planning_influences(recent, shape),
        },
        "exercises": sanitize_exercises(exercises),
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
