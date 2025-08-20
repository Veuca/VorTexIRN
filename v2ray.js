document.addEventListener('DOMContentLoaded', () => {
    // Theme Switcher Logic
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
    const totalCountEl = document.getElementById('total-count');
    const showAllBtn = document.getElementById('show-all');

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

    function renderConfigs() {
        const list = itemsPerPage === 'all' ? allConfigs : allConfigs.slice(0, itemsPerPage);
        
        if (list.length === 0) {
            configListContainer.innerHTML = `
                <div class="empty-state">
                    <h3>🔍 کانفیگی یافت نشد</h3>
                    <p>لطفاً چند دقیقه دیگر تلاش کنید یا صفحه را بروزرسانی کنید.</p>
                </div>
            `;
            return;
        }
        
        configListContainer.innerHTML = '';
        configListContainer.className = 'config-container';
        
        list.forEach((cfg, idx) => {
            const card = createConfigCard(cfg, idx + 1);
            card.classList.add('fade-in');
            card.style.animationDelay = `${idx * 0.05}s`;
            configListContainer.appendChild(card);
        });
    }

    function createConfigCard(configLine, number) {
        const type = detectType(configLine);
        const hash = computeNumericHash(configLine);
        
        const card = document.createElement('div');
        card.className = 'config-card';

        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">
                    <div class="card-number">${number}</div>
                    <span>کانفیگ ${type.toUpperCase()}</span>
                </div>
                <div class="protocol-badge ${type}">${type}</div>
            </div>
            
            <div class="card-body">
                <div class="card-info">
                    <div class="info-item">
                        <span class="info-label">پروتکل</span>
                        <span class="info-value">${type.toUpperCase()}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">هش کانفیگ</span>
                        <span class="info-value">#${hash.slice(-6)}</span>
                    </div>
                    <div class="info-item ping-item">
                        <span class="info-label">پینگ</span>
                        <div class="ping-status">
                            <span class="ping-dot" id="ping-dot-${number}"></span>
                            <span class="info-value" id="ping-value-${number}">بررسی...</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <span class="info-label">وضعیت</span>
                        <span class="info-value" id="status-${number}">در حال بررسی...</span>
                    </div>
                </div>
            </div>
            
            <div class="card-footer">
                <a class="action-btn primary-btn" href="${buildClientUrl(type, configLine)}" target="_blank">
                    🚀 باز کردن در کلاینت
                </a>
                <button class="action-btn secondary-btn copy-btn">
                    📋 کپی کانفیگ
                </button>
            </div>
        `;

        // Copy functionality
        const copyBtn = card.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(configLine).then(() => {
                copyBtn.textContent = '✅ کپی شد!';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.textContent = '📋 کپی کانفیگ';
                    copyBtn.classList.remove('copied');
                }, 2000);
            });
        });

        // Async ping check
        const parsed = parseServerFromConfig(configLine, type);
        if (parsed && parsed.host && parsed.port) {
            measurePing(parsed.host, parsed.port).then((pingMs) => {
                const pingDot = document.getElementById(`ping-dot-${number}`);
                const pingValue = document.getElementById(`ping-value-${number}`);
                const statusEl = document.getElementById(`status-${number}`);
                
                if (typeof pingMs === 'number') {
                    const pingClass = pingMs <= 150 ? 'good' : pingMs <= 500 ? 'mid' : 'bad';
                    const statusText = pingMs <= 150 ? 'عالی' : pingMs <= 500 ? 'متوسط' : 'ضعیف';
                    
                    pingDot.className = `ping-dot ${pingClass}`;
                    pingValue.textContent = `${pingMs}ms`;
                    statusEl.textContent = statusText;
                    card.classList.add(`ping-${pingClass}`);
                } else {
                    pingValue.textContent = 'نامشخص';
                    statusEl.textContent = 'غیرفعال';
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
        return line;
    }

    function updateSummary() {
        summaryText.textContent = `✅ ${allConfigs.length} کانفیگ یافت شد`;
        if (totalCountEl) totalCountEl.textContent = `(${allConfigs.length})`;
    }

    function showLoader(isLoading) {
        loader.style.display = isLoading ? 'block' : 'none';
    }

    // Parse server info (simplified version)
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
                try {
                    const urlObj = new URL(line);
                    return { host: urlObj.hostname, port: urlObj.port || '443' };
                } catch (_) {
                    const withoutScheme = line.replace(/^\w+:\/\//, '');
                    const afterAt = withoutScheme.split('@').pop();
                    const hostPort = (afterAt || '').split('?')[0];
                    const parts = hostPort.split(':');
                    return { host: parts[0] || '', port: parts[1] || '443' };
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
    
    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
            itemsPerPageSelect.value = 'all';
            itemsPerPage = 'all';
            renderConfigs();
        });
    }

    // First load
    initialize();
});

// Utility function for hash
function computeNumericHash(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = (hash * 16777619) >>> 0;
    }
    return (hash % 100000000).toString().padStart(8, '0');
}