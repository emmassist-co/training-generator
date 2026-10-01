export function renderChatPage() {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Training Coach</title>
  <style>
    :root { color-scheme: dark; --bg:#0b0d10; --panel:#13171d; --muted:#8993a3; --text:#f4f6f8; --line:#252b35; --accent:#8ee7c8; --user:#1f2937; --bot:#111827; --thinking:#0f1b18; }
    * { box-sizing: border-box; }
    html, body { height: 100%; overflow: hidden; }
    body { margin: 0; font: 15px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at top, #14211d 0, var(--bg) 42rem); color: var(--text); }
    main { width: 100%; height: 100dvh; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; padding: 14px; gap: 12px; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 16px; padding: 4px 2px 0; }
    h1 { margin: 0; font-size: clamp(26px, 4vw, 44px); letter-spacing: -0.05em; line-height: .92; }
    .sub { margin-top: 7px; color: var(--muted); max-width: 56rem; }
    .status { color: var(--muted); font-size: 13px; text-align: right; min-width: 11rem; }
    .chat { min-height: 0; overflow: auto; border: 1px solid var(--line); border-radius: 28px; background: color-mix(in srgb, var(--panel) 88%, transparent); padding: 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 24px 80px rgba(0,0,0,.28); scroll-behavior: smooth; }
    .msg { max-width: min(860px, 86%); padding: 12px 14px; border: 1px solid var(--line); border-radius: 18px; overflow-wrap: anywhere; }
    .msg.user { margin-left: auto; background: var(--user); border-bottom-right-radius: 6px; }
    .msg.assistant { background: var(--bot); border-bottom-left-radius: 6px; }
    .msg.thinking { background: var(--thinking); border-style: dashed; color: var(--muted); font-size: 13px; }
    .meta { font-size: 12px; color: var(--muted); margin: 0 0 6px; }
    .content > :first-child { margin-top: 0; }
    .content > :last-child { margin-bottom: 0; }
    .content p { margin: 0 0 10px; }
    .content ul, .content ol { margin: 0 0 10px 1.4rem; padding: 0; }
    .content li { margin: 3px 0; }
    .content pre { margin: 10px 0; padding: 12px; border: 1px solid var(--line); border-radius: 12px; overflow: auto; background: #090c10; }
    .content code { padding: 1px 5px; border: 1px solid var(--line); border-radius: 6px; background: #090c10; }
    .content pre code { padding: 0; border: 0; background: transparent; }
    .content blockquote { margin: 10px 0; padding-left: 12px; border-left: 3px solid var(--accent); color: var(--muted); }
    form { display: grid; grid-template-columns: 1fr auto; gap: 10px; padding: 12px; border: 1px solid var(--line); border-radius: 24px; background: var(--panel); }
    textarea { width: 100%; min-height: 56px; max-height: 32vh; resize: vertical; border: 0; outline: 0; background: transparent; color: var(--text); font: inherit; padding: 8px; }
    .actions { display: grid; align-content: stretch; gap: 7px; }
    button { border: 0; border-radius: 16px; padding: 0 18px; min-width: 88px; background: var(--accent); color: #042018; font-weight: 750; cursor: pointer; }
    button:disabled { opacity: .45; cursor: wait; }
    .hint { color: var(--muted); font-size: 11px; text-align: center; white-space: nowrap; }
    .bar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .chip { border: 1px solid var(--line); border-radius: 999px; background: #0f141a; color: var(--text); padding: 7px 10px; font-size: 13px; cursor: pointer; }
    .chip.active { border-color: var(--accent); color: var(--accent); }
    a { color: var(--accent); }
    @media (max-width: 640px) { main { padding: 10px; gap: 10px; } header { display: block; } .status { text-align: left; margin-top: 10px; } .msg { max-width: 94%; } form { grid-template-columns: 1fr; } button { min-height: 46px; } .hint { text-align: right; } }
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
      <div class="actions">
        <button id="send" type="submit">Send</button>
        <div class="hint">⌘/Ctrl + Enter</div>
      </div>
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
    let workTimer;
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

    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
    }

    function renderInline(value) {
      return escapeHtml(value)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    }

    function renderMarkdown(value) {
      const text = String(value || '').trim();
      const blocks = text.split(/\n{2,}/);
      return blocks.map((block) => {
        if (/^\`\`\`/.test(block)) {
          const code = block.replace(/^\`\`\`\w*\n?/, '').replace(/\`\`\`$/, '');
          return '<pre><code>' + escapeHtml(code.trim()) + '</code></pre>';
        }
        if (/^[-*] /m.test(block)) {
          const items = block.split('\n').filter(Boolean).map((line) => '<li>' + renderInline(line.replace(/^[-*] /, '')) + '</li>').join('');
          return '<ul>' + items + '</ul>';
        }
        if (/^> /.test(block)) return '<blockquote>' + renderInline(block.replace(/^> /gm, '')) + '</blockquote>';
        return '<p>' + block.split('\n').map(renderInline).join('<br>') + '</p>';
      }).join('');
    }

    function append(role, text, options = {}) {
      const node = document.createElement('article');
      node.className = 'msg ' + role + (options.thinking ? ' thinking' : '');
      const label = document.createElement('div');
      label.className = 'meta';
      label.textContent = options.label || (role === 'user' ? 'You' : 'Coach');
      const body = document.createElement('div');
      body.className = 'content';
      setMessage(body, text, options.markdown !== false);
      node.append(label, body);
      chat.append(node);
      chat.scrollTop = chat.scrollHeight;
      return { node, body };
    }

    function setMessage(node, text, markdown = true) {
      const clean = String(text || '').trim();
      if (markdown) node.innerHTML = renderMarkdown(clean);
      else node.textContent = clean;
      chat.scrollTop = chat.scrollHeight;
    }

    function eventLabel(event) {
      const raw = event && typeof event === 'object' ? event : {};
      const type = raw.type || raw.event || raw.kind;
      const tool = raw.toolName || raw.tool_name || raw.name;
      if (tool) return 'Using ' + tool + '…';
      if (type === 'settlement') return 'Finishing…';
      if (type === 'message' || type === 'conversation') return 'Reading reply…';
      return 'Thinking…';
    }

    append('assistant', 'Hi. I can create sessions, check profile history, suggest approved edits, and log completions. Current profile: ' + profile + '.');

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const raw = input.value.trim();
      if (!raw) return;
      input.value = '';
      send.disabled = true;
      status.textContent = 'thinking…';
      append('user', raw, { markdown: false });
      const thinking = append('assistant', 'Thinking…', { thinking: true, label: 'Working', markdown: false });
      const reply = append('assistant', 'Waiting for response…');
      const body = ['Current selected profile_id is "' + profile + '". Use this profile unless the user clearly names another one.', '', raw].join(String.fromCharCode(10));
      let tick = 0;
      workTimer = setInterval(() => {
        tick += 1;
        setMessage(thinking.body, 'Thinking' + '.'.repeat((tick % 3) + 1), false);
      }, 900);
      try {
        const admission = await client.send({ message: { kind: 'user', body }, uid, idempotencyKey: crypto.randomUUID() });
        uid = admission.uid;
        const result = await client.read(admission, {
          onEvent(event) {
            setMessage(thinking.body, eventLabel(event), false);
          },
        });
        uid = result.uid || uid;
        setMessage(reply.body, result.text || '(no text reply)');
        thinking.node.remove();
        status.textContent = 'ready';
      } catch (error) {
        setMessage(reply.body, 'Error: ' + (error?.message || String(error)), false);
        status.textContent = 'error';
      } finally {
        clearInterval(workTimer);
        send.disabled = false;
        input.focus();
      }
    });
  </script>
</body>
</html>`;
}
