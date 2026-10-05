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
    const urlParams = new URLSearchParams(location.search);
    let profile = urlParams.get('profile_id') || localStorage.getItem('trainingCoachProfile') || 'default';
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

    function renderProfiles(items) {
      const profiles = items.length ? items : [{ id: profile, name: profile }];
      profileBar.innerHTML = profiles.map((item) => '<button type="button" class="chip ' + (item.id === profile ? 'active' : '') + '" data-profile="' + escapeHtml(item.id) + '">' + escapeHtml(item.name || item.id) + '</button>').join('');
    }

    async function loadProfiles() {
      const data = await api('/api/home?profile_id=' + encodeURIComponent(profile));
      const profiles = data.profiles || [];
      if (profiles.length && !profiles.some((item) => item.id === profile)) profile = profiles[0].id;
      renderProfiles(profiles);
      setProfile(profile);
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

    async function initialize() {
      const prompt = urlParams.get('prompt');
      if (prompt) input.value = prompt;
      setProfile(profile);
      await loadProfiles();
      await loadConversations();
      syncComposer();
    }

    initialize().catch((error) => {
      setStatus('error', 'error');
      append('assistant', 'Error loading conversations: ' + error.message, { markdown: false });
    });

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
