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
        card.className = 'proxy-card';

        card.innerHTML = `
            <div class="card-main">
                <div class="proxy-title">پروکسی ${number}</div>
                <div class="proxy-stats">
                    <div class="stat-item">Port<span>${port}</span></div>
                    <div class="stat-item">Ping<span>${ping}ms</span></div>
                </div>
            </div>
            <div class="card-footer">
                <a href="${tgUrl}" class="action-btn connect-btn">🚀 اتصال</a>
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