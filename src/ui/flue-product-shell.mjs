import { FLUE_FOUNDATION_CSS } from "./flue-foundation.mjs";

export const FLUE_PRODUCT_CSS = String.raw`${FLUE_FOUNDATION_CSS}
*{box-sizing:border-box}
html{min-height:100%;background:var(--ground)}
body{margin:0;min-height:100%;background:var(--ground);color:var(--ink);font:400 14px/1.45 var(--body)}
a{color:inherit;text-decoration:none}
button,input,textarea,select{font:inherit;color:inherit}
button,a,input,textarea,select{outline:none}
button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
button{touch-action:manipulation}
[hidden]{display:none!important}
.flue-shell{width:min(1520px,100%);min-height:100dvh;margin:0 auto;padding:0 max(40px,env(safe-area-inset-right)) env(safe-area-inset-bottom) max(40px,env(safe-area-inset-left))}
.site-masthead{height:80px;border-bottom:1px solid var(--rule);display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:24px}
.flue-wordmark{font:800 32px/26px var(--display);letter-spacing:-.045em;text-transform:uppercase;white-space:nowrap}
.flue-wordmark-e{position:relative;display:inline-block;margin-left:.035em;transform:skewX(-9deg)}
.flue-wordmark-e:before{content:"";position:absolute;z-index:1;left:-.05em;top:.32em;width:.62em;height:2px;background:var(--ground)}
.flue-wordmark-e:after{content:"";position:absolute;z-index:2;left:.12em;top:.3em;width:.42em;height:2px;background:var(--ink)}
.site-section{min-width:0;color:var(--muted);font:600 13px/1 var(--display);letter-spacing:.12em;text-transform:uppercase}
.site-nav{justify-self:end;display:flex;align-items:stretch;height:100%}
.site-nav a{min-width:82px;min-height:44px;padding:0 14px;border-left:1px solid var(--rule);display:flex;align-items:center;justify-content:center;color:var(--muted);font:600 12px/1 var(--display);letter-spacing:.1em;text-transform:uppercase;transition:color 120ms ease,background-color 120ms ease}
.site-nav a:last-child{border-right:1px solid var(--rule)}
.site-nav a:hover{color:var(--ink);background:var(--surface)}
.site-nav a[aria-current="page"]{color:var(--accent);box-shadow:inset 0 -2px var(--accent)}
.kicker{margin:0;color:var(--accent);font:600 11px/1.2 var(--display);letter-spacing:.14em;text-transform:uppercase}
.display-title{margin:0;font:700 clamp(54px,8vw,112px)/.77 var(--display);letter-spacing:-.045em;text-transform:uppercase}
.section-title{margin:0;font:700 25px/.9 var(--display);letter-spacing:.045em;text-transform:uppercase}
.micro-label{color:var(--muted);font:600 11px/1.2 var(--display);letter-spacing:.12em;text-transform:uppercase}
.status-mark{display:inline-flex;align-items:center;gap:8px;color:var(--accent);font:600 11px/1 var(--display);letter-spacing:.12em;text-transform:uppercase}
.status-mark:before{content:"";width:8px;height:8px;background:var(--accent);transform:rotate(45deg)}
.primary-action{min-height:56px;padding:0 18px;border:0;border-radius:2px;background:var(--accent);color:var(--accent-ink);display:inline-flex;align-items:center;justify-content:space-between;gap:28px;font:800 19px/1 var(--display);letter-spacing:.075em;text-transform:uppercase;cursor:pointer;box-shadow:inset 0 -2px var(--accent-ink);transition:background-color 120ms ease,transform 120ms ease}
.primary-action:hover{background:var(--accent-hover)}
.primary-action:active{transform:scale(.97)}
.text-action{min-height:44px;padding:0;border:0;border-bottom:1px solid var(--dim);background:transparent;display:flex;align-items:center;justify-content:space-between;gap:20px;color:var(--ink);font:600 14px/1 var(--display);letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.text-action:after{content:"→";color:var(--accent);font-size:20px}
.muted{color:var(--muted)}
@media(max-width:767px){.flue-shell{padding-inline:max(20px,env(safe-area-inset-left)) max(20px,env(safe-area-inset-right))}.site-masthead{height:76px;grid-template-columns:auto 1fr}.flue-wordmark{font-size:29px;line-height:24px}.site-section{display:none}.site-nav{height:76px}.site-nav a{min-width:54px;padding-inline:9px;font-size:10px}.display-title{font-size:59px}.primary-action{width:100%;font-size:18px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;
