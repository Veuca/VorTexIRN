document.addEventListener('DOMContentLoaded', () => {
    // --- START: Theme Switcher Logic ---
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

    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });

    applySavedTheme();
    // --- END: Theme Switcher Logic ---

    // --- Element Selectors ---
    const refreshButton = document.getElementById('refreshBtn');
    const proxyListContainer = document.getElementById('proxy-list-container');
    const loader = document.getElementById('loader');
    const summaryText = document.getElementById('summary-text');
    const pingLegend = document.getElementById('ping-legend');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');

    const apiUrl = `https://raw.githubusercontent.com/SoliSpirit/mtproto/master/all_proxies.txt?_=${new Date().getTime()}`;

    // --- State Management ---
    let allWorkingProxies = [];
    let itemsPerPage = 10;

    // --- Main Function to Fetch and Process Proxies ---
    async function initialize() {
        showLoader(true);
        summaryText.textContent = 'درحال دریافت لیست پروکسی‌ها...';
        proxyListContainer.innerHTML = '';

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Network error');
            const data = await response.text();
            
            const allProxyUrls = data.trim().split('\n').filter(line => line.startsWith('https://t.me/proxy?'));
            
            summaryText.textContent = `درحال بررسی ${allProxyUrls.length} پروکسی...`;

            const pingPromises = allProxyUrls.map(checkProxy);
            const results = await Promise.all(pingPromises);
            
            allWorkingProxies = results.filter(p => p !== null);

            itemsPerPage = itemsPerPageSelect.value === 'all' ? 'all' : parseInt(itemsPerPageSelect.value);
            updateSummary();
            updateLegend();
            renderProxies();

        } catch (error) {
            console.error('Error:', error);
            summaryText.textContent = 'خطا در دریافت لیست پروکسی‌ها.';
        } finally {
            showLoader(false);
        }
    }

    // --- Rendering Functions ---
    function renderProxies() {
        proxyListContainer.innerHTML = '';
        const proxiesToRender = itemsPerPage === 'all' ? allWorkingProxies : allWorkingProxies.slice(0, itemsPerPage);
        
        if (proxiesToRender.length === 0) {
            proxyListContainer.innerHTML = '<p>پروکسی فعالی یافت نشد.</p>';
            return;
        }

        proxiesToRender.forEach((proxyData, index) => {
            const card = createProxyCard(proxyData, index + 1);
            proxyListContainer.appendChild(card);
        });
    }

    function createProxyCard(proxyData, number) {
        const { url, port, ping } = proxyData;
        const tgUrl = url.replace('https://t.me/', 'tg://');
        
        const card = document.createElement('div');
        const pingClass = ping <= 150 ? 'ping-good' : ping <= 400 ? 'ping-mid' : 'ping-bad';
        card.className = `proxy-card ${pingClass}`;

        const pingLabel = ping <= 150 ? 'خوبه' : ping <= 400 ? 'متوسط' : 'ضعیف';

        const telegramIcon = `
            <svg class="tg-svg" viewBox="0 0 240 240" width="18" height="18" aria-hidden="true" focusable="false">
                <defs>
                    <linearGradient id="tgGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#37aee2"></stop>
                        <stop offset="100%" stop-color="#1e96c8"></stop>
                    </linearGradient>
                </defs>
                <circle cx="120" cy="120" r="120" fill="url(#tgGradient)" />
                <path fill="#c8daea" d="M98 175c-4 0-4-2-6-6l-15-48 110-65"/>
                <path fill="#a9c9dd" d="M98 175c3 0 5-1 7-3l19-18-23-14"/>
                <path fill="#fff" d="M101 140l63 47c7 4 13 2 15-7l27-126c3-13-5-19-13-15L45 99c-12 5-12 12-2 15l39 12 90-56c4-3 7-1 4 2"/>
            </svg>`;
        card.innerHTML = `
            <div class="card-main">
                <div class="proxy-title">پروکسی ${number}</div>
                <div class="proxy-stats">
                    <div class="stat-item">Port<span>${port}</span></div>
                    <div class="stat-item">Ping<span><span class="ping-badge ${pingClass}">${ping}ms • ${pingLabel}</span></span></div>
                </div>
            </div>
            <div class="card-footer">
                <a href="${tgUrl}" class="action-btn connect-btn"><span class="tg-icon">${telegramIcon}</span> اتصال</a>
                <button class="action-btn copy-btn">📋 کپی</button>
            </div>
        `;

        card.querySelector('.copy-btn').addEventListener('click', (e) => {
            navigator.clipboard.writeText(tgUrl).then(() => {
                const btn = e.target;
                btn.textContent = 'کپی شد!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = '📋 کپی';
                    btn.classList.remove('copied');
                }, 1500);
            });
        });

        return card;
    }

    // --- Utility Functions ---
    async function checkProxy(url) {
        try {
            const urlParams = new URLSearchParams(new URL(url).search);
            const server = urlParams.get('server');
            const port = urlParams.get('port');
            const corsProxy = 'https://api.allorigins.win/get?url=';
            const startTime = Date.now();
            
            await fetch(`${corsProxy}http://${server}:${port}`, { mode: 'cors' });
            
            const ping = Date.now() - startTime;
            return { url, server, port, ping };
        } catch (error) {
            return null;
        }
    }

    function updateSummary() {
        const total = allWorkingProxies.length;
        summaryText.textContent = `✅ تعداد ${total} پروکسی فعال پیدا شد.`;
    }

    function updateLegend() {
        if (!pingLegend) return;
        const good = allWorkingProxies.filter(p => p.ping <= 150).length;
        const mid = allWorkingProxies.filter(p => p.ping > 150 && p.ping <= 500).length;
        const bad = allWorkingProxies.filter(p => p.ping > 500).length;
        pingLegend.innerHTML = `
            <div class="item"><span class="dot good"></span><span>≤150 خوب: ${good}</span></div>
            <div class="item"><span class="dot mid"></span><span>151-500 متوسط: ${mid}</span></div>
            <div class="item"><span class="dot bad"></span><span>>500 ضعیف: ${bad}</span></div>
        `;
    }

    function showLoader(isLoading) {
        loader.style.display = isLoading ? 'block' : 'none';
    }

    // --- Event Listeners ---
    refreshButton.addEventListener('click', initialize);
    itemsPerPageSelect.addEventListener('change', (e) => {
        itemsPerPage = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
        renderProxies();
    });

    // --- Initial Load ---
    initialize();
});