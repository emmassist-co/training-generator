export function renderChatPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Training Coach</title>
  <style>
    :root { color-scheme: dark; --bg:#0b0d10; --panel:#13171d; --muted:#8993a3; --text:#f4f6f8; --line:#252b35; --accent:#8ee7c8; --user:#1f2937; --bot:#111827; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; font: 15px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at top, #14211d 0, var(--bg) 42rem); color: var(--text); }
    main { width: min(880px, 100%); margin: 0 auto; min-height: 100vh; display: grid; grid-template-rows: auto 1fr auto; padding: 18px; gap: 14px; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 16px; padding: 10px 2px; }
    h1 { margin: 0; font-size: clamp(28px, 6vw, 48px); letter-spacing: -0.05em; line-height: .92; }
    .sub { margin-top: 8px; color: var(--muted); max-width: 44rem; }
    .status { color: var(--muted); font-size: 13px; text-align: right; }
    .chat { overflow: auto; border: 1px solid var(--line); border-radius: 28px; background: color-mix(in srgb, var(--panel) 88%, transparent); padding: 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 24px 80px rgba(0,0,0,.28); }
    .msg { max-width: 82%; padding: 12px 14px; border: 1px solid var(--line); border-radius: 18px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .msg.user { margin-left: auto; background: var(--user); border-bottom-right-radius: 6px; }
    .msg.assistant { background: var(--bot); border-bottom-left-radius: 6px; }
    .meta { font-size: 12px; color: var(--muted); margin-bottom: 4px; }
    form { display: grid; grid-template-columns: 1fr auto; gap: 10px; padding: 12px; border: 1px solid var(--line); border-radius: 24px; background: var(--panel); }
    textarea { width: 100%; min-height: 54px; max-height: 180px; resize: vertical; border: 0; outline: 0; background: transparent; color: var(--text); font: inherit; padding: 8px; }
    button { border: 0; border-radius: 16px; padding: 0 18px; min-width: 88px; background: var(--accent); color: #042018; font-weight: 750; cursor: pointer; }
    button:disabled { opacity: .45; cursor: wait; }
    .bar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .chip { border: 1px solid var(--line); border-radius: 999px; background: #0f141a; color: var(--text); padding: 7px 10px; font-size: 13px; cursor: pointer; }
    .chip.active { border-color: var(--accent); color: var(--accent); }
    a { color: var(--accent); }
    @media (max-width: 640px) { main { padding: 10px; } header { display: block; } .status { text-align: left; margin-top: 10px; } .msg { max-width: 94%; } form { grid-template-columns: 1fr; } button { min-height: 46px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Training coach</h1>
        <div class="sub">Plan, edit, and log hosted training sessions. Pick a profile or mention one in chat.</div>
        <div class="bar" id="profiles">
          <button type="button" class="chip active" data-profile="alexandre">alexandre</button>
          <button type="button" class="chip" data-profile="catarina">catarina</button>
        </div>
      </div>
      <div class="status" id="status">password protected</div>
    </header>
    <section class="chat" id="chat" aria-live="polite"></section>
    <form id="form">
      <textarea id="input" placeholder="Ask for a session, edit the active workout, or log what you completed…"></textarea>
      <button id="send" type="submit">Send</button>
    </form>
  </main>
  <script type="module">
    import { createFlueClient } from 'https://esm.sh/@flue/sdk@2.2.2';

    const chat = document.querySelector('#chat');
    const form = document.querySelector('#form');
    const input = document.querySelector('#input');
    const send = document.querySelector('#send');
    const status = document.querySelector('#status');
    const profileBar = document.querySelector('#profiles');
    let profile = localStorage.getItem('trainingCoachProfile') || 'alexandre';
    let uid;
    const conversationId = localStorage.getItem('trainingCoachConversation') || crypto.randomUUID();
    localStorage.setItem('trainingCoachConversation', conversationId);
    const client = createFlueClient({ url: new URL('/agents/training/' + conversationId, location.origin).href });

    function setProfile(next) {
      profile = next;
      localStorage.setItem('trainingCoachProfile', profile);
      profileBar.querySelectorAll('.chip').forEach((chip) => chip.classList.toggle('active', chip.dataset.profile === profile));
    }
    setProfile(profile);
    profileBar.addEventListener('click', (event) => {
      const button = event.target.closest('[data-profile]');
      if (button) setProfile(button.dataset.profile);
    });

    function append(role, text) {
      const node = document.createElement('article');
      node.className = 'msg ' + role;
      const label = document.createElement('div');
      label.className = 'meta';
      label.textContent = role === 'user' ? 'You' : 'Coach';
      const body = document.createElement('div');
      body.textContent = text;
      node.append(label, body);
      chat.append(node);
      chat.scrollTop = chat.scrollHeight;
      return body;
    }

    append('assistant', 'Hi. I can create sessions, check profile history, suggest approved edits, and log completions. Current profile: ' + profile + '.');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const raw = input.value.trim();
      if (!raw) return;
      input.value = '';
      send.disabled = true;
      status.textContent = 'thinking…';
      append('user', raw);
      const replyNode = append('assistant', '…');
      const body = 'Current selected profile_id is "' + profile + '". Use this profile unless the user clearly names another one.\\n\\n' + raw;
      try {
        const admission = await client.send({ message: { kind: 'user', body }, uid, idempotencyKey: crypto.randomUUID() });
        uid = admission.uid;
        const reply = await client.read(admission);
        uid = reply.uid || uid;
        replyNode.textContent = reply.text || '(no text reply)';
        status.textContent = 'ready';
      } catch (error) {
        replyNode.textContent = 'Error: ' + (error?.message || String(error));
        status.textContent = 'error';
      } finally {
        send.disabled = false;
        input.focus();
      }
    });
  </script>
</body>
</html>`;
}
