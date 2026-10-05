export const CHAT_PAGE_CSS = String.raw`
html,body{height:100%;overflow:hidden}
.coach-page{height:100dvh;min-height:0;padding-bottom:0;display:grid;grid-template-rows:80px minmax(0,1fr)}
.coach-layout{min-height:0;display:grid;grid-template-columns:220px 30px minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto}
.coach-rail{grid-column:1;grid-row:1/3;min-width:0;padding:30px 29px 24px 0;border-right:1px solid var(--rule);display:flex;flex-direction:column}
.coach-rail h1{margin:8px 0 12px;font:700 48px/.78 var(--display);letter-spacing:-.035em;text-transform:uppercase}
.sub{color:var(--muted);font-size:12px;line-height:1.6}
.topline{display:grid;margin-top:28px;border-top:1px solid var(--rule)}
.profile-bar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-bottom:1px solid var(--rule)}
.chip,.ghost{min-height:44px;padding:0 10px;border:0;border-right:1px solid var(--rule);background:transparent;color:var(--muted);font:600 12px/1 var(--display);letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
.chip:last-child{border-right:0}.chip.active{color:var(--accent);box-shadow:inset 0 -2px var(--accent)}
.chip:hover,.ghost:hover{color:var(--ink);background:var(--surface)}
.conversation-select{width:100%;min-height:48px;padding:0 8px;border:0;border-bottom:1px solid var(--dim);border-radius:0;background:var(--ground);color:var(--ink);font:600 13px var(--display);letter-spacing:.03em}
.ghost{width:100%;border-right:0;border-bottom:1px solid var(--dim);color:var(--ink);text-align:left;display:flex;align-items:center;justify-content:space-between}
.ghost:after{content:"+";color:var(--accent);font-size:20px}
.status-card{margin-top:auto;padding-top:18px;border-top:1px solid var(--rule);display:flex;align-items:center;justify-content:space-between;gap:12px}
.status-label{color:var(--muted);font:600 10px var(--display);letter-spacing:.12em;text-transform:uppercase}
.status{display:inline-flex;align-items:center;gap:8px;color:var(--ink);font:600 12px var(--display);letter-spacing:.08em;text-transform:uppercase}
.dot{width:8px;height:8px;background:var(--accent);transform:rotate(45deg)}
.status.error{color:var(--danger)}.status.error .dot{background:var(--danger)}
.chat{grid-column:3;grid-row:1;min-height:0;overflow-y:auto;scroll-padding-block:24px;padding:30px 0 20px;display:flex;flex-direction:column;gap:0;scroll-behavior:smooth}
.msg{width:min(820px,88%);padding:18px 18px 20px;border-top:1px solid var(--rule);border-left:3px solid var(--dim);overflow-wrap:anywhere}
.msg+.msg{margin-top:12px}
.msg.user{margin-left:auto;border-left:1px solid var(--rule);border-right:3px solid var(--ink);background:var(--surface)}
.msg.assistant{border-left-color:var(--accent)}
.msg.thinking{color:var(--muted);border-left-color:var(--dim)}
.meta{margin:0 0 9px;color:var(--muted);font:600 10px/1 var(--display);letter-spacing:.14em;text-transform:uppercase}
.content{color:var(--ink)}.content>:first-child{margin-top:0}.content>:last-child{margin-bottom:0}.content p{margin:0 0 10px}.content ul,.content ol{margin:0 0 10px 1.15rem;padding:0}.content li{margin:3px 0;padding-left:2px}
.content pre{margin:12px 0;padding:14px;border-block:1px solid var(--rule);overflow:auto;background:var(--surface)}
.content code{padding:1px 4px;border-bottom:1px solid var(--dim);color:var(--accent);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em}.content pre code{padding:0;border:0;background:transparent;color:inherit}
.content blockquote{margin:12px 0;padding-left:13px;border-left:3px solid var(--accent);color:var(--muted)}
.table-wrap{max-width:100%;overflow:auto;margin:12px 0;border-block:1px solid var(--rule)}.content table{width:100%;border-collapse:collapse;min-width:420px}.content th,.content td{padding:10px;border-bottom:1px solid var(--rule);text-align:left;vertical-align:top}.content th{color:var(--accent);font:600 12px var(--display);text-transform:uppercase;letter-spacing:.08em}.content tr:last-child td{border-bottom:0}.content a{color:var(--accent);text-decoration:underline;text-underline-offset:3px}
form{grid-column:3;grid-row:2;min-width:0;padding:12px 0 20px;border-top:1px solid var(--rule);display:grid;grid-template-columns:minmax(0,1fr) 142px;gap:12px;align-items:end;background:var(--ground)}
.input-wrap{min-height:72px;padding:10px 0 6px;border-bottom:1px solid var(--dim)}
textarea{width:100%;min-height:42px;max-height:28vh;padding:0;border:0;background:transparent;resize:none;color:var(--ink)}textarea::placeholder{color:var(--placeholder)}
.composer-meta{display:flex;justify-content:flex-end;color:var(--muted);font:600 10px var(--display);letter-spacing:.08em;text-transform:uppercase}
.actions{display:grid;gap:7px}.send{min-height:56px;padding:0 16px;border:0;border-radius:2px;background:var(--accent);box-shadow:inset 0 -2px var(--accent-ink);color:var(--accent-ink);font:800 18px var(--display);letter-spacing:.075em;text-transform:uppercase;cursor:pointer;transition:background-color 120ms ease,transform 120ms ease}.send:hover:not(:disabled){background:var(--accent-hover)}.send:active:not(:disabled){transform:scale(.97)}.send:disabled{background:var(--dim);cursor:not-allowed}.hint{color:var(--muted);font-size:10px;text-align:center;white-space:nowrap}
@media(max-width:1023px){.coach-layout{grid-template-columns:180px 20px minmax(0,1fr)}.coach-rail h1{font-size:41px}.msg{width:94%}}
@media(max-width:767px){.coach-page{grid-template-rows:76px minmax(0,1fr)}.coach-layout{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr) auto}.coach-rail{grid-column:1;grid-row:1;padding:12px 0 0;border-right:0;border-bottom:1px solid var(--rule);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 12px}.coach-rail>.kicker,.coach-rail>h1,.coach-rail>.sub{display:none}.topline{grid-column:1;margin:0;border:0;display:grid;grid-template-columns:minmax(0,1fr) auto}.profile-bar{grid-column:1/-1;display:flex;overflow-x:auto}.chip{min-width:76px}.conversation-select{grid-column:1}.ghost{grid-column:2;width:48px;font-size:0;text-align:center;justify-content:center;border-left:1px solid var(--rule)}.ghost:after{font-size:21px}.status-card{grid-column:2;grid-row:1;margin:0;padding:0;border:0;align-self:center}.status-label{display:none}.status{font-size:10px}.chat{grid-column:1;grid-row:2;padding:16px 0}.msg{width:100%;max-width:100%;padding:14px 12px}.msg.user{width:92%}form{grid-column:1;grid-row:3;padding:10px 0 max(12px,env(safe-area-inset-bottom));grid-template-columns:minmax(0,1fr) 92px;gap:10px}.input-wrap{min-height:64px}.send{min-height:54px}.hint{display:none}}
`;
