export function renderChatPage() {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Training Coach</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07090b;
      --bg-2: #0b1110;
      --panel: rgba(15, 20, 22, .82);
      --panel-strong: rgba(19, 26, 29, .94);
      --panel-soft: rgba(255, 255, 255, .035);
      --line: rgba(213, 255, 234, .12);
      --line-strong: rgba(142, 231, 200, .34);
      --text: #f5f7f6;
      --muted: #91a09c;
      --muted-2: #66736f;
      --accent: #8ee7c8;
      --accent-2: #d5fff0;
      --danger: #ffb4a8;
      --shadow: rgba(0, 0, 0, .42);
      --radius-xl: 30px;
      --radius-lg: 22px;
      --radius-md: 16px;
    }

    * { box-sizing: border-box; }
    html, body { height: 100%; overflow: hidden; }
    body {
      margin: 0;
      color: var(--text);
      font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 18% 0%, rgba(142, 231, 200, .18), transparent 34rem),
        radial-gradient(circle at 92% 12%, rgba(126, 165, 255, .10), transparent 30rem),
        linear-gradient(180deg, var(--bg-2), var(--bg) 46%);
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: .28;
      background-image:
        linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.026) 1px, transparent 1px);
      background-size: 54px 54px;
      mask-image: linear-gradient(to bottom, #000, transparent 78%);
    }

    main {
      position: relative;
      z-index: 1;
      width: 100%;
      height: 100dvh;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 12px;
      padding: 14px;
    }

    header,
    form,
    .chat {
      border: 1px solid var(--line);
      background: var(--panel);
      box-shadow: 0 24px 90px var(--shadow);
      backdrop-filter: blur(22px) saturate(1.2);
    }

    header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: end;
      border-radius: var(--radius-xl);
      padding: 14px;
    }
    .eyebrow {
      color: var(--accent);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .18em;
      text-transform: uppercase;
    }
    h1 {
      margin: 3px 0 0;
      font-size: clamp(30px, 5vw, 58px);
      letter-spacing: -.07em;
      line-height: .88;
    }
    .sub {
      max-width: 68rem;
      margin-top: 8px;
      color: var(--muted);
      font-size: 14px;
    }
    .topline {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-top: 13px;
    }
    .profile-bar {
      display: inline-flex;
      gap: 4px;
      padding: 4px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(0, 0, 0, .2);
    }
    .conversation-select {
      min-height: 38px;
      max-width: min(320px, 100%);
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(0, 0, 0, .24);
      color: var(--text);
      padding: 0 12px;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      outline: none;
    }
    .chip,
    .ghost {
      border: 1px solid transparent;
      border-radius: 999px;
      background: transparent;
      color: var(--muted);
      min-width: auto;
      padding: 8px 12px;
      font: inherit;
      font-size: 13px;
      font-weight: 750;
      cursor: pointer;
      transition: background .16s ease, color .16s ease, border-color .16s ease, transform .16s ease;
    }
    .chip:hover,
    .ghost:hover { color: var(--text); background: rgba(255,255,255,.05); }
    .chip.active {
      color: #031b14;
      background: linear-gradient(180deg, var(--accent-2), var(--accent));
      box-shadow: 0 0 30px rgba(142, 231, 200, .16);
    }
    .ghost {
      border-color: var(--line);
      color: var(--accent-2);
      background: rgba(142, 231, 200, .05);
    }
    .status-card {
      min-width: 190px;
      text-align: right;
    }
    .status-label {
      display: block;
      color: var(--muted-2);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .16em;
      text-transform: uppercase;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      color: var(--text);
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(255,255,255,.04);
      padding: 8px 10px;
      font-size: 13px;
      font-weight: 700;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--accent);
      box-shadow: 0 0 18px var(--accent);
    }
    .status.busy .dot { animation: pulse 1s infinite alternate; }
    .status.error { color: var(--danger); border-color: rgba(255,180,168,.38); }
    .status.error .dot { background: var(--danger); box-shadow: 0 0 18px var(--danger); }

    .chat {
      min-height: 0;
      overflow: auto;
      border-radius: var(--radius-xl);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      scroll-behavior: smooth;
    }
    .msg {
      width: fit-content;
      max-width: min(880px, 84%);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 10px 12px 12px;
      overflow-wrap: anywhere;
      background: rgba(255,255,255,.04);
    }
    .msg.user {
      margin-left: auto;
      color: #f9fbff;
      border-color: rgba(180, 202, 255, .16);
      background: linear-gradient(180deg, rgba(43, 53, 67, .92), rgba(28, 35, 46, .92));
      border-bottom-right-radius: 8px;
    }
    .msg.assistant {
      background: linear-gradient(180deg, rgba(14, 19, 22, .96), rgba(10, 14, 17, .96));
      border-bottom-left-radius: 8px;
    }
    .msg.thinking {
      color: var(--muted);
      border-style: dashed;
      background: rgba(142, 231, 200, .045);
    }
    .meta {
      margin: 0 0 5px;
      color: var(--muted-2);
      font-size: 10px;
      font-weight: 850;
      letter-spacing: .14em;
      line-height: 1;
      text-transform: uppercase;
    }
    .content { color: var(--text); }
    .content > :first-child { margin-top: 0; }
    .content > :last-child { margin-bottom: 0; }
    .content p { margin: 0 0 10px; }
    .content ul, .content ol { margin: 0 0 10px 1.15rem; padding: 0; }
    .content li { margin: 2px 0; padding-left: 2px; }
    .content pre {
      margin: 10px 0;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      overflow: auto;
      background: rgba(0, 0, 0, .34);
    }
    .content code {
      padding: 1px 5px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: rgba(0, 0, 0, .32);
      color: var(--accent-2);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: .92em;
    }
    .content pre code { padding: 0; border: 0; background: transparent; color: inherit; }
    .content blockquote {
      margin: 10px 0;
      padding-left: 12px;
      border-left: 3px solid var(--accent);
      color: var(--muted);
    }
    .table-wrap { max-width: 100%; overflow: auto; margin: 10px 0; border: 1px solid var(--line); border-radius: var(--radius-md); }
    .content table { width: 100%; border-collapse: collapse; min-width: 420px; background: rgba(0,0,0,.18); }
    .content th, .content td { padding: 9px 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
    .content th { color: var(--accent-2); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; background: rgba(142,231,200,.06); }
    .content tr:last-child td { border-bottom: 0; }
    .content a { color: var(--accent); text-underline-offset: 3px; }

    form {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: end;
      border-radius: var(--radius-xl);
      padding: 12px;
    }
    .input-wrap {
      min-height: 64px;
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background: rgba(0, 0, 0, .18);
      padding: 10px 12px 8px;
    }
    textarea {
      width: 100%;
      min-height: 38px;
      max-height: 28vh;
      resize: none;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--text);
      font: inherit;
      padding: 0;
    }
    textarea::placeholder { color: var(--muted-2); }
    .composer-meta {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      color: var(--muted-2);
      font-size: 11px;
    }
    .actions { display: grid; gap: 8px; min-width: 118px; }
    button.send {
      min-height: 48px;
      border: 0;
      border-radius: 18px;
      padding: 0 18px;
      background: linear-gradient(180deg, var(--accent-2), var(--accent));
      color: #031b14;
      font: inherit;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 12px 34px rgba(142, 231, 200, .18);
      transition: transform .16s ease, opacity .16s ease;
    }
    button.send:hover:not(:disabled) { transform: translateY(-1px); }
    button.send:disabled { opacity: .42; cursor: not-allowed; transform: none; }
    .hint { color: var(--muted-2); font-size: 11px; text-align: center; white-space: nowrap; }

    @keyframes pulse { from { opacity: .42; transform: scale(.82); } to { opacity: 1; transform: scale(1.08); } }

    @media (max-width: 720px) {
      main { padding: 8px; gap: 8px; }
      header { grid-template-columns: 1fr; padding: 12px; border-radius: 24px; }
      .status-card { min-width: 0; text-align: left; }
      .status { margin-top: 6px; }
      .sub { font-size: 13px; }
      .chat { padding: 10px; border-radius: 24px; }
      .msg { max-width: 94%; }
      form { grid-template-columns: 1fr; border-radius: 24px; }
      .actions { grid-template-columns: 1fr auto; align-items: center; }
      .hint { text-align: right; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <div class="eyebrow">Hosted training agent</div>
        <h1>Training coach</h1>
        <div class="sub">Create sessions, swap movements, answer mid-workout questions, and log completions into the hosted training history.</div>
        <div class="topline">
          <div class="profile-bar" id="profiles" aria-label="Profile">
            <button type="button" class="chip active" data-profile="alexandre">alexandre</button>
            <button type="button" class="chip" data-profile="catarina">catarina</button>
          </div>
          <select class="conversation-select" id="conversationSelect" aria-label="Conversation"></select>
          <button type="button" class="ghost" id="newConversation">New chat</button>
        </div>
      </div>
      <div class="status-card">
        <span class="status-label">Connection</span>
        <span class="status" id="status"><span class="dot"></span><span id="statusText">password protected</span></span>
      </div>
    </header>

    <section class="chat" id="chat" aria-live="polite"></section>

    <form id="form">
      <div class="input-wrap">
        <textarea id="input" rows="2" placeholder="Ask for a session, edit the active workout, or log what you completed…"></textarea>
        <div class="composer-meta">
          <span>Enter for newline</span>
          <span id="charCount">0</span>
        </div>
      </div>
      <div class="actions">
        <button class="send" id="send" type="submit" disabled>Send</button>
        <div class="hint">⌘/Ctrl + Enter · ⌘/Ctrl + K</div>
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
    const statusText = document.querySelector('#statusText');
    const profileBar = document.querySelector('#profiles');
    const conversationSelect = document.querySelector('#conversationSelect');
    const newConversation = document.querySelector('#newConversation');
    const charCount = document.querySelector('#charCount');

    const conversationKey = 'trainingCoachConversation';
    let profile = localStorage.getItem('trainingCoachProfile') || 'alexandre';
    let uid;
    let workTimer;
    let startedAt = 0;
    let isBusy = false;
    let conversations = [];
    let conversationId = localStorage.getItem(conversationKey);
    let client;

    function setProfile(next) {
      profile = next;
      localStorage.setItem('trainingCoachProfile', profile);
      profileBar.querySelectorAll('.chip').forEach((chip) => chip.classList.toggle('active', chip.dataset.profile === profile));
    }

    function createClient(id) {
      return createFlueClient({ url: new URL('/agents/training/' + id, location.origin).href });
    }

    function apiUrl(path) {
      const url = new URL(path, location.href);
      url.username = '';
      url.password = '';
      return url.href;
    }

    async function api(path, options = {}) {
      const response = await fetch(apiUrl(path), {
        ...options,
        headers: { 'content-type': 'application/json', ...(options.headers || {}) },
      });
      if (!response.ok) throw new Error('Request failed: ' + response.status);
      return response.json();
    }

    async function loadConversations() {
      const data = await api('/api/conversations?profile_id=' + encodeURIComponent(profile));
      conversations = data.conversations || [];
      if (!conversationId || !conversations.some((item) => item.id === conversationId)) {
        if (conversations[0]) conversationId = conversations[0].id;
        else {
          const created = await api('/api/conversations', { method: 'POST', body: JSON.stringify({ profile_id: profile, title: 'New conversation' }) });
          conversations = [created];
          conversationId = created.id;
        }
      }
      const current = conversations.find((item) => item.id === conversationId);
      uid = current?.flue_uid || undefined;
      client = createClient(conversationId);
      localStorage.setItem(conversationKey, conversationId);
      renderConversationSelect();
      await renderTranscript();
    }

    async function saveConversation(patch = {}) {
      if (!conversationId) return;
      const payload = {};
      if (patch.title) payload.title = patch.title;
      if (patch.uid) payload.flue_uid = patch.uid;
      if (!Object.keys(payload).length) return;
      const updated = await api('/api/conversations/' + encodeURIComponent(conversationId), { method: 'PATCH', body: JSON.stringify(payload) });
      conversations = [updated, ...conversations.filter((item) => item.id !== updated.id)];
      renderConversationSelect();
    }

    function renderConversationSelect() {
      conversationSelect.innerHTML = conversations.map((item) => '<option value="' + item.id + '">' + escapeHtml(item.title || 'New conversation') + '</option>').join('');
      conversationSelect.value = conversationId;
    }

    async function rememberMessage(role, text) {
      if (!conversationId) return;
      await api('/api/conversations/' + encodeURIComponent(conversationId) + '/messages', {
        method: 'POST',
        body: JSON.stringify({ role, body: text }),
      });
      if (role === 'user') await saveConversation({ title: text.slice(0, 58) || 'New conversation' });
    }

    async function renderTranscript() {
      chat.replaceChildren();
      if (!conversationId) return;
      const data = await api('/api/conversations/' + encodeURIComponent(conversationId) + '/messages');
      const transcript = data.messages || [];
      if (!transcript.length) {
        append('assistant', 'Hi. I can create sessions, check profile history, suggest approved edits, and log completions. Current profile: **' + profile + '**.', { persist: false });
        return;
      }
      for (const message of transcript) append(message.role, message.body, { markdown: message.role !== 'user', persist: false });
    }

    async function switchConversation(id) {
      conversationId = id;
      const item = conversations.find((conversation) => conversation.id === id);
      uid = item?.flue_uid || undefined;
      client = createClient(conversationId);
      localStorage.setItem(conversationKey, conversationId);
      renderConversationSelect();
      await renderTranscript();
    }

    async function startConversation() {
      const created = await api('/api/conversations', { method: 'POST', body: JSON.stringify({ profile_id: profile, title: 'New conversation' }) });
      conversations = [created, ...conversations];
      conversationId = created.id;
      uid = undefined;
      client = createClient(conversationId);
      localStorage.setItem(conversationKey, conversationId);
      renderConversationSelect();
      await renderTranscript();
      input.focus();
    }

    function setStatus(text, mode = 'ready') {
      statusText.textContent = text;
      status.classList.toggle('busy', mode === 'busy');
      status.classList.toggle('error', mode === 'error');
    }

    function syncComposer() {
      const length = input.value.length;
      charCount.textContent = String(length);
      send.disabled = isBusy || input.value.trim().length === 0;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, Math.round(window.innerHeight * 0.28)) + 'px';
    }

    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
    }

    function renderInline(value) {
      return escapeHtml(value)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    }

    function isTableBlock(block) {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      return lines.length >= 2 && lines.every((line) => line.includes('|')) && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(lines[1]);
    }

    function splitTableRow(line) {
      return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
    }

    function renderTable(block) {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      const headers = splitTableRow(lines[0]);
      const rows = lines.slice(2).map(splitTableRow);
      return '<div class="table-wrap"><table><thead><tr>'
        + headers.map((cell) => '<th>' + renderInline(cell) + '</th>').join('')
        + '</tr></thead><tbody>'
        + rows.map((row) => '<tr>' + headers.map((_, index) => '<td>' + renderInline(row[index] || '') + '</td>').join('') + '</tr>').join('')
        + '</tbody></table></div>';
    }

    function renderMarkdown(value) {
      const text = String(value || '').trim();
      if (!text) return '';
      const blocks = text.split(/\n{2,}/);
      return blocks.map((block) => {
        if (/^\`\`\`/.test(block)) {
          const code = block.replace(/^\`\`\`\w*\n?/, '').replace(/\`\`\`$/, '');
          return '<pre><code>' + escapeHtml(code.trim()) + '</code></pre>';
        }
        if (isTableBlock(block)) return renderTable(block);
        if (/^[-*] /m.test(block)) {
          const items = block.split('\n').filter(Boolean).map((line) => '<li>' + renderInline(line.replace(/^[-*] /, '')) + '</li>').join('');
          return '<ul>' + items + '</ul>';
        }
        if (/^> /.test(block)) return '<blockquote>' + renderInline(block.replace(/^> /gm, '')) + '</blockquote>';
        return '<p>' + block.split('\n').map(renderInline).join('<br>') + '</p>';
      }).join('');
    }

    function setMessage(node, text, markdown = true) {
      const clean = String(text || '').trim();
      if (markdown) node.innerHTML = renderMarkdown(clean);
      else node.textContent = clean;
      chat.scrollTop = chat.scrollHeight;
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
      if (options.persist) rememberMessage(role, text);
      return { node, label, body };
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

    setProfile(profile);
    loadConversations().catch((error) => {
      setStatus('error', 'error');
      append('assistant', 'Error loading conversations: ' + error.message, { markdown: false });
    });
    syncComposer();

    profileBar.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-profile]');
      if (!button || isBusy) return;
      setProfile(button.dataset.profile);
      conversationId = null;
      localStorage.removeItem(conversationKey);
      await loadConversations();
    });

    conversationSelect.addEventListener('change', () => switchConversation(conversationSelect.value));
    newConversation.addEventListener('click', startConversation);
    input.addEventListener('input', syncComposer);

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        form.requestSubmit();
      }
      if (event.key === 'Escape' && input.value) {
        event.preventDefault();
        input.value = '';
        syncComposer();
      }
    });

    window.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.focus();
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const raw = input.value.trim();
      if (!raw || isBusy) return;

      input.value = '';
      isBusy = true;
      syncComposer();
      setStatus('thinking · 0s', 'busy');
      append('user', raw, { markdown: false });
      await rememberMessage('user', raw);
      const reply = append('assistant', 'Thinking…', { thinking: true, label: 'Working', markdown: false });
      const body = ['Current selected profile_id is "' + profile + '". Use this profile unless the user clearly names another one.', '', raw].join(String.fromCharCode(10));

      startedAt = Date.now();
      let tick = 0;
      workTimer = setInterval(() => {
        tick += 1;
        const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        setStatus('thinking · ' + seconds + 's', 'busy');
        setMessage(reply.body, 'Thinking' + '.'.repeat((tick % 3) + 1), false);
      }, 900);

      try {
        const admission = await client.send({ message: { kind: 'user', body }, uid, idempotencyKey: crypto.randomUUID() });
        uid = admission.uid;
        await saveConversation({ uid });
        const result = await client.read(admission, {
          onEvent(event) {
            setMessage(reply.body, eventLabel(event), false);
          },
        });
        uid = result.uid || uid;
        await saveConversation({ uid });
        reply.node.classList.remove('thinking');
        reply.label.textContent = 'Coach';
        setMessage(reply.body, result.text || '(no text reply)');
        await rememberMessage('assistant', result.text || '(no text reply)');
        setStatus('ready', 'ready');
      } catch (error) {
        reply.node.classList.remove('thinking');
        reply.label.textContent = 'Coach';
        setMessage(reply.body, 'Error: ' + (error?.message || String(error)), false);
        setStatus('error', 'error');
      } finally {
        clearInterval(workTimer);
        isBusy = false;
        syncComposer();
        input.focus();
      }
    });
  </script>
</body>
</html>`;
}
