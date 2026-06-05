#!/usr/bin/env python3
from __future__ import annotations

import base64
import json
import mimetypes
import re
from html import escape
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
EXERCISES_PATH = ROOT / "free-exercise-db" / "dist" / "exercises.json"
EXERCISE_IMAGE_ROOT = ROOT / "free-exercise-db" / "exercises"
DEFAULT_OUTPUT_DIR = ROOT / "output" / "training-plans"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def slugify(text: str) -> str:
    chars = []
    for ch in text.lower():
        if ch.isalnum():
            chars.append(ch)
        elif ch in {" ", "-", "_"}:
            chars.append("-")
    slug = "".join(chars)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-") or "training-plan"


def build_exercise_lookup() -> dict[str, dict[str, Any]]:
    data = load_json(EXERCISES_PATH)
    lookup: dict[str, dict[str, Any]] = {}
    for exercise in data:
        lookup[exercise["id"].lower()] = exercise
        lookup[exercise["name"].lower()] = exercise
    return lookup


def image_to_data_url(path: Path) -> str | None:
    if not path.exists():
        return None
    mime, _ = mimetypes.guess_type(str(path))
    mime = mime or "image/jpeg"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def find_exercise(plan_item: dict[str, Any], lookup: dict[str, dict[str, Any]]) -> dict[str, Any] | None:
    candidates = [
        plan_item.get("exercise_id"),
        plan_item.get("id"),
        plan_item.get("name"),
    ]
    for candidate in candidates:
        if not candidate:
            continue
        exercise = lookup.get(str(candidate).lower())
        if exercise:
            return exercise
    return None


def resolve_images(exercise: dict[str, Any], limit: int = 2) -> list[str]:
    images: list[str] = []
    for relative_path in exercise.get("images", [])[:limit]:
        data_url = image_to_data_url(EXERCISE_IMAGE_ROOT / relative_path)
        if data_url:
            images.append(data_url)
    return images


def format_prescription(item: dict[str, Any]) -> str:
    parts: list[str] = []
    if item.get("sets") is not None:
        parts.append(f"{item['sets']} sets")
    if item.get("reps") is not None:
        parts.append(f"{item['reps']} reps")
    if item.get("duration") is not None:
        parts.append(str(item["duration"]))
    if item.get("rest_seconds") is not None:
        parts.append(f"{item['rest_seconds']}s rest")
    if item.get("load"):
        parts.append(str(item["load"]))
    return " · ".join(parts) or "See notes"


def prescription_fields(item: dict[str, Any]) -> list[tuple[str, str]]:
    fields: list[tuple[str, str]] = []
    if item.get("sets") is not None:
        fields.append(("Sets", str(item["sets"])))
    if item.get("reps") is not None:
        fields.append(("Reps", str(item["reps"])))
    if item.get("duration") is not None:
        fields.append(("Time", str(item["duration"])))
    if item.get("rest_seconds") is not None:
        fields.append(("Rest", f'{item["rest_seconds"]}s'))
    if item.get("load"):
        fields.append(("Load", str(item["load"])))
    return fields


def render_prescription_grid(item: dict[str, Any], css_class: str = "prescription-grid") -> str:
    fields = prescription_fields(item)
    if not fields:
        return ""
    cells = "".join(
        f'<div class="{css_class}-item"><div class="{css_class}-label">{escape(label)}</div><div class="{css_class}-value">{escape(value)}</div></div>'
        for label, value in fields
    )
    return f'<div class="{css_class}">{cells}</div>'


def render_list(items: list[str], css_class: str) -> str:
    if not items:
        return ""
    lis = "".join(f"<li>{escape(item)}</li>" for item in items)
    return f'<ul class="{css_class}">{lis}</ul>'


def render_titled_list(title: str, items: list[str], css_class: str) -> str:
    if not items:
        return ""
    return (
        f'<div class="{css_class}">'
        f"<h3>{escape(title)}</h3>"
        f"{render_list(items, f'{css_class}-list')}"
        f"</div>"
    )


def render_alternatives(items: list[Any], lookup: dict[str, dict[str, Any]]) -> str:
    if not items:
        return ""

    cards: list[str] = []
    for raw_item in items:
        if isinstance(raw_item, str):
            cards.append(
                '<article class="alternative-card text-only">'
                f'<p class="alternative-note">{escape(raw_item)}</p>'
                "</article>"
            )
            continue

        if not isinstance(raw_item, dict):
            continue

        exercise = find_exercise(raw_item, lookup)
        name = raw_item.get("name") or (exercise.get("name") if exercise else "Alternative")
        note = raw_item.get("note", "")
        images = resolve_images(exercise, limit=1) if exercise else []
        image_html = ""
        if images:
            image_html = (
                '<div class="alternative-image-wrap">'
                f'<img class="alternative-image" src="{images[0]}" alt="{escape(name)} alternative image" loading="lazy">'
                "</div>"
            )

        meta = []
        if exercise and exercise.get("equipment"):
            meta.append(str(exercise["equipment"]))
        if exercise and exercise.get("category"):
            meta.append(exercise["category"])
        meta_html = ""
        if meta:
            meta_html = f'<div class="alternative-meta">{escape(" · ".join(meta))}</div>'
        prescription_html = render_prescription_grid(raw_item, "alternative-prescription-grid")

        cards.append(
            '<article class="alternative-card">'
            f"{image_html}"
            '<div class="alternative-copy">'
            '<div class="alternative-header">'
            "<div>"
            f'<h4 class="alternative-title">{escape(name)}</h4>'
            f"{meta_html}"
            "</div>"
            '<div class="alternative-kicker">Swap</div>'
            "</div>"
            f"{prescription_html}"
            f'<p class="alternative-note">{escape(note)}</p>'
            "</div>"
            "</article>"
        )

    if not cards:
        return ""

    return (
        '<div class="alternatives">'
        '<div class="alternatives-heading">'
        "<h3>If This Is Taken</h3>"
        "<p>Keep the same prescription clarity.</p>"
        "</div>"
        f'<div class="alternatives-grid">{"".join(cards)}</div>'
        "</div>"
    )


def render_meta_pills(item: dict[str, Any], exercise: dict[str, Any] | None) -> str:
    pills: list[str] = []
    classification = item.get("classification")
    if classification:
        pills.append(f'<span class="meta-pill tone-classification">{escape(classification)}</span>')
    if exercise and exercise.get("category"):
        pills.append(f'<span class="meta-pill">{escape(exercise["category"])}</span>')
    if exercise and exercise.get("equipment"):
        pills.append(f'<span class="meta-pill">{escape(str(exercise["equipment"]))}</span>')
    return "".join(pills)


