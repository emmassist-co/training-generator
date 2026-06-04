# Output Artifact

The planner must create a phone-friendly artifact, not just send plan text in chat.

Repo-local dependency manifest:

- `package.json`

Local install flow when the repo should be self-sufficient:

```bash
npm install
npm run setup:pdf
```

Default format:
- mobile HTML file with embedded exercise images from the local exercise DB
- optional PDF generated from the HTML artifact when requested or when a shareable static file is useful

Renderer:

```bash
python3 tools/render_training_plan.py --input /tmp/plan.json --output output/training-plans/<slug>.html
```

PDF exporter:

```bash
npm run plan:pdf -- --input output/training-plans/<slug>.html --output output/training-plans/<slug>.pdf
```

Requirements:
- The agent decides the plan content.
- The plan JSON is just the structured handoff to the renderer.
- Each exercise should include `exercise_id` when there is a clean match in the library.
- The renderer will embed up to 2 local exercise images per exercise card.
- The final response should link to the generated HTML file.
- When PDF is created, link to both files.
- The PDF path should prefer repo-local dependencies from `package.json`; the script's bundled-runtime fallback is only a backup.
- Every primary exercise must state sets, reps or time, and rest when applicable in a blunt, scan-first format.
- Every alternative exercise must carry the same prescription clarity: sets, reps or time, rest, and load when relevant.

Recommended plan JSON shape:

```json
{
  "title": "Lower Body Strength A",
  "subtitle": "Phone-first gym session",
  "goal": "posterior-chain strength and low-impact conditioning",
  "duration": "45 minutes",
  "motivation_focus": "Keep the session simple and confidence-building.",
  "monitor": [
    "Stop if pain becomes sharp or technique breaks down.",
    "Back off if recovery is clearly worse afterward."
  ],
  "notes": [
    "Controlled tempo beats chasing load.",
    "Log response, energy, and confidence afterward."
  ],
  "exercises": [
    {
      "exercise_id": "Barbell_Hip_Thrust",
      "name": "Barbell Hip Thrust",
      "sets": 4,
      "reps": 8,
      "rest_seconds": 90,
      "load": "moderate",
      "classification": "favorable",
      "reason": "Posterior-chain emphasis with controlled lower-body loading.",
      "execution_notes": [
        "Keep shin angle comfortable.",
        "Stop 2 reps before form degrades."
      ],
      "alternatives": [
        {
          "exercise_id": "Barbell_Glute_Bridge",
          "name": "Barbell Glute Bridge",
          "sets": 4,
          "reps": 8,
          "rest_seconds": 90,
          "load": "moderate",
          "note": "Use this if the hip thrust station is taken."
        }
      ]
    }
  ]
}
```

If the user explicitly asks for PDF, generate the HTML first and then run the PDF exporter. Do not stop at the HTML file alone.
