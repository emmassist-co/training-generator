---
name: log-training-session
description: Convert a free-form workout report into structured local training history. Use when the user describes a session they completed and wants the saved state updated for future planning.
---

# Log Training Session

Use this skill when the user says what they trained and wants that preserved in local state.
That same local state file also carries the user profile and planning preferences.

Read [references/state-and-log-format.md](./references/state-and-log-format.md) before logging.

## Authority

The agent interprets the workout and extracts coaching signal.

- The helper script only appends structured state.
- Do not offload meaning-making to the script.
- After logging, explain what this session means for progression, motivation, recovery, and the next plan.

## Workflow

1. Read current state first:

```bash
python3 /Users/alexandre/dev/acl/tools/training_state.py summarize-state
```

2. Turn the user's message into one structured session object.
- Normalize vague descriptions into a clean session summary.
- If the user pasted a compact `TL1 {...}` training log, parse that first and treat its `id` as the primary training reference.
- Capture the body response, constraints, and profile-relevant symptoms for the next session.
- Capture motivation and adherence signal when present.
- Capture weight or weigh-in signal when present.
- If the user did not provide exact sets or reps, keep them absent or mark them as approximate in notes.

3. Write the session object to a temp JSON file, then append it:

```bash
python3 /Users/alexandre/dev/acl/tools/training_state.py log-session --input /tmp/session.json
```

4. After logging, report the implications for planning.
- what stressor was added,
- what seems to be tolerated,
- what the next session should probably bias toward or avoid.
- whether motivation seems high, flat, or slipping,
- whether body-weight trend information changed the planning context.

## Logging Rules

- Preserve signal, not fluff.
- Keep the stored summary compact and useful for future planning.
- Preserve `source_training_id` when the workout came from a generated training page or pasted `TL1` log.
- Translate subjective notes into structured constraints when possible.
- If the user reports pain spikes, instability, unusual fatigue, or clearly worse response, make sure that appears in `next_session_constraints`.
- If the user reports boredom, confidence gains, dread, or unusually strong enjoyment, store that signal so future plans can adapt.

## Required Follow-Through

Do not stop at restating the session.
Actually update the local state file and confirm that it changed.

## Ask Only If Needed

Ask a follow-up only when the log would be too ambiguous without it, for example:
- whether the workout happened today or on another date,
- whether the knee got better, worse, or stayed neutral,
- whether there was swelling afterward.

If the user gave enough to infer a conservative structured record, log it directly.

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