def interactive_training_script() -> str:
    return """
  <script>
    (() => {
      const cards = Array.from(document.querySelectorAll(".exercise-card"));
      if (!cards.length) return;

      const style = document.createElement("style");
      style.textContent = `
        .session-tracker,
        .session-review {
          margin-top: 16px;
          background: linear-gradient(180deg, var(--card-strong), var(--card));
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 10px 12px;
          box-shadow: var(--shadow);
        }
        .session-tracker-header,
        .session-review-header {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }
        .session-tracker {
          position: sticky;
          top: max(8px, env(safe-area-inset-top));
          z-index: 20;
        }
        .session-tracker-main {
          min-width: 0;
          flex: 1 1 auto;
        }
        .session-tracker-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
        }
        .session-kicker {
          display: inline-block;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.62rem;
          font-weight: 800;
          color: var(--accent);
        }
        .label-icon {
          margin-right: 0.38rem;
        }
        .session-title {
          margin-top: 2px;
          font-size: 0.98rem;
          line-height: 1.05;
          letter-spacing: -0.02em;
        }
        .session-subtitle,
        .session-copy-status,
        .exercise-status-copy,
        .session-help,
        .session-empty {
          color: var(--muted);
          font-size: 0.8rem;
          line-height: 1.25;
        }
        .session-progress-pill {
          flex: 0 0 auto;
          padding: 6px 9px;
          border-radius: 999px;
          background: var(--accent-quiet);
          border: 1px solid var(--soft-border);
          color: var(--accent);
          font-size: 0.74rem;
          font-weight: 800;
        }
        .session-action-row,
        .difficulty-row,
        .exercise-action-row,
        .timer-row,
        .set-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .session-button,
        .difficulty-button,
        .exercise-button,
        .swap-button {
          appearance: none;
          border: 1px solid var(--soft-border);
          background: var(--card-strong);
          color: var(--ink);
          border-radius: 999px;
          padding: 10px 14px;
          font: inherit;
          font-size: 0.9rem;
          font-weight: 800;
          line-height: 1.1;
          min-height: 50px;
          justify-content: center;
        }
        .session-button.primary,
        .exercise-button.primary,
        .swap-button {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }
        .session-button.primary,
        .exercise-button.primary {
          min-width: 148px;
        }
        .session-button,
        .exercise-button,
        .swap-button {
          display: inline-flex;
          align-items: center;
        }
        .difficulty-button.is-active,
        .exercise-card.is-current {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px oklch(0.91 0.03 150);
        }
        .exercise-card.is-complete {
          border-color: oklch(0.78 0.05 150);
          background: linear-gradient(180deg, var(--card), oklch(0.97 0.018 150 / 0.78));
        }
        .exercise-card.is-complete .prescription-grid,
        .exercise-card.is-complete .exercise-images,
        .exercise-card.is-complete .reason,
        .exercise-card.is-complete .execution-notes,
        .exercise-card.is-complete .alternatives,
        .exercise-card.is-complete .exercise-controls {
          display: none;
        }
        .exercise-card.is-complete .card-header {
          grid-template-columns: 40px minmax(0, 1fr);
          align-items: center;
        }
        .exercise-card.is-complete .exercise-state-bar {
          margin-top: 10px;
          padding-top: 0;
          border-top: 0;
        }
        .exercise-card.is-complete.is-expanded .prescription-grid,
        .exercise-card.is-complete.is-expanded .exercise-images,
        .exercise-card.is-complete.is-expanded .reason,
        .exercise-card.is-complete.is-expanded .execution-notes,
        .exercise-card.is-complete.is-expanded .alternatives,
        .exercise-card.is-complete.is-expanded .exercise-controls {
          display: revert;
        }
        .exercise-card.is-complete.is-expanded .exercise-images {
          display: grid;
        }
        .exercise-card.is-complete.is-expanded .exercise-controls {
          display: block;
        }
        .exercise-card.is-complete.is-expanded .exercise-complete-summary {
          display: none;
        }
        .exercise-state-bar {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--soft-border);
        }
        .exercise-state-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          background: var(--accent-quiet);
          border: 1px solid var(--soft-border);
          padding: 6px 10px;
          font-size: 0.78rem;
          font-weight: 800;
          color: var(--accent);
        }
        .exercise-status-copy {
          margin-top: 8px;
        }
        .exercise-complete-summary {
          display: none;
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--soft-border);
          background: var(--card-strong);
          color: var(--muted);
          font-size: 0.84rem;
          line-height: 1.35;
        }
        .exercise-card.is-complete .exercise-complete-summary {
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
        }
        .complete-thumb {
          width: 72px;
          height: 72px;
          object-fit: cover;
          border-radius: 12px;
          border: 1px solid var(--soft-border);
          background: var(--accent-quiet);
        }
        .complete-summary-copy {
          min-width: 0;
        }
        .complete-summary-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        .exercise-controls {
          margin-top: 12px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--soft-border);
          background: var(--card-strong);
          padding: 12px;
        }
        .exercise-card.is-current .exercise-controls {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px oklch(0.92 0.03 150);
        }
        .exercise-controls-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .exercise-control-card {
          border: 1px solid var(--soft-border);
          border-radius: var(--radius-md);
          background: var(--card);
          padding: 10px;
        }
        .exercise-control-label {
          color: var(--muted);
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 800;
        }
        .control-icon {
          margin-right: 0.3rem;
        }
        .exercise-control-value {
          margin-top: 6px;
          font-size: 1.25rem;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.03em;
        }
        .exercise-control-value.small {
          font-size: 0.96rem;
          line-height: 1.25;
          letter-spacing: normal;
        }
        .session-review {
          margin-bottom: 18px;
        }
        .session-review textarea {
          width: 100%;
          min-height: 120px;
          margin-top: 12px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--soft-border);
          padding: 12px;
          font: inherit;
          font-size: 0.92rem;
          background: var(--card-strong);
          color: var(--ink);
          resize: vertical;
        }
        .session-inline-note {
          margin-top: 8px;
          color: var(--muted);
          font-size: 0.82rem;
        }
        .session-copy-hint {
          margin-top: 12px;
          border-radius: var(--radius-md);
          border: 1px dashed var(--soft-border);
          background: var(--accent-quiet);
          padding: 10px 12px;
          color: var(--muted);
          font-size: 0.86rem;
          line-height: 1.4;
        }
        .elapsed-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 999px;
          border: 1px solid var(--soft-border);
          background: var(--card-strong);
          color: var(--muted);
          font-size: 0.74rem;
          font-weight: 700;
        }
        .swap-button {
          margin-top: 8px;
          width: 100%;
        }
        @media print {
          .session-tracker,
          .session-review,
          .exercise-controls,
          .swap-button,
          .exercise-state-bar {
            display: none !important;
          }
        }
        @media (max-width: 40rem) {
          .session-tracker {
            top: 0;
            border-top-left-radius: 0;
            border-top-right-radius: 0;
          }
          .session-tracker-header,
          .session-review-header {
            align-items: start;
          }
          .session-tracker-meta {
            flex-wrap: wrap;
            justify-content: flex-end;
          }
          .session-action-row,
          .difficulty-row,
          .exercise-action-row,
          .timer-row,
          .set-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
          .session-action-row > *,
          .difficulty-row > *,
          .exercise-action-row > *,
          .timer-row > *,
          .set-row > * {
            width: 100%;
          }
          .difficulty-row {
            grid-template-columns: 1fr 1fr;
          }
          .exercise-controls-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 28rem) {
          .session-action-row,
          .difficulty-row,
          .exercise-action-row,
          .timer-row,
          .set-row {
            grid-template-columns: 1fr;
          }
        }
      `;
      document.head.appendChild(style);

      const title = document.querySelector("h1")?.textContent?.trim() || document.title || "Training Plan";
      const slug = (value) =>
        String(value || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "training-plan";
      const currentUrl = window.location.href;
      const deriveTrainingId = () => {
        const pathParts = window.location.pathname.split("/").filter(Boolean);
        if (pathParts.length >= 2 && pathParts[pathParts.length - 2] === "training") {
          return pathParts[pathParts.length - 1];
        }
        const lastPart = pathParts[pathParts.length - 1] || "";
        const fileStem = lastPart.replace(/\\.html?$/i, "");
        return slug(fileStem || title);
      };
      const trainingId = deriveTrainingId();
      const storageKey = `training-session:${trainingId}`;
      const legacyStorageKey = `training-session:${slug(title)}`;

      const parseDurationSeconds = (value) => {
        if (!value) return null;
        const raw = String(value).trim().toLowerCase();
        if (!raw) return null;
        if (/^\\d+$/.test(raw)) return Number(raw);
        const colon = raw.match(/^(\\d+):(\\d{2})$/);
        if (colon) return Number(colon[1]) * 60 + Number(colon[2]);
        const minute = raw.match(/^(\\d+)\\s*(m|min|mins|minute|minutes)$/);
        if (minute) return Number(minute[1]) * 60;
        const second = raw.match(/^(\\d+)\\s*(s|sec|secs|second|seconds)$/);
        if (second) return Number(second[1]);
        return null;
      };

      const formatClock = (seconds) => {
        const safe = Math.max(0, Number(seconds || 0));
        const mins = Math.floor(safe / 60);
        const secs = safe % 60;
        return `${mins}:${String(secs).padStart(2, "0")}`;
      };

      const escapeHtml = (value) =>
        String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");

      const parseGrid = (container, itemClassPrefix) =>
        Array.from(container?.querySelectorAll(`.${itemClassPrefix}-item`) || []).map((cell) => ({
          label: cell.querySelector(`.${itemClassPrefix}-label`)?.textContent?.trim() || "",
          value: cell.querySelector(`.${itemClassPrefix}-value`)?.textContent?.trim() || "",
        })).filter((field) => field.label && field.value);

      const imagesFrom = (container, selector) =>
        Array.from(container?.querySelectorAll(selector) || []).map((img) => ({
          src: img.getAttribute("src") || "",
          alt: img.getAttribute("alt") || "",
        })).filter((img) => img.src);

      const splitMeta = (text) =>
        String(text || "")
          .split("·")
          .map((part) => part.trim())
          .filter(Boolean);

      const fieldValue = (fields, label) =>
        fields.find((field) => field.label.toLowerCase() === label)?.value || null;

      const parseMainVariant = (card) => {
        const fields = parseGrid(card.querySelector(".prescription-grid"), "prescription-grid");
        return {
          name: card.querySelector("h2")?.textContent?.trim() || "Exercise",
          prescriptionSummary: card.querySelector(".prescription-summary")?.textContent?.trim() || "",
          fields,
          meta: Array.from(card.querySelectorAll(".meta-pills .meta-pill")).map((pill) => pill.textContent?.trim()).filter(Boolean),
          images: imagesFrom(card.querySelector(".exercise-images"), "img"),
          reason: card.querySelector(".reason")?.textContent?.trim() || "",
          executionNotes: Array.from(card.querySelectorAll(".execution-notes li")).map((item) => item.textContent?.trim()).filter(Boolean),
          note: "",
          setsTotal: Number.parseInt(fieldValue(fields, "sets") || "", 10) || null,
          repsLabel: fieldValue(fields, "reps") || "",
          durationLabel: fieldValue(fields, "time") || "",
          durationSeconds: parseDurationSeconds(fieldValue(fields, "time")),
          restLabel: fieldValue(fields, "rest") || "",
          loadLabel: fieldValue(fields, "load") || "",
        };
      };

      const parseAltVariant = (card) => {
        const fields = parseGrid(card.querySelector(".alternative-prescription-grid"), "alternative-prescription-grid");
        return {
          name: card.querySelector(".alternative-title")?.textContent?.trim() || "Alternative",
          prescriptionSummary: fields.map((field) => `${field.value} ${field.label.toLowerCase()}`).join(" · "),
          fields,
          meta: splitMeta(card.querySelector(".alternative-meta")?.textContent?.trim() || ""),
          libraryLine: "",
          images: imagesFrom(card, ".alternative-image"),
          reason: "",
          executionNotes: [],
          note: card.querySelector(".alternative-note")?.textContent?.trim() || "",
          setsTotal: Number.parseInt(fieldValue(fields, "sets") || "", 10) || null,
          repsLabel: fieldValue(fields, "reps") || "",
          durationLabel: fieldValue(fields, "time") || "",
          durationSeconds: parseDurationSeconds(fieldValue(fields, "time")),
          restLabel: fieldValue(fields, "rest") || "",
          loadLabel: fieldValue(fields, "load") || "",
        };
      };

      const exercises = cards.map((card, index) => {
        const mainVariant = parseMainVariant(card);
        const alternatives = Array.from(card.querySelectorAll(".alternative-card"));
        const swapVariants = [];
        const noteOnlyAlternatives = [];

        for (const altCard of alternatives) {
          const titleNode = altCard.querySelector(".alternative-title");
          if (titleNode) {
            swapVariants.push(parseAltVariant(altCard));
          } else {
            const note = altCard.textContent?.trim();
            if (note) noteOnlyAlternatives.push(note);
          }
        }

        return {
          stepNumber: index + 1,
          originalName: mainVariant.name,
          variants: [mainVariant, ...swapVariants],
          noteOnlyAlternatives,
        };
      });

      const defaultState = {
        startedAt: null,
        completedAt: null,
        currentExerciseIndex: 0,
        difficulty: "",
        notes: "",
        exerciseStates: exercises.map((exercise) => ({
          variantOrder: exercise.variants.map((_, idx) => idx),
          completedSets: 0,
          timerRemainingSeconds: exercise.variants[0].durationSeconds,
          timerEndsAt: null,
          completed: false,
          expandedCompleted: false,
          startedAt: null,
          completedAt: null,
        })),
      };

      const loadState = () => {
        try {
          const raw = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey) || "{}";
          return Object.assign({}, defaultState, JSON.parse(raw));
        } catch {
          return JSON.parse(JSON.stringify(defaultState));
        }
      };

      let state = loadState();

      const cloneDefaultExerciseState = (exercise) => ({
        variantOrder: exercise.variants.map((_, idx) => idx),
        completedSets: 0,
        timerRemainingSeconds: exercise.variants[0].durationSeconds,
        timerEndsAt: null,
        completed: false,
        expandedCompleted: false,
        startedAt: null,
        completedAt: null,
      });

      const normalizeState = () => {
        if (!Array.isArray(state.exerciseStates)) {
          state.exerciseStates = defaultState.exerciseStates.map((exercise) => ({ ...exercise }));
        }

        exercises.forEach((exercise, index) => {
          const existing = state.exerciseStates[index];
          if (!existing) {
            state.exerciseStates[index] = cloneDefaultExerciseState(exercise);
            return;
          }

          const order = Array.isArray(existing.variantOrder) ? existing.variantOrder.filter((value) => Number.isInteger(value) && value >= 0 && value < exercise.variants.length) : [];
          const missing = exercise.variants.map((_, idx) => idx).filter((idx) => !order.includes(idx));
          existing.variantOrder = [...order, ...missing];
          if (existing.timerRemainingSeconds == null) {
            existing.timerRemainingSeconds = exercise.variants[existing.variantOrder[0]].durationSeconds;
          }
        });

        state.exerciseStates = state.exerciseStates.slice(0, exercises.length);
        if (!Number.isInteger(state.currentExerciseIndex) || state.currentExerciseIndex < 0 || state.currentExerciseIndex >= exercises.length) {
          state.currentExerciseIndex = 0;
        }
      };

      const saveState = () => {
        localStorage.setItem(storageKey, JSON.stringify(state));
        if (legacyStorageKey !== storageKey) {
          localStorage.removeItem(legacyStorageKey);
        }
      };

      const getExerciseState = (index) => state.exerciseStates[index];
      const getCurrentVariant = (index) => exercises[index].variants[getExerciseState(index).variantOrder[0]];
      const getAlternativeVariants = (index) => getExerciseState(index).variantOrder.slice(1).map((variantIndex) => ({ variant: exercises[index].variants[variantIndex], variantIndex }));
      const getRemainingTimerSeconds = (index) => {
        const exerciseState = getExerciseState(index);
        if (exerciseState.timerEndsAt) {
          return Math.max(0, Math.ceil((exerciseState.timerEndsAt - Date.now()) / 1000));
        }
        return Math.max(0, Number(exerciseState.timerRemainingSeconds || 0));
      };

      const stopOtherTimers = (activeIndex) => {
        state.exerciseStates.forEach((exerciseState, index) => {
          if (index !== activeIndex && exerciseState.timerEndsAt) {
            exerciseState.timerRemainingSeconds = getRemainingTimerSeconds(index);
            exerciseState.timerEndsAt = null;
          }
        });
      };

      const nextIncompleteIndex = () => state.exerciseStates.findIndex((exerciseState) => !exerciseState.completed);

      const startSession = (index = nextIncompleteIndex() >= 0 ? nextIncompleteIndex() : 0) => {
        const now = new Date().toISOString();
        if (!state.startedAt) state.startedAt = now;
        state.currentExerciseIndex = Math.max(0, index);
        const exerciseState = getExerciseState(state.currentExerciseIndex);
        if (exerciseState && !exerciseState.startedAt) exerciseState.startedAt = now;
        saveState();
        renderAll();
      };

      const scrollCardIntoView = (index) => {
        const card = cards[index];
        if (!card) return;
        const trackerHeight = tracker ? tracker.getBoundingClientRect().height : 0;
        const gap = 14;
        const cardTop = card.getBoundingClientRect().top + window.scrollY;
        const targetTop = Math.max(0, cardTop - trackerHeight - gap);
        window.scrollTo({ top: targetTop, behavior: "smooth" });
      };

      const focusExercise = (index, scroll = false) => {
        if (!state.startedAt) startSession(index);
        state.currentExerciseIndex = index;
        const exerciseState = getExerciseState(index);
        if (exerciseState && !exerciseState.startedAt) {
          exerciseState.startedAt = new Date().toISOString();
        }
        saveState();
        renderAll();
        if (scroll) {
          window.requestAnimationFrame(() => scrollCardIntoView(index));
        }
      };

      const completeSet = (index, delta) => {
        const exerciseState = getExerciseState(index);
        const variant = getCurrentVariant(index);
        if (!variant.setsTotal) return;
        if (!state.startedAt) startSession(index);
        exerciseState.completedSets = Math.max(0, Math.min(variant.setsTotal, Number(exerciseState.completedSets || 0) + delta));
        saveState();
        renderAll();
      };

      const toggleTimer = (index) => {
        const exerciseState = getExerciseState(index);
        const variant = getCurrentVariant(index);
        if (!variant.durationSeconds) return;
        if (!state.startedAt) startSession(index);
        if (exerciseState.timerEndsAt) {
          exerciseState.timerRemainingSeconds = getRemainingTimerSeconds(index);
          exerciseState.timerEndsAt = null;
        } else {
          stopOtherTimers(index);
          const remaining = exerciseState.timerRemainingSeconds ?? variant.durationSeconds;
          exerciseState.timerEndsAt = Date.now() + remaining * 1000;
        }
        saveState();
        renderAll();
      };

      const resetTimer = (index) => {
        const exerciseState = getExerciseState(index);
        const variant = getCurrentVariant(index);
        exerciseState.timerEndsAt = null;
        exerciseState.timerRemainingSeconds = variant.durationSeconds;
        saveState();
        renderAll();
      };

      const advanceCurrentExercise = () => {
        const candidate = nextIncompleteIndex();
        state.currentExerciseIndex = candidate >= 0 ? candidate : Math.max(0, exercises.length - 1);
      };

      const markExerciseDone = (index, completed) => {
        const exerciseState = getExerciseState(index);
        if (!state.startedAt) startSession(index);
        exerciseState.completed = completed;
        exerciseState.completedAt = completed ? new Date().toISOString() : null;
        exerciseState.expandedCompleted = false;
        if (completed) {
          exerciseState.timerEndsAt = null;
          if (exerciseState.timerRemainingSeconds == null) {
            exerciseState.timerRemainingSeconds = getCurrentVariant(index).durationSeconds;
          }
        }
        if (completed) {
          advanceCurrentExercise();
          if (state.exerciseStates.every((item) => item.completed)) {
            state.completedAt = state.completedAt || new Date().toISOString();
          }
        } else {
          state.completedAt = null;
          state.currentExerciseIndex = index;
        }
        saveState();
        renderAll();
      };

      const swapVariant = (index, variantIndex) => {
        const exerciseState = getExerciseState(index);
        const order = exerciseState.variantOrder.slice();
        const altPosition = order.indexOf(variantIndex);
        if (altPosition <= 0) return;
        [order[0], order[altPosition]] = [order[altPosition], order[0]];
        exerciseState.variantOrder = order;
        exerciseState.completedSets = 0;
        exerciseState.timerEndsAt = null;
        exerciseState.timerRemainingSeconds = getCurrentVariant(index).durationSeconds;
        exerciseState.completed = false;
        exerciseState.completedAt = null;
        state.currentExerciseIndex = index;
        saveState();
        renderAll();
      };

      const completedCount = () => state.exerciseStates.filter((exerciseState) => exerciseState.completed).length;
      const formatElapsed = (startedAt, completedAt) => {
        if (!startedAt) return "0:00";
        const start = new Date(startedAt).getTime();
        const end = completedAt ? new Date(completedAt).getTime() : Date.now();
        const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
        return formatClock(totalSeconds);
      };

      const renderFieldGrid = (fields, classPrefix) => {
        if (!fields.length) return "";
        return `<div class="${classPrefix}">${fields.map((field) => `
          <div class="${classPrefix}-item">
            <div class="${classPrefix}-label">${escapeHtml(field.label)}</div>
            <div class="${classPrefix}-value">${escapeHtml(field.value)}</div>
          </div>`).join("")}
        </div>`;
      };

      const renderImages = (images, cardClass) => {
        if (!images.length) return "";
        const className = cardClass === "main" ? "exercise-images" : "alternative-image-wrap";
        const imageClass = cardClass === "main" ? "" : ' class="alternative-image"';
        return `<div class="${className}">${images.map((image, imageIndex) => `<img${imageClass} src="${image.src}" alt="${escapeHtml(image.alt || `Exercise image ${imageIndex + 1}`)}" loading="lazy">`).join("")}</div>`;
      };

      const renderMetaPills = (meta) =>
        meta.length ? `<div class="meta-pills">${meta.map((item) => `<span class="meta-pill">${escapeHtml(item)}</span>`).join("")}</div>` : "";

      const renderExerciseControls = (exercise, exerciseState, index) => {
        const currentVariant = getCurrentVariant(index);
        const setCounter = currentVariant.setsTotal ? `
          <div class="exercise-control-card">
            <div class="exercise-control-label"><span class="control-icon">🔢</span>Set Counter</div>
            <div class="exercise-control-value">${exerciseState.completedSets || 0}/${currentVariant.setsTotal}</div>
            <div class="session-inline-note">${currentVariant.repsLabel ? `${escapeHtml(currentVariant.repsLabel)} reps each set.` : "Count each finished set."}</div>
            <div class="set-row">
              <button type="button" class="exercise-button primary" data-action="complete-set" data-index="${index}">✅ Set done</button>
              <button type="button" class="exercise-button" data-action="undo-set" data-index="${index}">↺ Undo</button>
            </div>
          </div>` : "";

        const timerCard = currentVariant.durationSeconds ? `
          <div class="exercise-control-card">
            <div class="exercise-control-label"><span class="control-icon">⏱️</span>Timer</div>
            <div class="exercise-control-value">${formatClock(getRemainingTimerSeconds(index))}</div>
            <div class="session-inline-note">${escapeHtml(currentVariant.durationLabel || `${currentVariant.durationSeconds}s`)}</div>
            <div class="timer-row">
              <button type="button" class="exercise-button primary" data-action="toggle-timer" data-index="${index}">${exerciseState.timerEndsAt ? "⏸ Pause" : "▶ Start timer"}</button>
              <button type="button" class="exercise-button" data-action="reset-timer" data-index="${index}">↺ Reset</button>
            </div>
          </div>` : "";

        const statusCard = `
          <div class="exercise-control-card">
            <div class="exercise-control-label"><span class="control-icon">📍</span>Status</div>
            <div class="exercise-control-value small">${exerciseState.completed ? "Marked complete." : "Still in progress."}</div>
            <div class="session-inline-note">${exerciseState.completed ? "Undo if you want to reopen this exercise." : "Use this when the exercise is fully done."}</div>
            <div class="exercise-action-row">
              <button type="button" class="exercise-button ${exerciseState.completed ? "" : "primary"}" data-action="${exerciseState.completed ? "mark-undone" : "mark-done"}" data-index="${index}">
                ${exerciseState.completed ? "↺ Reopen" : "🏁 Mark done"}
              </button>
              <button type="button" class="exercise-button" data-action="focus-exercise" data-index="${index}">${state.currentExerciseIndex === index ? "🎯 Current" : "🎯 Make current"}</button>
            </div>
          </div>`;

        return `<div class="exercise-controls">
          <div class="exercise-controls-grid">
            ${setCounter || ""}
            ${timerCard || ""}
            ${statusCard}
          </div>
          <div class="exercise-status-copy">${state.currentExerciseIndex === index ? "This is the one the tracker follows." : "Make this current if you want the tracker to follow it."}</div>
        </div>`;
      };

      const renderExerciseCard = (card, exercise, index) => {
        const exerciseState = getExerciseState(index);
        const currentVariant = getCurrentVariant(index);
        const alternatives = getAlternativeVariants(index);
        card.classList.toggle("is-current", state.currentExerciseIndex === index);
        card.classList.toggle("is-complete", Boolean(exerciseState.completed));
        card.classList.toggle("is-expanded", Boolean(exerciseState.expandedCompleted));

        card.innerHTML = `
          <div class="card-header">
            <div class="step-badge">${exercise.stepNumber}</div>
            <div class="card-intro">
              <h2>${escapeHtml(currentVariant.name)}</h2>
              <div class="prescription-summary">${escapeHtml(currentVariant.prescriptionSummary)}</div>
              ${renderMetaPills(currentVariant.meta)}
            </div>
          </div>
          ${renderFieldGrid(currentVariant.fields, "prescription-grid")}
          ${renderImages(currentVariant.images, "main")}
          ${currentVariant.reason ? `<p class="reason">${escapeHtml(currentVariant.reason)}</p>` : ""}
          ${currentVariant.executionNotes.length ? `<ul class="execution-notes">${currentVariant.executionNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}
          <div class="exercise-complete-summary">
            ${currentVariant.images[0] ? `<img class="complete-thumb" src="${currentVariant.images[0].src}" alt="${escapeHtml(currentVariant.images[0].alt || currentVariant.name)}">` : ""}
            <div class="complete-summary-copy">
              <div>${exercise.originalName !== currentVariant.name ? `Used ${escapeHtml(currentVariant.name)} instead of ${escapeHtml(exercise.originalName)}. ` : ""}${currentVariant.setsTotal ? `Sets: ${exerciseState.completedSets || 0}/${currentVariant.setsTotal}. ` : ""}${currentVariant.durationSeconds ? `Time target: ${escapeHtml(currentVariant.durationLabel || `${currentVariant.durationSeconds}s`)}. ` : ""}${exerciseState.completedAt ? `Marked done.` : ""}</div>
              <div class="complete-summary-actions">
                <button type="button" class="exercise-button" data-action="toggle-complete-details" data-index="${index}">👁 Details</button>
                <button type="button" class="exercise-button" data-action="mark-undone" data-index="${index}">↺ Reopen</button>
              </div>
            </div>
          </div>
          <div class="exercise-state-bar">
            <div class="exercise-state-pill">${exerciseState.completed ? "Done" : state.currentExerciseIndex === index ? "Current" : "Queued"}</div>
            <div class="session-subtitle">${exercise.originalName !== currentVariant.name ? `Swapped from ${escapeHtml(exercise.originalName)}` : "Original choice active"}</div>
          </div>
          ${renderExerciseControls(exercise, exerciseState, index)}
          ${(alternatives.length || exercise.noteOnlyAlternatives.length) ? `
            <div class="alternatives">
              <div class="alternatives-heading">
                <h3><span class="label-icon">🔁</span>Quick Swap</h3>
                <p>Pick one and it becomes the current exercise.</p>
              </div>
              <div class="alternatives-grid">
                ${alternatives.map(({ variant, variantIndex }) => `
                  <article class="alternative-card">
                    ${renderImages(variant.images, "alternative")}
                    <div class="alternative-copy">
                      <div class="alternative-header">
                        <div>
                          <h4 class="alternative-title">${escapeHtml(variant.name)}</h4>
                          ${variant.meta.length ? `<div class="alternative-meta">${escapeHtml(variant.meta.join(" · "))}</div>` : ""}
                        </div>
                        <div class="alternative-kicker">Swap</div>
                      </div>
                      ${renderFieldGrid(variant.fields, "alternative-prescription-grid")}
                      ${variant.note ? `<p class="alternative-note">${escapeHtml(variant.note)}</p>` : ""}
                      <button type="button" class="swap-button" data-action="swap-variant" data-index="${index}" data-variant-index="${variantIndex}">🔁 Use this instead</button>
                    </div>
                  </article>`).join("")}
                ${exercise.noteOnlyAlternatives.map((note) => `<article class="alternative-card text-only"><p class="alternative-note">${escapeHtml(note)}</p></article>`).join("")}
              </div>
            </div>` : ""}
        `;
      };

      const stack = document.querySelector(".stack");
      const tracker = document.createElement("section");
      tracker.className = "session-tracker";
      stack.parentElement.insertBefore(tracker, stack);

      const review = document.createElement("section");
      review.className = "session-review";
      stack.insertAdjacentElement("afterend", review);

      const buildSummary = () => {
        const payload = {
          id: trainingId,
          t: title,
          u: currentUrl,
          sa: state.startedAt || "",
          ea: state.completedAt || "",
          d: state.difficulty || "",
          n: state.notes || "",
          ex: exercises.map((exercise, index) => {
            const exerciseState = getExerciseState(index);
            const currentVariant = getCurrentVariant(index);
            return {
              s: exercise.stepNumber,
              p: exercise.originalName,
              a: currentVariant.name,
              sw: exercise.originalName !== currentVariant.name ? 1 : 0,
              ps: currentVariant.prescriptionSummary || "",
              cs: exerciseState.completedSets || 0,
              st: currentVariant.setsTotal || 0,
              tt: currentVariant.durationSeconds || 0,
              ok: exerciseState.completed ? 1 : 0,
            };
          }),
        };

        return `TL1 ${JSON.stringify(payload)}`;
      };

      const renderTracker = () => {
        const total = exercises.length;
        const done = completedCount();
        const currentIndex = state.currentExerciseIndex;
        const currentVariant = exercises[currentIndex] ? getCurrentVariant(currentIndex) : null;
        tracker.innerHTML = `
          <div class="session-tracker-header">
            <div class="session-tracker-main">
              <div class="session-kicker"><span class="label-icon">🎯</span>Session Tracker</div>
              <div class="session-title">${state.startedAt ? escapeHtml(currentVariant ? currentVariant.name : "Session complete") : "Start when you are ready"}</div>
              <div class="session-subtitle">${state.startedAt ? (currentVariant ? `Exercise ${currentIndex + 1} of ${total}.` : "All exercises marked done.") : "No login. Everything stays on this device."}</div>
            </div>
            <div class="session-tracker-meta">
              <div class="elapsed-pill">⏱ ${formatElapsed(state.startedAt, state.completedAt)}</div>
              <div class="session-progress-pill">${done}/${total} done</div>
            </div>
          </div>
          <div class="session-action-row">
            ${state.startedAt ? `<button type="button" class="session-button primary" data-action="jump-current" data-index="${currentIndex}">↘ Current exercise</button>` : `<button type="button" class="session-button primary" data-action="start-session">▶ Start session</button>`}
            <button type="button" class="session-button" data-action="copy-log">📋 Copy log</button>
          </div>
          <div class="session-copy-status" id="copy-status">${state.completedAt ? "" : "Use the card below. Count sets, run timers, swap if needed, then mark done."}</div>
        `;
      };

      const renderReview = () => {
        review.innerHTML = `
          <div class="session-review-header">
            <div>
              <div class="session-kicker"><span class="label-icon">📝</span>Finish</div>
              <div class="session-title">Rate it, add notes, copy</div>
            </div>
            <div class="session-progress-pill">${state.completedAt ? "Ready to copy" : "In progress"}</div>
          </div>
          <div class="difficulty-row">
            ${[
              ["easy", "🙂 Easy"],
              ["right", "👌 Right"],
              ["hard", "🥵 Hard"],
              ["too_much", "⚠️ Too much"],
            ].map(([level, label]) => `<button type="button" class="difficulty-button ${state.difficulty === level ? "is-active" : ""}" data-action="set-difficulty" data-level="${level}">${label}</button>`).join("")}
          </div>
          <div class="session-action-row">
            <button type="button" class="session-button" data-action="${state.completedAt ? "reopen-training" : "end-training"}">${state.completedAt ? "↺ Reopen training" : "🏁 End training"}</button>
          </div>
          <textarea id="session-notes" placeholder="Anything to remember: pain, energy, substitutions, confidence, pacing, or anything unusual?">${escapeHtml(state.notes || "")}</textarea>
          <div class="session-action-row">
            <button type="button" class="session-button primary" data-action="copy-log">📋 Copy training log</button>
          </div>
        `;

        const notesField = review.querySelector("#session-notes");
        notesField?.addEventListener("input", (event) => {
          state.notes = event.target.value;
          saveState();
        });
      };

      const renderExerciseCards = () => {
        cards.forEach((card, index) => renderExerciseCard(card, exercises[index], index));
      };

      const renderAll = () => {
        normalizeState();
        renderExerciseCards();
        renderTracker();
        renderReview();
      };

      const copyLog = async () => {
        const text = buildSummary();
        try {
          if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
          await navigator.clipboard.writeText(text);
          const status = document.getElementById("copy-status");
          if (status) status.textContent = "Copied. Paste it back into chat.";
        } catch {
          const status = document.getElementById("copy-status");
          if (status) status.textContent = "Copy failed here.";
        }
      };

      const endTraining = (completed) => {
        state.completedAt = completed ? new Date().toISOString() : null;
        saveState();
        renderAll();
      };

      document.addEventListener("click", (event) => {
        const target = event.target.closest("[data-action]");
        if (!target) return;
        const action = target.getAttribute("data-action");
        const index = Number.parseInt(target.getAttribute("data-index") || "", 10);

        if (action === "start-session") startSession();
        if (action === "focus-exercise" && Number.isInteger(index)) focusExercise(index);
        if (action === "jump-current" && Number.isInteger(index)) focusExercise(index, true);
        if (action === "complete-set" && Number.isInteger(index)) completeSet(index, 1);
        if (action === "undo-set" && Number.isInteger(index)) completeSet(index, -1);
        if (action === "toggle-timer" && Number.isInteger(index)) toggleTimer(index);
        if (action === "reset-timer" && Number.isInteger(index)) resetTimer(index);
        if (action === "mark-done" && Number.isInteger(index)) markExerciseDone(index, true);
        if (action === "mark-undone" && Number.isInteger(index)) markExerciseDone(index, false);
        if (action === "toggle-complete-details" && Number.isInteger(index)) {
          const exerciseState = getExerciseState(index);
          exerciseState.expandedCompleted = !exerciseState.expandedCompleted;
          saveState();
          renderAll();
        }
        if (action === "swap-variant" && Number.isInteger(index)) {
          const variantIndex = Number.parseInt(target.getAttribute("data-variant-index") || "", 10);
          if (Number.isInteger(variantIndex)) swapVariant(index, variantIndex);
        }
        if (action === "copy-log") copyLog();
        if (action === "end-training") endTraining(true);
        if (action === "reopen-training") endTraining(false);
        if (action === "set-difficulty") {
          state.difficulty = target.getAttribute("data-level") || "";
          saveState();
          renderAll();
        }
      });

      window.setInterval(() => {
        let changed = false;
        state.exerciseStates.forEach((exerciseState, index) => {
          if (!exerciseState.timerEndsAt) return;
          const remaining = getRemainingTimerSeconds(index);
          if (remaining <= 0) {
            exerciseState.timerEndsAt = null;
            exerciseState.timerRemainingSeconds = 0;
            changed = true;
          } else {
            changed = true;
          }
        });
        if (changed) {
          saveState();
          normalizeState();
          renderExerciseCards();
          renderTracker();
        }
      }, 500);

      renderAll();
    })();
  </script>
"""


