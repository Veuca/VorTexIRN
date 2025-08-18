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
    const protocolSelector = document.getElementById('protocolSelector');

    const endpoints = {
        all: 'https://raw.githubusercontent.com/ebrasha/free-v2ray-public-list/refs/heads/main/all_extracted_configs.txt',
        ss: 'https://raw.githubusercontent.com/ebrasha/free-v2ray-public-list/refs/heads/main/ss_configs.txt',
        trojan: 'https://raw.githubusercontent.com/ebrasha/free-v2ray-public-list/refs/heads/main/trojan_configs.txt',
        vless: 'https://raw.githubusercontent.com/ebrasha/free-v2ray-public-list/refs/heads/main/vless_configs.txt',
        vmess: 'https://raw.githubusercontent.com/ebrasha/free-v2ray-public-list/refs/heads/main/vmess_configs.txt'
    };

    // State
    let allConfigs = [];
    let filteredConfigs = [];
    let selectedProtocol = 'all';
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
            // Fetch chosen protocol list; for 'all' use the "all" file for performance
            const url = endpoints[selectedProtocol];
            const data = await fetchTextWithCors(url);

            // Split by lines, trim empty
            allConfigs = data.split('\n').map(l => l.trim()).filter(Boolean);

            filterByProtocol();
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

    function filterByProtocol() {
        const lowerStarts = (line, scheme) => line.toLowerCase().startsWith(`${scheme}://`);
        if (selectedProtocol === 'all') {
            filteredConfigs = allConfigs.filter(line => (
                lowerStarts(line, 'vmess') || lowerStarts(line, 'vless') || lowerStarts(line, 'trojan') || lowerStarts(line, 'ss')
            ));
            return;
        }
        const schema = selectedProtocol + '://';
        filteredConfigs = allConfigs.filter(line => line.toLowerCase().startsWith(schema));
    }

    function renderConfigs() {
        configListContainer.innerHTML = '';
        const list = itemsPerPage === 'all' ? filteredConfigs : filteredConfigs.slice(0, itemsPerPage);
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
        summaryText.textContent = `✅ ${filteredConfigs.length} کانفیگ یافت شد`;
    }

    function showLoader(isLoading) {
        loader.style.display = isLoading ? 'block' : 'none';
    }

    // Events
    refreshButton.addEventListener('click', initialize);
    itemsPerPageSelect.addEventListener('change', (e) => {
        itemsPerPage = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
        renderConfigs();
    });
    protocolSelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.protocol-btn');
        if (!btn) return;
        document.querySelectorAll('.protocol-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedProtocol = btn.dataset.protocol;
        initialize();
    });

    // First load
    initialize();
});

