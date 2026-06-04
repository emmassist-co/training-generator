---
name: create-training-plan
description: Build the next training session from local state and the bundled exercise database. Use when the user wants a new workout, a weekly structure, or an exercise shortlist tailored to the active profile and saved history.
---

# Create Training Plan

Use this skill when the user wants a new session, a next-step progression, or a plan that should account for prior logged training.

Start from local state, not from scratch.
The active user profile is part of that same local state file.

Read [references/state-and-db.md](./references/state-and-db.md) before using the helper commands.
Read [references/artifact-format.md](./references/artifact-format.md) before finalizing the output.

## Authority

The agent does the planning.

- The helper script is only for reading state, appending logs, and surfacing candidate exercises from the local DB.
- Do not let the script decide progression, weekly structure, recovery needs, motivation strategy, or tradeoffs.
- Use the script as retrieval infrastructure, then make the plan yourself.

## Workflow

1. Read current state:

```bash
python3 tools/training_state.py summarize-state
python3 tools/training_state.py show-recent --limit 5
```

2. Infer the immediate planning need:
- new full-body session,
- lower-body strength day,
- conditioning day,
- lighter recovery day,
- exercise substitution.

3. Pull candidate exercises from the local DB with the helper.

Typical search patterns:

```bash
python3 tools/training_state.py search-exercises --include-muscles glutes hamstrings calves abdominals --allowed-risk prefer caution --limit 12
python3 tools/training_state.py search-exercises --include-muscles quadriceps adductors abductors --allowed-risk caution --categories strength stretching --limit 12
```

4. Curate the output yourself.
- Do not dump raw helper output to the user.
- Prefer exercises marked `prefer`.
- Use `caution` only when dose and execution can be tightly controlled.
- Do not recommend `avoid` exercises unless the user explicitly asks for a risk tradeoff analysis.

5. Produce a session that is easy to execute and easy to log later.
6. Update the reasoning based on the user's longer arc:
- body-weight trend,
- recent knee response,
- adherence and motivation,
- exercise progression or stagnation,
- boredom and exercise variety.
7. Convert the final plan into a structured JSON handoff and render the mobile HTML artifact.
8. Make sure the plan title is short and human-readable so the published URL keeps the session name or day.
9. If the user approves the plan for sharing or phone use, publish the HTML artifact to Cloudflare and return both the public URL and QR code.

## Planning Rules

- Always check recent sessions first and avoid blindly repeating the same lower-body stressor.
- Bias toward posterior-chain strength, trunk work, controlled unilateral work, low-impact conditioning, and tolerable mobility.
- Follow the active profile's constraints. If the current local state is rehab-oriented, protect against excess impact, rotation, aggressive fatigue, and unnecessary loaded flexion.
- If the user gives equipment constraints, filter around them rather than designing an idealized gym session.
- Keep the user motivated. Favor plans that feel doable, varied enough, and clearly progressive without becoming chaotic or reckless.
- Handle exercise evolution explicitly. Reuse proven movements when they are working, progress them gradually, and rotate only when motivation, tolerance, or equipment makes that useful.
- Handle weight evolution explicitly. Prefer training structures that support consistent adherence, manageable fatigue, and knee-friendly calorie expenditure.

## Output Shape

Default output:
- session goal,
- 4 to 7 exercises,
- sets and reps or time,
- short reason for each choice,
- one or two things to monitor during or after the session,
- brief note on what to log afterward.
- a generated phone-friendly HTML file that uses exercise images from the local library
- alternative exercises that are just as explicit about sets, reps or time, rest, and load
- a title that will still read well in a published URL, for example `Lower Body Strength A` or `Thursday Conditioning`

If the user asks for PDF, generate that too from the HTML artifact.

When relevant, also include:
- progression from the last similar session,
- why this session helps both fitness and weight trend,
- one motivation lever such as simplicity, novelty, or a confidence-building win.

When useful, classify each exercise as:
- favorable,
- possible with caution,
- poor tradeoff.

## Missing Facts

Ask only when the missing fact changes the plan materially, for example:
- available equipment,
- pain or swelling today,
- session duration,
- whether the goal is strength, conditioning, or recovery.

Otherwise make a conservative assumption and move forward.

## Required Follow-Through

Do not stop after writing the plan in chat.

1. Create a plan JSON file for the renderer.
   Every main exercise and every alternative should be explicit about prescription, not just named.
2. Run:

```bash
python3 tools/render_training_plan.py --input /tmp/plan.json --output output/training-plans/<slug>.html
```

3. Return the file link in the response when the user is still reviewing the draft.

Prefer HTML by default because it is easiest to open on a phone and preserves the embedded illustrations from the local exercise DB.

After the user agrees to the plan:

4. Publish the HTML artifact:

```bash
npm run html:publish -- --title "<plan title>" --html-file output/training-plans/<slug>.html
```

5. Read the JSON output and return:
- the stable `pageUrl`,
- the local QR image path from `qrCodePath`,
- the local HTML file link.

When presenting the approved result, prefer the Cloudflare URL first and show the QR image as well.

When the user asks for PDF:

```bash
npm run plan:pdf -- --input output/training-plans/<slug>.html --output output/training-plans/<slug>.pdf
```

Return links to both the HTML and PDF files. If the user also approved sharing, publish the HTML version and return the Cloudflare URL plus QR alongside the files.

If the repo has not been bootstrapped yet, the local setup is:

```bash
npm install
npm run setup:pdf
```

## Resources (optional)

Create only the resource directories this skill actually needs. Delete this section if no resources are required.

### scripts/
Executable code (Python/Bash/etc.) that can be run directly to perform specific operations.

**Examples from other skills:**
- PDF skill: `fill_fillable_fields.py`, `extract_form_field_info.py` - utilities for PDF manipulation
- DOCX skill: `document.py`, `utilities.py` - Python modules for document processing

**Appropriate for:** Python scripts, shell scripts, or any executable code that performs automation, data processing, or specific operations.

**Note:** Scripts may be executed without loading into context, but can still be read by Codex for patching or environment adjustments.

### references/
Documentation and reference material intended to be loaded into context to inform Codex's process and thinking.

**Examples from other skills:**
- Product management: `communication.md`, `context_building.md` - detailed workflow guides
- BigQuery: API reference documentation and query examples
- Finance: Schema documentation, company policies

**Appropriate for:** In-depth documentation, API references, database schemas, comprehensive guides, or any detailed information that Codex should reference while working.

### assets/
Files not intended to be loaded into context, but rather used within the output Codex produces.

**Examples from other skills:**
- Brand styling: PowerPoint template files (.pptx), logo files
- Frontend builder: HTML/React boilerplate project directories
- Typography: Font files (.ttf, .woff2)

**Appropriate for:** Templates, boilerplate code, document templates, images, icons, fonts, or any files meant to be copied or used in the final output.

---

**Not every skill requires all three types of resources.**