def render_plan(plan: dict[str, Any], lookup: dict[str, dict[str, Any]]) -> str:
    title = plan.get("title", "Training Plan")
    subtitle = plan.get("subtitle", "")
    notes = plan.get("notes", [])
    monitors = plan.get("monitor", [])
    motivation = plan.get("motivation_focus", "")
    exercises_html: list[str] = []

    for index, item in enumerate(plan.get("exercises", []), start=1):
        exercise = find_exercise(item, lookup)
        name = item.get("name") or (exercise.get("name") if exercise else f"Exercise {index}")
        images = resolve_images(exercise, limit=2) if exercise else []
        image_html = ""
        if images:
            imgs = "".join(
                f'<img src="{src}" alt="{escape(name)} illustration {i + 1}" loading="lazy">'
                for i, src in enumerate(images)
            )
            image_html = f'<div class="exercise-images">{imgs}</div>'

        exercises_html.append(
            f"""
            <section class="exercise-card">
              <div class="card-header">
                <div class="step-badge">{index}</div>
                <div class="card-intro">
                  <h2>{escape(name)}</h2>
                  <div class="prescription-summary">{escape(format_prescription(item))}</div>
                  <div class="meta-pills">{render_meta_pills(item, exercise)}</div>
                </div>
              </div>
              {render_prescription_grid(item)}
              {image_html}
              <p class="reason">{escape(item.get("reason", ""))}</p>
              {render_list(item.get("execution_notes", []), "execution-notes")}
              {render_alternatives(item.get("alternatives", []), lookup)}
            </section>
            """
        )

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{escape(title)}</title>
  <style>
    /* Hallmark · pre-emit critique: P4 H5 E4 S4 R4 V3 */
    /* Hallmark · macrostructure: stacked training cards · tone: utilitarian · anchor hue: pine */
    :root {{
      color-scheme: light;
      --bg: oklch(0.97 0.012 95);
      --bg-2: oklch(0.94 0.016 95);
      --card: oklch(0.985 0.006 95 / 0.94);
      --card-strong: oklch(0.992 0.004 95);
      --ink: oklch(0.23 0.02 150);
      --muted: oklch(0.5 0.015 145);
      --accent: oklch(0.42 0.09 157);
      --accent-soft: oklch(0.92 0.03 150);
      --accent-quiet: oklch(0.965 0.012 150);
      --border: oklch(0.86 0.015 90);
      --soft-border: oklch(0.88 0.01 90 / 0.9);
      --shadow: 0 12px 28px oklch(0.28 0.02 145 / 0.08);
      --warm: oklch(0.56 0.11 68);
      --warm-soft: oklch(0.94 0.035 78);
      --font: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --radius-xl: 24px;
      --radius-lg: 18px;
      --radius-md: 14px;
      --radius-sm: 12px;
    }}
    * {{ box-sizing: border-box; }}
    html,
    body {{
      overflow-x: clip;
    }}
    body {{
      margin: 0;
      font-family: var(--font);
      background:
        radial-gradient(circle at top left, oklch(1 0 0 / 0.65), transparent 34%),
        linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%);
      color: var(--ink);
      line-height: 1.42;
    }}
    main {{
      max-width: 760px;
      margin: 0 auto;
      padding:
        max(12px, env(safe-area-inset-top))
        max(12px, env(safe-area-inset-right))
        max(32px, env(safe-area-inset-bottom))
        max(12px, env(safe-area-inset-left));
    }}
    .hero {{
      background: linear-gradient(180deg, var(--card-strong), var(--card));
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 18px;
      box-shadow: var(--shadow);
    }}
    h1, h2, h3, p {{ margin: 0; }}
    h1 {{
      font-size: clamp(1.75rem, 3vw + 1rem, 2.45rem);
      line-height: 0.98;
      margin: 6px 0 6px;
      letter-spacing: -0.04em;
      overflow-wrap: anywhere;
      min-width: 0;
    }}
    .eyebrow {{
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.7rem;
      font-weight: 800;
      color: var(--accent);
    }}
    .subtitle {{
      color: var(--muted);
      font-size: 1rem;
    }}
    .hero-copy {{
      max-width: 34rem;
    }}
    .section-grid {{
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 16px;
    }}
    .section {{
      background: var(--card);
      border: 1px solid var(--soft-border);
      border-radius: var(--radius-lg);
      padding: 14px;
      box-shadow: 0 8px 20px oklch(0.28 0.02 145 / 0.04);
    }}
    .section h3 {{
      margin-bottom: 8px;
      font-size: 0.92rem;
      letter-spacing: -0.01em;
    }}
    .section p,
    .section li,
    .reason,
    .alternative-note {{
      font-size: 0.96rem;
      line-height: 1.38;
    }}
    .section ul,
    .execution-notes {{
      margin: 0;
      padding-left: 18px;
    }}
    .monitor-list li::marker {{
      color: var(--warm);
    }}
    .exercise-card {{
      margin-top: 14px;
      background: var(--card);
      border: 1px solid var(--soft-border);
      border-radius: 22px;
      padding: 14px;
      box-shadow: 0 10px 24px oklch(0.28 0.02 145 / 0.05);
    }}
    .card-header {{
      display: grid;
      grid-template-columns: 40px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
    }}
    .step-badge {{
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      display: grid;
      place-items: center;
      font-weight: 800;
      background: var(--accent);
      color: white;
      box-shadow: inset 0 -10px 18px oklch(0.18 0.02 160 / 0.18);
    }}
    .card-intro {{
      min-width: 0;
    }}
    h2 {{
      font-size: 1.32rem;
      line-height: 1.02;
      letter-spacing: -0.02em;
      overflow-wrap: anywhere;
    }}
    .prescription-summary {{
      margin-top: 6px;
      color: var(--accent);
      font-size: 0.98rem;
      font-weight: 760;
      line-height: 1.2;
    }}
    .meta-pills {{
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }}
    .prescription-grid,
    .alternative-prescription-grid {{
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }}
    .prescription-grid-item,
    .alternative-prescription-grid-item {{
      background: var(--card-strong);
      border: 1px solid var(--soft-border);
      border-radius: var(--radius-md);
      padding: 10px 11px;
    }}
    .prescription-grid-label,
    .alternative-prescription-grid-label {{
      color: var(--muted);
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }}
    .prescription-grid-value,
    .alternative-prescription-grid-value {{
      margin-top: 4px;
      font-size: 1.12rem;
      font-weight: 780;
      line-height: 1.05;
    }}
    .meta-pill {{
      display: inline-flex;
      align-items: center;
      padding: 5px 9px;
      border-radius: 999px;
      border: 1px solid var(--soft-border);
      background: var(--card-strong);
      font-size: 0.78rem;
      color: var(--muted);
      font-weight: 650;
      white-space: nowrap;
    }}
    .tone-classification {{
      background: var(--warm-soft);
      border-color: oklch(0.82 0.05 78);
      color: var(--warm);
    }}
    .reason {{
      margin-top: 12px;
    }}
    .exercise-images {{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }}
    .exercise-images img {{
      width: 100%;
      border-radius: var(--radius-md);
      border: 1px solid var(--soft-border);
      background: var(--accent-quiet);
      object-fit: cover;
      aspect-ratio: 4 / 3;
    }}
    .execution-notes {{
      margin-top: 12px;
      background: var(--accent-quiet);
      border-radius: var(--radius-md);
      padding: 12px 12px 12px 28px;
    }}
    .alternatives {{
      margin-top: 12px;
      background: oklch(0.975 0.018 82 / 0.95);
      border: 1px solid oklch(0.88 0.03 82);
      border-radius: var(--radius-lg);
      padding: 12px;
    }}
    .alternatives-heading {{
      margin-bottom: 10px;
    }}
    .alternatives h3 {{
      margin-bottom: 3px;
      font-size: 0.84rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--warm);
    }}
    .alternatives-heading p {{
      color: var(--muted);
      font-size: 0.82rem;
    }}
    .alternatives-grid {{
      display: grid;
      gap: 10px;
    }}
    .alternative-card {{
      display: grid;
      grid-template-columns: 96px minmax(0, 1fr);
      gap: 10px;
      align-items: start;
      background: var(--card-strong);
      border: 1px solid oklch(0.88 0.02 82);
      border-radius: var(--radius-md);
      padding: 10px;
    }}
    .alternative-card.text-only {{
      grid-template-columns: 1fr;
    }}
    .alternative-image-wrap {{
      width: 96px;
    }}
    .alternative-image {{
      width: 100%;
      display: block;
      border-radius: 10px;
      border: 1px solid var(--soft-border);
      background: var(--accent-quiet);
      object-fit: cover;
      aspect-ratio: 4 / 3;
    }}
    .alternative-copy {{
      min-width: 0;
    }}
    .alternative-header {{
      display: flex;
      gap: 8px;
      justify-content: space-between;
      align-items: start;
    }}
    .alternative-title {{
      font-size: 1rem;
      line-height: 1.08;
      letter-spacing: -0.01em;
      overflow-wrap: anywhere;
    }}
    .alternative-kicker {{
      flex: 0 0 auto;
      border-radius: 999px;
      border: 1px solid oklch(0.86 0.03 82);
      background: oklch(0.97 0.02 82);
      color: var(--warm);
      font-size: 0.72rem;
      font-weight: 800;
      line-height: 1;
      padding: 6px 8px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      white-space: nowrap;
    }}
    .alternative-meta {{
      margin-top: 4px;
      font-size: 0.76rem;
      color: var(--muted);
      font-weight: 650;
    }}
    .alternative-note {{
      margin-top: 6px;
    }}
    .stack {{
      margin-top: 16px;
    }}
    @page {{
      size: A4;
      margin: 9mm;
    }}
    @media print {{
      :root {{
        --bg: white;
        --bg-2: white;
        --card: white;
        --card-strong: white;
        --ink: #111111;
        --muted: #444444;
        --accent: #1f4d3a;
        --accent-soft: #eef3ef;
        --accent-quiet: #f5f7f5;
        --border: #cfcfcf;
        --soft-border: rgba(0, 0, 0, 0.12);
        --shadow: none;
        --warm: #444444;
        --warm-soft: #f3f3f3;
      }}
      body {{
        background: white;
      }}
      main {{
        max-width: none;
        margin: 0;
        padding: 0;
      }}
      .hero,
      .section,
      .exercise-card,
      .alternative-card,
      .execution-notes,
      .alternatives {{
        box-shadow: none;
      }}
      .hero,
      .section,
      .exercise-card {{
        break-inside: avoid;
        page-break-inside: avoid;
      }}
      .exercise-card {{
        margin-top: 10px;
      }}
      .prescription-grid,
      .alternative-prescription-grid {{
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }}
      .exercise-images,
      .alternatives-grid {{
        break-inside: avoid;
        page-break-inside: avoid;
      }}
      .alternative-card {{
        break-inside: avoid;
        page-break-inside: avoid;
      }}
      img {{
        break-inside: avoid;
        page-break-inside: avoid;
      }}
    }}
    @media (min-width: 40rem) {{
      main {{
        padding-top: 16px;
      }}
      .prescription-grid {{
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }}
      .alternative-prescription-grid {{
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }}
    }}
    @media (max-width: 20rem) {{
      h1 {{
        font-size: 1.62rem;
      }}
      .section-grid {{
        grid-template-columns: 1fr;
      }}
      .alternative-card {{
        grid-template-columns: 1fr;
      }}
      .alternative-image-wrap {{
        width: 100%;
      }}
    }}
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="eyebrow">Training Session</div>
      <div class="hero-copy">
        <h1>{escape(title)}</h1>
        <p class="subtitle">{escape(subtitle)}</p>
      </div>
    </section>
    <section class="stack">
      {''.join(exercises_html)}
    </section>
  </main>
{interactive_training_script()}
</body>
</html>
"""
