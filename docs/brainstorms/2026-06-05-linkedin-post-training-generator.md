# LinkedIn Post Draft: Training Generator

## Core angle

This should read as:

- an "I built this and wanted to share it" product post
- a visible example of how I build tools for myself, my personal life, and my businesses
- a quiet signal that my agent is part of how I operate
- a build-in-public / open-source post, not a sentimental recovery post

This should not read as:

- a personal hardship story
- a vague "AI-native" manifesto
- a generic launch post full of feature bullets

## Content promise

I built a local-first training generator because I wanted a training system I could use myself, chat with through my agent, and keep improving from real usage.

## Supporting facts to keep available

- Data is stored locally.
- Sessions can be generated or adjusted by chatting with my agent.
- Sessions render to a simple phone-first page.
- Each session gets a link and QR code I can use at the gym.
- The link opens a small app-like runtime that uses local storage, includes timers, can help count sets, shows the next exercise, and can offer a swappable alternative if a machine is busy.
- History can be picked back up later and reused.
- The system leans on `yuhonas/free-exercise-db` as a base layer.
- I am keeping usage and training metrics from actual gym use so I can understand rhythm, consistency, and what is or is not getting used.
- I can tell the agent what to change, including strategy-level changes such as focusing more on specific muscle areas.
- A lot of the improvement lives in the skills layer, so the strategy is editable rather than buried inside one opaque app flow.
- The next session can be adjusted from the exercise base, my profile, session logs, and whatever training strategy I want to apply next.
- I am not an exercise expert; part of the value is getting leverage on planning and validation instead of improvising sessions from scratch.
- More and more, I want to build tools that give agents more power, not less.
- Text is a good control surface for flexible direction; code is a good home for deterministic and reusable parts.
- The project is open source.
- The system is a mix of skills and scripts other people can run with their own agent.
- The personal backstory exists, but should stay in the background:
  - after a long gap from the gym
  - surgeries / physio / PT are context for why the workflow needed to be adaptive

## Draft

I built a gym training generator because I wanted something simpler than a fitness app and more reusable than a notes app.

The basic idea was to make it easy for the agent to generate gym sessions from real exercises and render them into an interactive runtime I can actually use at the gym.

The starting point is `yuhonas/free-exercise-db` (shout out!), and we’re building on top of it with my profile, logs, and training strategy.
The published session tracks locally, helps with timing and sets, and can suggest a swap on the spot if a machine is busy.

After each session I can send the result back to the agent, log it, and keep building up the history from there.
That gives me real interaction data from the session itself, like rest times, time between sets, rhythm, plus a difficulty note and a short comment at the end.

If I want to change the strategy, focus more on certain muscle areas, or try an article or approach I found online, I can push that into the agent and adapt the next training from there.

More and more, this is the kind of setup I like building for myself:
use the LLM more like a compiler, let skills handle the flexible parts, and keep the deterministic or reusable pieces in code.
It makes the whole thing much easier to expand, customize, and keep adapting over time.

This is not a replacement for coaching or expertise.
For me, it is a much better way to generate sessions, validate them, and then actually go to the gym with something structured.

I’m sharing the code for it too.
It’s open source. You can run it locally with your own agent, and the Cloudflare part is only there if you want a URL or QR code.
I’d love for people to use it for themselves, iterate on it, and, ideally, help make it better, especially if they know the gym side much better than I do.

## Structure options

### Arc option 1

1. I built this and wanted to share it.
2. Here is what it does in practice.
3. Here is why it is built this way.
4. Here is the bigger point.

### Arc option 2

1. Concrete artifact
2. Concrete workflow
3. Editable strategy layer
4. Open source / others can run it

### Arc option 3

1. Problem with generic tools
2. What I built instead
3. Why agent + local + skills matters in practice
4. Broader signal about this class of software

## Line alternatives

### Opening options

1. I’ve been building a local-first training generator for myself.
2. I built a training generator because I wanted something simpler than a fitness app and more reusable than a notes app.
3. One of the tools I’ve been using myself is a local-first training generator.

### "Why" options

1. Not because I wanted another fitness app, but because I wanted a training system that fits how I actually work, is easy to plug into my agent, and easy to keep extending.
2. I did not want a generic tracker. I wanted a system I could actually use, adapt, and reuse with my own context.
3. The goal was not more features. The goal was a workflow I could use myself and keep improving over time.

### "Share" options

1. I built this for myself and wanted to share it.
2. One thing I’ve been using a lot lately is a training generator I built for myself.
3. I wanted to share a small system I built for myself and now use every time I train.

### "Potential" options

1. I think a lot of interesting software will look more like this: small systems around a real workflow, with editable logic and reusable context.
2. The interesting part is not the interface by itself, but how much leverage you get once the workflow, history, and strategy are all editable.
3. This is the kind of setup that starts small and becomes much more useful once it is tied to real usage and real iteration.

### Agent-power options

1. I’m increasingly interested in building tools that give the agent more power instead of less.
2. A lot of the interesting part for me is keeping the control surface text-based and the reusable parts in code.
3. The pattern I keep coming back to is simple: text for direction, code for deterministic execution.
4. I keep finding that these tools get much better when the agent has more room to help instead of being boxed in.
5. Text works well for steering; code works well for the repeatable parts.

### "Broader vibe" options

1. This is the kind of thing I’m building more and more for myself, my personal life, and my businesses.
2. A lot of what I’m building now looks like this: small systems that fit a real workflow instead of waiting for a generic product to fit it.
3. This is a good example of the kinds of tools I like building for myself and for the way I already work with my agents.

### Metrics / strategy options

1. I’m also keeping the interaction data from actually using it at the gym so I can see how the sessions are really going and what needs to change.
2. Because I’m using it in the real world, I also get a feedback loop on consistency, usage patterns, and whether the plan is actually holding up.
3. The history is not just a log. It gives me something to reuse when I want to change the training strategy or refine the workflow.

### Exercise-base options

1. It uses an open-source exercise database as the base layer, then adjusts from my own context.
2. The starting point is `yuhonas/free-exercise-db`, but the useful part is how the agent adapts from logs, profile, and strategy.
3. Instead of inventing everything from scratch, it starts from an open exercise base and then personalizes from there.

### Runtime options

1. The link is not just a page. It behaves like a small workout runtime with local storage, timers, set counting, and exercise swaps.
2. The gym link opens a lightweight app that keeps local progress, shows the next exercise, and helps when a machine is busy.
3. The published session is interactive: it tracks locally, helps with timing and sets, and can suggest a swap on the spot.

### Non-expert framing options

1. I’m not an exercise expert, which is exactly why this is useful.
2. I’m not pretending to be a coach here. I just want a much better system than improvising sessions myself.
3. Part of the value is getting leverage on planning and validation, even without being an expert.

### Open-source closing options

1. It’s open source. You can run it locally with your own agent, and the Cloudflare part is only there if you want a URL.
2. I’m sharing it so other people can use it for themselves, adapt it, and improve it.
3. It works locally, it can export a PDF, and publishing a URL is optional.

## Notes

- Keep surgeries / physio / PT to one short clause at most, if we keep them at all.
- Avoid saying "AI-native" explicitly unless needed.
- Prefer "agent", "local", "workflow", "reuse", "history", "iterate", and "own setup".
- Keep the non-expert point calm and pragmatic, not apologetic.
- Prefer "I built this and wanted to share it" over thesis-first abstraction.
- The broader point can mention agent leverage, but should still sound grounded in a real tool.
- Keep the tone practical, current, and understated.
