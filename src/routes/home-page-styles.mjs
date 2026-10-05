export const HOME_PAGE_CSS = String.raw`
    .home-page{padding-bottom:40px}
    .profile-strip{min-height:60px;border-bottom:1px solid var(--rule);display:flex;align-items:center;justify-content:space-between;gap:20px}
    .profile-label{display:flex;align-items:center;gap:12px}
    .profile-label:before{content:"";width:20px;height:2px;background:var(--accent)}
    .profile-options{display:flex;align-self:stretch}
    .profile-option{min-width:72px;min-height:44px;padding:0 14px;border:0;border-left:1px solid var(--rule);background:transparent;color:var(--muted);font:600 12px/1 var(--display);letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
    .profile-option:last-child{border-right:1px solid var(--rule)}
    .profile-option.active{color:var(--accent);box-shadow:inset 0 -2px var(--accent)}
    .home-loading{min-height:calc(100dvh - 140px);display:grid;place-items:center;color:var(--muted);font:600 13px var(--display);letter-spacing:.12em;text-transform:uppercase}
    .home-grid{display:grid;grid-template-columns:220px minmax(0,1fr) 340px;gap:30px;padding-top:30px}
    .home-rail{min-width:0;padding-right:29px;border-right:1px solid var(--rule);display:flex;flex-direction:column}
    .rail-index{font:600 54px/.8 var(--display);letter-spacing:-.03em}
    .rail-copy{margin:14px 0 28px;color:var(--muted);font-size:12px;line-height:1.6}
    .quick-list{display:grid;margin-top:auto}
    .quick-list .text-action{width:100%;text-align:left}
    .home-main{min-width:0}
    .today-head{min-height:88px;border-bottom:1px solid var(--rule);display:flex;align-items:flex-start;justify-content:space-between;gap:20px}
    .today-head .section-title{font-size:34px}
    .feature{border-bottom:1px solid var(--rule)}
    .feature-media{position:relative;height:330px;overflow:hidden;background:var(--accent)}
    .feature-media img{position:absolute;inset:0 0 0 auto;width:82%;height:100%;object-fit:cover;object-position:center;filter:grayscale(1) contrast(1.45) brightness(.82);mix-blend-mode:multiply;opacity:.9;clip-path:polygon(12% 0,100% 0,100% 100%,0 100%)}
    .feature-media:after{content:"";position:absolute;inset:0 0 0 auto;width:18px;background:repeating-linear-gradient(180deg,var(--ground) 0 2px,transparent 2px 8px);opacity:.7}
    .feature-number{position:absolute;z-index:1;left:22px;top:20px;color:var(--accent-ink);font:600 12px/1 var(--display);letter-spacing:.12em;text-transform:uppercase}
    .feature-media-title{position:absolute;z-index:2;left:22px;bottom:22px;max-width:72%;margin:0;color:var(--accent-ink);font:700 clamp(58px,7vw,96px)/.74 var(--display);letter-spacing:-.05em;text-transform:uppercase;overflow-wrap:anywhere}
    .feature-media.has-image .feature-media-title{max-width:58%;color:var(--ink);text-shadow:0 1px var(--ground)}
    .feature-body{padding:22px 0 28px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:end}
    .feature-status{margin-bottom:10px}
    .feature-summary{max-width:620px;margin:10px 0 0;color:var(--muted)}
    .feature-metrics{margin-top:20px;border-block:1px solid var(--rule);display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
    .feature-metric{min-height:58px;padding:10px 14px;border-right:1px solid var(--rule);display:flex;align-items:center;justify-content:space-between;gap:10px}
    .feature-metric:first-child{padding-left:0}.feature-metric:last-child{border-right:0}
    .feature-metric strong{font:600 20px/1 var(--display);text-transform:uppercase}
    .home-history{min-width:0}
    .history-head{min-height:88px;padding-bottom:16px;border-bottom:1px solid var(--rule);display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
    .history-count{color:var(--dim);font:600 12px var(--display)}
    .recent-list{display:grid}
    .recent-row{min-height:92px;padding:14px 0;border-bottom:1px solid var(--rule);display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;align-content:center;transition:background-color 120ms ease}
    .recent-row:hover{background:var(--surface)}
    .recent-index{color:var(--dim);font:600 11px var(--display)}
    .recent-row strong{display:block;font:600 18px/1 var(--display);letter-spacing:.035em;text-transform:uppercase;overflow-wrap:anywhere}
    .recent-meta{margin-top:7px;display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--muted);font-size:10px}
    .recent-status{color:var(--accent);font:600 10px var(--display);letter-spacing:.1em;text-transform:uppercase}
    .empty-copy{padding:22px 0;border-bottom:1px solid var(--rule);color:var(--muted)}
    @media(max-width:1100px){.home-grid{grid-template-columns:180px minmax(0,1fr);}.home-history{grid-column:2}.home-rail{grid-row:1/3}.feature-media{height:300px}}
    @media(max-width:767px){.home-page{padding-bottom:24px}.profile-strip{min-height:54px}.profile-label{display:none}.profile-options{width:100%;overflow-x:auto}.profile-option{flex:1}.home-grid{display:block;padding-top:16px}.home-rail{padding:0;border:0}.rail-index,.rail-copy{display:none}.quick-list{grid-template-columns:1fr 1fr;border-top:1px solid var(--rule);margin:0 0 24px}.quick-list .text-action:nth-child(odd){padding-right:12px}.quick-list .text-action:nth-child(even){padding-left:12px;border-left:1px solid var(--rule)}.today-head{min-height:62px;align-items:center}.today-head .section-title{font-size:25px}.feature-media{height:210px}.feature-media-title{left:0;bottom:17px;font-size:58px}.feature-number{left:0}.feature-media.has-image .feature-media-title{max-width:76%}.feature-body{grid-template-columns:1fr;padding-top:18px}.feature-metrics{margin-top:16px}.feature-metric{padding-inline:8px}.feature-metric:first-child{padding-left:0}.feature-metric strong{font-size:17px}.home-history{margin-top:30px}.history-head{min-height:58px}.recent-row{min-height:82px}}
`;
