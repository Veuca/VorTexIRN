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

    // Element Selectors
    const refreshButton = document.getElementById('refreshBtn');
    const proxyListContainer = document.getElementById('proxy-list-container');
    const loader = document.getElementById('loader');
    const summaryText = document.getElementById('summary-text');
    const pingLegend = document.getElementById('ping-legend');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const totalCountEl = document.getElementById('total-count');
    const showAllBtn = document.getElementById('show-all');

    const apiUrl = `https://raw.githubusercontent.com/SoliSpirit/mtproto/master/all_proxies.txt?_=${new Date().getTime()}`;

    // State Management
    let allWorkingProxies = [];
    let itemsPerPage = 10;

    // Main Function
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

    // Rendering Functions
    function renderProxies() {
        const proxiesToRender = itemsPerPage === 'all' ? allWorkingProxies : allWorkingProxies.slice(0, itemsPerPage);
        
        if (proxiesToRender.length === 0) {
            proxyListContainer.innerHTML = `
                <div class="empty-state">
                    <h3>🔍 پروکسی فعالی یافت نشد</h3>
                    <p>لطفاً چند دقیقه دیگر تلاش کنید یا صفحه را بروزرسانی کنید.</p>
                </div>
            `;
            return;
        }

        proxyListContainer.innerHTML = '';
        proxyListContainer.className = 'proxy-container';
        
        proxiesToRender.forEach((proxyData, index) => {
            const card = createProxyCard(proxyData, index + 1);
            card.classList.add('fade-in');
            card.style.animationDelay = `${index * 0.1}s`;
            proxyListContainer.appendChild(card);
        });
    }

    function createProxyCard(proxyData, number) {
        const { url, server, port, ping } = proxyData;
        const tgUrl = url.replace('https://t.me/', 'tg://');
        
        const card = document.createElement('div');
        card.className = 'proxy-card';

        const pingClass = ping <= 150 ? 'good' : ping <= 400 ? 'mid' : 'bad';
        const pingLabel = ping <= 150 ? 'عالی' : ping <= 400 ? 'متوسط' : 'ضعیف';

        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">
                    <div class="card-number">${number}</div>
                    <span>پروکسی تلگرام</span>
                </div>
            </div>
            
            <div class="card-body">
                <div class="card-info">
                    <div class="info-item">
                        <span class="info-label">سرور</span>
                        <span class="info-value">${server}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">پورت</span>
                        <span class="info-value">${port}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">پینگ</span>
                        <div class="ping-status">
                            <span class="ping-dot ${pingClass}"></span>
                            <span class="info-value">${ping}ms</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <span class="info-label">وضعیت</span>
                        <span class="info-value">${pingLabel}</span>
                    </div>
                </div>
            </div>
            
            <div class="card-footer">
                <a href="${tgUrl}" class="action-btn primary-btn">
                    <span class="tg-icon">📱</span>
                    اتصال به تلگرام
                </a>
                <button class="action-btn secondary-btn copy-btn">
                    📋 کپی لینک
                </button>
            </div>
        `;

        // Copy functionality
        const copyBtn = card.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(tgUrl).then(() => {
                copyBtn.textContent = '✅ کپی شد!';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.textContent = '📋 کپی لینک';
                    copyBtn.classList.remove('copied');
                }, 2000);
            });
        });

        return card;
    }

    // Utility Functions
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
        summaryText.textContent = `✅ ${total} پروکسی فعال یافت شد`;
        if (totalCountEl) totalCountEl.textContent = `(${total})`;
    }

    function updateLegend() {
        if (!pingLegend) return;
        const good = allWorkingProxies.filter(p => p.ping <= 150).length;
        const mid = allWorkingProxies.filter(p => p.ping > 150 && p.ping <= 400).length;
        const bad = allWorkingProxies.filter(p => p.ping > 400).length;
        pingLegend.innerHTML = `
            <div class="item"><span class="dot good"></span><span>عالی (≤150ms): ${good}</span></div>
            <div class="item"><span class="dot mid"></span><span>متوسط (151-400ms): ${mid}</span></div>
            <div class="item"><span class="dot bad"></span><span>ضعیف (>400ms): ${bad}</span></div>
        `;
    }

    function showLoader(isLoading) {
        loader.style.display = isLoading ? 'block' : 'none';
    }

    // Event Listeners
    refreshButton.addEventListener('click', initialize);
    
    itemsPerPageSelect.addEventListener('change', (e) => {
        itemsPerPage = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
        renderProxies();
    });
    
    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
            itemsPerPageSelect.value = 'all';
            itemsPerPage = 'all';
            renderProxies();
        });
    }

    // Initial Load
    initialize();
});