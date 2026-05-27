let _styleInjected = false;
function ensureStyle() {
    if (_styleInjected) return;
    _styleInjected = true;
    const css = `
    .rc-notify-container{position:fixed;right:16px;top:16px;z-index:9999;display:flex;flex-direction:column;gap:8px}
    .rc-notify{min-width:240px;max-width:420px;padding:10px 14px;border-radius:6px;color:#fff;box-shadow:0 6px 18px rgba(0,0,0,0.12);opacity:0;transform:translateY(-8px) scale(0.98);transition:all .18s ease}
    .rc-notify.rc-show{opacity:1;transform:translateY(0) scale(1)}
    .rc-notify.info{background:#333}
    .rc-notify.success{background:#2e7d32}
    .rc-notify.warning{background:#ed6c02}
    .rc-notify.error{background:#c62828}
    `;
    const s = document.createElement('style');
    s.type = 'text/css';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
}

function getContainer() {
    let c = document.getElementById('rc-notify-root');
    if (!c) {
        c = document.createElement('div');
        c.id = 'rc-notify-root';
        c.className = 'rc-notify-container';
        document.body.appendChild(c);
    }
    return c;
}

export function notify(message, { type = 'info', duration = 3500 } = {}) {
    if (typeof document === 'undefined') return;
    ensureStyle();
    const container = getContainer();
    const el = document.createElement('div');
    el.className = `rc-notify ${type}`;
    el.textContent = message;
    container.appendChild(el);
    // show
    // delay to allow insertion
    requestAnimationFrame(() => { el.classList.add('rc-show'); });
    let removed = false;
    const remove = () => {
        if (removed) return;
        removed = true;
        el.classList.remove('rc-show');
        setTimeout(() => { try { container.removeChild(el); } catch { } }, 220);
    };
    const t = setTimeout(remove, duration);
    el.addEventListener('click', () => { clearTimeout(t); remove(); });
    return { remove };
}

export default notify;
