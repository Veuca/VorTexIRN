document.addEventListener('DOMContentLoaded', () => {
    // Theme switcher parity with proxy.js
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const applySavedTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            body.classList.add('dark-mode');
            themeToggle.checked = true;
        } else {
            body.classList.remove('dark-mode');
            themeToggle.checked = false;
        }
    };
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            if (themeToggle.checked) {
                body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                body.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
            }
        });
    }
    applySavedTheme();

    // Elements
    const refreshButton = document.getElementById('refreshBtn');
    const configListContainer = document.getElementById('config-list-container');
    const loader = document.getElementById('loader');
    const summaryText = document.getElementById('summary-text');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    // Protocol selector removed
    // Removed manual import elements

    const V2RAY_URL = 'https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/all_sub.txt';

    // State
    let allConfigs = [];
    let itemsPerPage = 10;

    // Fetch with CORS fallback
    async function fetchTextWithCors(url) {
        const bust = `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`;
        try {
            const r = await fetch(bust);
            if (r.ok) return await r.text();
            throw new Error('direct fetch not ok');
        } catch (e) {
            try {
                const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(bust)}`;
                const pr = await fetch(proxied);
                if (!pr.ok) throw new Error('proxy fetch not ok');
                return await pr.text();
            } catch (e2) {
                throw e2;
            }
        }
    }

    // Initialize
    async function initialize() {
        showLoader(true);
        summaryText.textContent = 'درحال دریافت لیست کانفیگ‌ها...';
        configListContainer.innerHTML = '';

        try {
            const data = await fetchTextWithCors(V2RAY_URL);

            // Split by lines, trim empty and keep only known schemes
            allConfigs = data.split('\n')
                .map(l => l.trim())
                .filter(Boolean)
                .filter(line => /^(vmess|vless|trojan|ss):\/\//i.test(line));

            itemsPerPage = itemsPerPageSelect.value === 'all' ? 'all' : parseInt(itemsPerPageSelect.value);
            updateSummary();
            renderConfigs();
        } catch (err) {
            console.error(err);
            summaryText.textContent = 'خطا در دریافت کانفیگ‌ها.';
        } finally {
            showLoader(false);
        }
    }

    // Removed protocol filtering; we use a unified list

    function renderConfigs() {
        configListContainer.innerHTML = '';
        const list = itemsPerPage === 'all' ? allConfigs : allConfigs.slice(0, itemsPerPage);
        if (list.length === 0) {
            configListContainer.innerHTML = '<p>کانفیگی یافت نشد.</p>';
            return;
        }
        list.forEach((cfg, idx) => {
            const card = createConfigCard(cfg, idx + 1);
            configListContainer.appendChild(card);
        });
    }

    function createConfigCard(configLine, number) {
        const type = detectType(configLine);
        const title = `${type.toUpperCase()} #${number}`;
        const copyLabel = 'کپی کانفیگ';

        const card = document.createElement('div');
        card.className = 'proxy-card config-card';
        card.innerHTML = `
            <div class="card-main">
                <div>
                    <div class="config-title">${title}</div>
                    <div class="config-meta">
                        <span class="config-type">پروتکل: <span class="pill ${type}">${type}</span></span>
                        <span>طول: ${configLine.length}</span>
                        <span class="host-field" hidden>سرور: <strong class="host-val"></strong></span>
                        <span class="port-field" hidden>پورت: <strong class="port-val"></strong></span>
                        <span class="ping-field" hidden>پینگ: <span class="ping-badge">—</span></span>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <a class="action-btn connect-btn" href="${buildClientUrl(type, configLine)}" target="_blank">باز کردن در کلاینت</a>
                <button class="action-btn copy-btn">📋 ${copyLabel}</button>
            </div>
        `;

        card.querySelector('.copy-btn').addEventListener('click', (e) => {
            navigator.clipboard.writeText(configLine).then(() => {
                const btn = e.target;
                btn.textContent = 'کپی شد!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = `📋 ${copyLabel}`;
                    btn.classList.remove('copied');
                }, 1500);
            });
        });

        // Try to parse server and measure ping
        const parsed = parseServerFromConfig(configLine, type);
        if (parsed && parsed.host && parsed.port) {
            const hostField = card.querySelector('.host-field');
            const portField = card.querySelector('.port-field');
            const pingField = card.querySelector('.ping-field');
            const hostVal = card.querySelector('.host-val');
            const portVal = card.querySelector('.port-val');
            hostVal.textContent = parsed.host;
            portVal.textContent = parsed.port;
            hostField.removeAttribute('hidden');
            portField.removeAttribute('hidden');
            pingField.removeAttribute('hidden');

            measurePing(parsed.host, parsed.port).then((pingMs) => {
                const pingBadge = card.querySelector('.ping-badge');
                if (typeof pingMs === 'number') {
                    const cls = pingMs <= 150 ? 'ping-good' : pingMs <= 500 ? 'ping-mid' : 'ping-bad';
                    pingBadge.textContent = `${pingMs}ms`;
                    pingBadge.classList.add(cls);
                    card.classList.add(cls);
                } else {
                    pingBadge.textContent = 'نامشخص';
                }
            });
        }

        return card;
    }

    function detectType(line) {
        const lower = line.toLowerCase();
        if (lower.startsWith('vmess://')) return 'vmess';
        if (lower.startsWith('vless://')) return 'vless';
        if (lower.startsWith('trojan://')) return 'trojan';
        if (lower.startsWith('ss://')) return 'ss';
        return 'unknown';
    }

    function buildClientUrl(type, line) {
        // Open in v2ray, nekoray or other clients if they register URL schemes.
        // Otherwise, use the same line to let OS/Browser handle.
        return line;
    }

    function updateSummary() {
        summaryText.textContent = `✅ ${allConfigs.length} کانفیگ یافت شد`;
    }

    function showLoader(isLoading) {
        loader.style.display = isLoading ? 'block' : 'none';
        const overlay = document.getElementById('page-preloader');
        if (overlay) overlay.style.display = isLoading ? 'flex' : 'none';
    }

    // Parse host/port from various config schemes
    function parseServerFromConfig(line, type) {
        try {
            if (type === 'vmess') {
                const b64 = line.slice('vmess://'.length).trim();
                const normalized = normalizeBase64(b64);
                const jsonStr = atob(normalized);
                const obj = JSON.parse(jsonStr);
                if (obj && obj.add && obj.port) {
                    return { host: obj.add, port: String(obj.port) };
                }
            } else if (type === 'vless' || type === 'trojan') {
                // Some browsers may not parse custom schemes; fallback manual
                let host = '';
                let port = '';
                try {
                    const urlObj = new URL(line);
                    host = urlObj.hostname;
                    port = urlObj.port;
                } catch (_) {
                    const withoutScheme = line.replace(/^\w+:\/\//, '');
                    const afterAt = withoutScheme.split('@').pop();
                    const hostPort = (afterAt || '').split('?')[0];
                    const parts = hostPort.split(':');
                    host = parts[0] || '';
                    port = parts[1] || '';
                }
                return { host, port: port || '443' };
            } else if (type === 'ss') {
                // ss://[base64(method:password@host:port)] or ss://method:password@host:port#tag
                const raw = line.slice('ss://'.length);
                if (raw.includes('@')) {
                    let tmp;
                    try {
                        tmp = new URL(line.replace('ss://', 'http://'));
                    } catch (_) {
                        // manual fallback
                        const withoutScheme = raw;
                        const afterAt = withoutScheme.split('@').pop();
                        const hostPort = (afterAt || '').split('#')[0].split('?')[0];
                        const hp = hostPort.split(':');
                        return { host: hp[0] || '', port: hp[1] || '443' };
                    }
                    return { host: tmp.hostname, port: tmp.port || '443' };
                } else {
                    const b64 = raw.split('#')[0];
                    const normalized = normalizeBase64(b64);
                    const decoded = atob(normalized);
                    const atIndex = decoded.lastIndexOf('@');
                    if (atIndex !== -1) {
                        const hostPort = decoded.substring(atIndex + 1);
                        const [host, port] = hostPort.split(':');
                        if (host && port) return { host, port };
                    }
                }
            }
        } catch (e) {
            // ignore parsing errors
        }
        return null;
    }

    function normalizeBase64(input) {
        const replaced = input.replace(/-/g, '+').replace(/_/g, '/');
        const padLen = (4 - (replaced.length % 4)) % 4;
        return replaced + '='.repeat(padLen);
    }

    async function measurePing(host, port) {
        try {
            const start = Date.now();
            const target = `http://${host}:${port}`;
            const proxied = `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`;
            await fetch(proxied, { method: 'GET', cache: 'no-store' });
            return Date.now() - start;
        } catch (e) {
            return null;
        }
    }

    // Events
    refreshButton.addEventListener('click', initialize);
    itemsPerPageSelect.addEventListener('change', (e) => {
        itemsPerPage = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
        renderConfigs();
    });
    // protocol selector removed

    // Manual import feature removed per requirements

    // First load
    initialize();
});

