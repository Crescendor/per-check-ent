/* ==========================================================================
   Nothelle Yoklama - Main Application JavaScript
   ========================================================================== */

// --- Global Application State ---
let state = {
    users: [],
    teams: [],
    leaders: [],
    logs: [],
    currentUser: null, // { role: 'admin'|'leader', username: string, teamId?: string }
    nfcScanState: {
        mode: 'idle', // 'idle' or 'assign'
        targetUserId: null
    }
};

// --- Constant Thresholds & Config ---
const COUNTDOWN_DURATION = 7; // Welcome overlay duration in seconds
const DEFAULT_ADMIN_CREDS = { username: 'baydin', password: 'Doxish44.' };

// --- Web Audio API Synth Tone Generator ---
function playBeep(type) {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        
        if (type === 'in') {
            // High-pitched success melody (C5 -> E5)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            gain1.gain.setValueAtTime(0.08, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc1.start();
            osc1.stop(ctx.currentTime + 0.25);
            
            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
                gain2.gain.setValueAtTime(0.08, ctx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
                osc2.start();
                osc2.stop(ctx.currentTime + 0.25);
            }, 100);
            
        } else if (type === 'out') {
            // Medium-pitched exit melody (E5 -> C5)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
            gain1.gain.setValueAtTime(0.08, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc1.start();
            osc1.stop(ctx.currentTime + 0.25);
            
            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                gain2.gain.setValueAtTime(0.08, ctx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
                osc2.start();
                osc2.stop(ctx.currentTime + 0.25);
            }, 100);
            
        } else if (type === 'error') {
            // Low buzz tone (Sawtooth)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(140, ctx.currentTime); // low buzz
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
            osc.start();
            osc.stop(ctx.currentTime + 0.45);
        }
    } catch (err) {
        console.warn("Web Audio API not allowed or failed to initialize", err);
    }
}

// --- Data Seeding & Storage Handlers ---
function initDatabase() {
    // Seed empty databases
    if (!localStorage.getItem('nothelle_teams')) {
        localStorage.setItem('nothelle_teams', JSON.stringify([]));
    }
    if (!localStorage.getItem('nothelle_users')) {
        localStorage.setItem('nothelle_users', JSON.stringify([]));
    }
    if (!localStorage.getItem('nothelle_leaders')) {
        localStorage.setItem('nothelle_leaders', JSON.stringify([]));
    }
    if (!localStorage.getItem('nothelle_logs')) {
        localStorage.setItem('nothelle_logs', JSON.stringify([]));
    }
    loadData();
}

function loadData() {
    state.users = JSON.parse(localStorage.getItem('nothelle_users')) || [];
    state.teams = JSON.parse(localStorage.getItem('nothelle_teams')) || [];
    state.leaders = JSON.parse(localStorage.getItem('nothelle_leaders')) || [];
    state.logs = JSON.parse(localStorage.getItem('nothelle_logs')) || [];
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    loadData();
    // Dispatch storage event manually for same-tab triggers if needed
    window.dispatchEvent(new Event('storage'));
}

// --- Navigation / Routing ---
function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(view => {
        view.classList.remove('active');
    });
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    // Perform cleanup or triggers when views change
    if (viewId === 'kiosk-view') {
        state.currentUser = null;
        sessionStorage.removeItem('logged_in_user');
    } else if (viewId === 'admin-view') {
        renderAdminDashboard();
    } else if (viewId === 'leader-view') {
        renderLeaderDashboard();
    }
}

// Admin Panel Tab Management
function setupAdminTabs() {
    const navItems = document.querySelectorAll('#admin-view .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            const targetTabId = item.getAttribute('data-target-tab');
            document.querySelectorAll('#admin-view .tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById(targetTabId).classList.add('active');
            
            // Update Header titles dynamically
            const headerTitle = document.getElementById('admin-header-title');
            const headerSubtitle = document.getElementById('admin-header-subtitle');
            
            if (targetTabId === 'admin-users-tab') {
                headerTitle.textContent = "Çalışan Yönetimi";
                headerSubtitle.textContent = "Ofis çalışanları ve kart eşleştirme işlemlerini yönetin";
            } else if (targetTabId === 'admin-teams-tab') {
                headerTitle.textContent = "Takım Yönetimi";
                headerSubtitle.textContent = "Departman ve çalışma takımları oluşturun";
            } else if (targetTabId === 'admin-leaders-tab') {
                headerTitle.textContent = "Takım Lideri Hesapları";
                headerSubtitle.textContent = "Takımların anlık takibi için lider girişi oluşturun";
            } else if (targetTabId === 'admin-logs-tab') {
                headerTitle.textContent = "Giriş/Çıkış Hareketleri";
                headerSubtitle.textContent = "Ofis giriş ve çıkış işlemlerinin log kayıtları";
            }
            
            renderAdminTabContent(targetTabId);
        });
    });
}

// --- Render Operations ---

function renderAdminDashboard() {
    // 1. Render Stats
    document.getElementById('stat-total-users').textContent = state.users.length;
    document.getElementById('stat-present-users').textContent = state.users.filter(u => u.isPresent).length;
    document.getElementById('stat-total-teams').textContent = state.teams.length;
    document.getElementById('stat-linked-cards').textContent = state.users.filter(u => u.cardId).length;
    
    // 2. Render Active Tab Content
    const activeTab = document.querySelector('#admin-view .tab-content.active');
    if (activeTab) {
        renderAdminTabContent(activeTab.id);
    }
}

function renderAdminTabContent(tabId) {
    if (tabId === 'admin-users-tab') {
        renderUsersList();
    } else if (tabId === 'admin-teams-tab') {
        renderTeamsList();
    } else if (tabId === 'admin-leaders-tab') {
        renderLeadersList();
    } else if (tabId === 'admin-logs-tab') {
        renderLogsList();
    }
}

// 1. Employees Tab Render
function renderUsersList() {
    const tbody = document.getElementById('users-table-body');
    const query = document.getElementById('search-users').value.toLowerCase().trim();
    tbody.innerHTML = '';
    
    const filteredUsers = state.users.filter(user => {
        const fullName = `${user.name} ${user.surname}`.toLowerCase();
        return fullName.includes(query) || user.title.toLowerCase().includes(query);
    });
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Arama kriterine uygun çalışan bulunamadı.</td></tr>`;
        return;
    }
    
    filteredUsers.forEach(user => {
        const team = state.teams.find(t => t.id === user.teamId);
        const teamName = team ? team.name : 'Belirtilmemiş';
        
        const cardDisplay = user.cardId 
            ? `<span class="card-badge linked"><i data-lucide="nfc" style="width:12px; height:12px;"></i> ${user.cardId}</span>` 
            : `<span class="card-badge" style="color: var(--accent-rose); border-color: rgba(244,63,94,0.15);"><i data-lucide="alert-circle" style="width:12px; height:12px;"></i> Kart Yok</span>`;
            
        const statusDisplay = user.isPresent 
            ? `<span class="status-pill pill-in">Ofiste</span>` 
            : `<span class="status-pill pill-out">Dışarıda</span>`;
            
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${user.name} ${user.surname}</td>
            <td>${teamName}</td>
            <td style="color: var(--text-muted); font-size: 0.9rem;">${user.title}</td>
            <td>${cardDisplay}</td>
            <td>${statusDisplay}</td>
            <td>
                <div class="row-actions">
                    <button class="btn-icon-row edit" onclick="editUser('${user.id}')" title="Düzenle">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="btn-icon-row nfc-link" onclick="startCardLinking('${user.id}')" title="NFC Kartı Eşleştir">
                        <i data-lucide="nfc"></i>
                    </button>
                    <button class="btn-icon-row delete" onclick="deleteUser('${user.id}')" title="Sil">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// 2. Teams Tab Render
function renderTeamsList() {
    const tbody = document.getElementById('teams-table-body');
    tbody.innerHTML = '';
    
    if (state.teams.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">Henüz takım oluşturulmamış.</td></tr>`;
        return;
    }
    
    state.teams.forEach(team => {
        const memberCount = state.users.filter(u => u.teamId === team.id).length;
        const leadersForTeam = state.leaders.filter(l => l.teamId === team.id).map(l => `@${l.username}`).join(', ');
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${team.name} Takımı</td>
            <td><span class="card-badge" style="background: rgba(99,102,241,0.06); color:#a5b4fc; font-weight:600;">${memberCount} Çalışan</span></td>
            <td style="color: var(--text-muted);">${leadersForTeam || 'Lider Atanmamış'}</td>
            <td>
                <div class="row-actions" style="justify-content: center;">
                    <button class="btn-icon-row delete" onclick="deleteTeam('${team.id}')" title="Sil">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// 3. Leaders Tab Render
function renderLeadersList() {
    const tbody = document.getElementById('leaders-table-body');
    tbody.innerHTML = '';
    
    if (state.leaders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">Henüz lider hesabı oluşturulmamış.</td></tr>`;
        return;
    }
    
    state.leaders.forEach(leader => {
        const team = state.teams.find(t => t.id === leader.teamId);
        const teamName = team ? `${team.name} Takımı` : 'Bilinmeyen Takım';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600; color: #a5b4fc;">@${leader.username}</td>
            <td>${teamName}</td>
            <td>
                <div class="row-actions" style="justify-content: center;">
                    <button class="btn-icon-row edit" onclick="editLeader('${leader.id}')" title="Düzenle">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="btn-icon-row delete" onclick="deleteLeader('${leader.id}')" title="Sil">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// 4. Logs Tab Render
function renderLogsList() {
    const tbody = document.getElementById('logs-table-body');
    tbody.innerHTML = '';
    
    // Sort logs descending (newest first)
    const sortedLogs = [...state.logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (sortedLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">Giriş/çıkış logu bulunamadı.</td></tr>`;
        return;
    }
    
    sortedLogs.forEach(log => {
        const date = new Date(log.timestamp);
        const formattedDate = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const formattedTime = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const typeBadge = log.type === 'in' 
            ? `<span class="status-pill pill-in">Ofise Giriş</span>` 
            : `<span class="status-pill pill-out">Ofisten Çıkış</span>`;
            
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color: var(--text-muted); font-size: 0.9rem; font-family: monospace;">${formattedDate} - ${formattedTime}</td>
            <td style="font-weight: 600;">${log.userName}</td>
            <td>${log.teamName} Takımı</td>
            <td>${typeBadge}</td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// 5. Render Leader Dashboard
function renderLeaderDashboard() {
    if (!state.currentUser || state.currentUser.role !== 'leader') return;
    
    const team = state.teams.find(t => t.id === state.currentUser.teamId);
    const teamName = team ? `${team.name} Takımı` : 'Takımım';
    
    // Update labels
    document.getElementById('leader-team-title').textContent = `${teamName} Durumu`;
    document.getElementById('leader-profile-name').textContent = `@${state.currentUser.username}`;
    document.getElementById('leader-profile-team').textContent = teamName;
    document.getElementById('leader-avatar').textContent = state.currentUser.username.substring(0,2).toUpperCase();
    
    // Get team members
    const teamMembers = state.users.filter(u => u.teamId === state.currentUser.teamId);
    
    // Sort so present workers are at the top, followed by absent workers
    teamMembers.sort((a, b) => {
        if (a.isPresent && !b.isPresent) return -1;
        if (!a.isPresent && b.isPresent) return 1;
        // Sub-sort by name
        return a.name.localeCompare(b.name);
    });
    
    // Calculate stats
    const totalCount = teamMembers.length;
    const presentCount = teamMembers.filter(m => m.isPresent).length;
    const absentCount = totalCount - presentCount;
    
    document.getElementById('leader-stat-total').textContent = totalCount;
    document.getElementById('leader-stat-present').textContent = presentCount;
    document.getElementById('leader-stat-absent').textContent = absentCount;
    
    // Render grid cards
    const grid = document.getElementById('leader-team-grid');
    grid.innerHTML = '';
    
    if (teamMembers.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem;" class="glass-panel">Bu takımda tanımlı herhangi bir çalışan bulunmamaktadır.</div>`;
        return;
    }
    
    teamMembers.forEach(member => {
        const initials = `${member.name[0]}${member.surname[0]}`.toUpperCase();
        const cardClass = member.isPresent ? 'team-member-card in-office glass-panel' : 'team-member-card out-office glass-panel';
        
        let activityTimeStr = 'Kayıt Yok';
        if (member.lastActivity) {
            const actDate = new Date(member.lastActivity);
            activityTimeStr = actDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        }
        
        const iconName = member.isPresent ? 'log-in' : 'log-out';
        const labelText = member.isPresent ? `Giriş: ${activityTimeStr}` : `Ayrılış: ${activityTimeStr}`;
        
        const card = document.createElement('div');
        card.className = cardClass;
        card.innerHTML = `
            <div class="member-avatar-glow">${initials}</div>
            <div class="member-info">
                <span class="member-name">${member.name} ${member.surname}</span>
                <span class="member-title">${member.title}</span>
                <span class="member-time">
                    <i data-lucide="${iconName}"></i> ${labelText}
                </span>
            </div>
        `;
        grid.appendChild(card);
    });
    lucide.createIcons();
}



// --- NFC Operations ---

// This function processes ANY scanned card ID, whether simulated or real.
function handleNfcScan(uid) {
    uid = uid.trim().toUpperCase();
    console.log(`NFC Scan triggered for UID: ${uid}`);
    
    // Mode 1: Assigning a Card to a Worker (Admin flow)
    if (state.nfcScanState.mode === 'assign') {
        const userId = state.nfcScanState.targetUserId;
        const user = state.users.find(u => u.id === userId);
        if (!user) {
            cancelNfcScan();
            return;
        }
        
        // Check if this card ID is already linked to another user
        const duplicateUser = state.users.find(u => u.cardId === uid && u.id !== userId);
        if (duplicateUser) {
            if (!confirm(`Bu NFC kartı (${uid}) zaten "${duplicateUser.name} ${duplicateUser.surname}" ile eşleşmiş durumda. Kartı oradan söküp bu kullanıcıya atamak istiyor musunuz?`)) {
                return; // User cancelled duplicate override
            }
            // Remove card from duplicate user
            duplicateUser.cardId = null;
        }
        
        // Link the card
        user.cardId = uid;
        saveData('nothelle_users', state.users);
        
        // Success audio signal (Double high beep)
        playBeep('in');
        
        alert(`Başarılı! "${uid}" kartı, "${user.name} ${user.surname}" isimli çalışan ile eşleştirildi.`);
        
        // Exit Assignment Mode
        cancelNfcScan();
        
        // Re-render
        renderUsersList();
        renderAdminDashboard();
        
        return;
    }
    
    // Mode 2: Welcome/Farewell Kiosk Flow (Normal Flow)
    // Find the user mapped to this card ID
    const user = state.users.find(u => u.cardId === uid);
    
    if (!user) {
        // Unknown Card! Play buzzer error tone
        playBeep('error');
        showUnknownCardOverlay(uid);
        return;
    }
    
    // Toggle user status
    const previousStatus = user.isPresent;
    user.isPresent = !previousStatus;
    user.lastActivity = new Date().toISOString();
    
    // Add entry/exit log
    const team = state.teams.find(t => t.id === user.teamId);
    const teamName = team ? team.name : 'Bilinmeyen';
    
    const newLog = {
        timestamp: user.lastActivity,
        userId: user.id,
        userName: `${user.name} ${user.surname}`,
        teamName: teamName,
        type: user.isPresent ? 'in' : 'out'
    };
    
    state.logs.push(newLog);
    
    // Save state
    saveData('nothelle_users', state.users);
    saveData('nothelle_logs', state.logs);
    
    // Success audio signal (Dynamic tones based on status)
    playBeep(user.isPresent ? 'in' : 'out');
    
    // Trigger the overlay screen (7-second display)
    showWelcomeOverlay(user, teamName, user.isPresent);
    
    // Render current active layout views (for dashboards that may be listening or rendering)
    renderAdminDashboard();
    renderLeaderDashboard();
    
}



// Web NFC API integration (NDEFReader)
async function startWebNfcReader() {
    if ('NDEFReader' in window) {
        try {
            const ndef = new NDEFReader();
            await ndef.scan();
            console.log("Web NFC taraması başarıyla başlatıldı.");
            
            ndef.addEventListener("readingerror", () => {
                console.warn("NFC kartı okunamadı. Lütfen tekrar yaklaştırın.");
            });
            
            ndef.addEventListener("reading", ({ serialNumber }) => {
                handleNfcScan(serialNumber);
            });
        } catch (error) {
            console.warn("Web NFC API tarama başlatılamadı. Kiosk simülatörünü kullanabilirsiniz.", error);
        }
    } else {
        console.log("Bu tarayıcı veya cihaz Web NFC API desteklemiyor. Simülatör devrede.");
    }
}

// --- Welcome / Farewell Overlay Controller ---
let countdownInterval = null;

function showWelcomeOverlay(user, teamName, isEntering) {
    const overlay = document.getElementById('welcome-overlay');
    const titleTag = document.getElementById('welcome-status-tag');
    const msgText = document.getElementById('welcome-msg-text');
    const userNameEl = document.getElementById('welcome-user-name');
    const teamEl = document.getElementById('welcome-user-team');
    const timeEl = document.getElementById('welcome-user-time');
    const glowCircle = document.getElementById('welcome-glow-circle');
    const iconEl = document.getElementById('welcome-icon');
    const progressCircle = document.getElementById('countdown-progress');
    const countdownNumber = document.getElementById('countdown-number');
    
    // Reset timer
    if (countdownInterval) clearInterval(countdownInterval);
    
    // Content Setup
    userNameEl.textContent = `${user.name} ${user.surname}`;
    teamEl.innerHTML = `<i data-lucide="layers" style="color: var(--accent-indigo);"></i> ${teamName} Takımı`;
    
    const entryTime = new Date(user.lastActivity).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    timeEl.innerHTML = `<i data-lucide="clock" style="color: var(--accent-blue);"></i> ${entryTime}`;
    
    if (isEntering) {
        titleTag.textContent = "OFİSE GİRİŞ YAPILDI";
        titleTag.className = "welcome-status-tag tag-emerald";
        msgText.textContent = "Keyifli Çalışmalar, Hoş Geldin";
        glowCircle.className = "success-glow-circle glow-emerald";
        iconEl.setAttribute('data-lucide', 'check');
        progressCircle.className = "countdown-circle-progress progress-emerald";
    } else {
        titleTag.textContent = "OFİSTEN ÇIKIŞ YAPILDI";
        titleTag.className = "welcome-status-tag tag-rose";
        msgText.textContent = "İyi Akşamlar, Görüşmek Üzere";
        glowCircle.className = "success-glow-circle glow-rose";
        iconEl.setAttribute('data-lucide', 'log-out');
        progressCircle.className = "countdown-circle-progress progress-rose";
    }
    
    lucide.createIcons();
    
    // Open Overlay
    overlay.classList.add('active');
    
    // Countdown Timer (7 Seconds)
    let secondsLeft = COUNTDOWN_DURATION;
    const perimeter = 176; // 2 * PI * r (r=28)
    
    countdownNumber.textContent = secondsLeft;
    progressCircle.style.strokeDashoffset = 0;
    
    countdownInterval = setInterval(() => {
        secondsLeft--;
        countdownNumber.textContent = secondsLeft;
        
        // Progress bar visual offset animation
        const ratio = secondsLeft / COUNTDOWN_DURATION;
        progressCircle.style.strokeDashoffset = perimeter - (ratio * perimeter);
        
        if (secondsLeft <= 0) {
            clearInterval(countdownInterval);
            hideWelcomeOverlay();
        }
    }, 1000);
}

function hideWelcomeOverlay() {
    const overlay = document.getElementById('welcome-overlay');
    overlay.classList.remove('active');
    if (countdownInterval) clearInterval(countdownInterval);
}

// Overlay screen for unknown cards
function showUnknownCardOverlay(uid) {
    const overlay = document.getElementById('welcome-overlay');
    const titleTag = document.getElementById('welcome-status-tag');
    const msgText = document.getElementById('welcome-msg-text');
    const userNameEl = document.getElementById('welcome-user-name');
    const teamEl = document.getElementById('welcome-user-team');
    const timeEl = document.getElementById('welcome-user-time');
    const glowCircle = document.getElementById('welcome-glow-circle');
    const iconEl = document.getElementById('welcome-icon');
    const progressCircle = document.getElementById('countdown-progress');
    const countdownNumber = document.getElementById('countdown-number');
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    // Setup for unknown card
    userNameEl.textContent = "Tanımsız Kart";
    titleTag.textContent = "KART EŞLEŞTİRİLMEDİ";
    titleTag.className = "welcome-status-tag tag-rose";
    msgText.textContent = `UID: ${uid}`;
    teamEl.innerHTML = `<i data-lucide="help-circle" style="color: var(--accent-rose);"></i> Lütfen yöneticinizle görüşün`;
    timeEl.innerHTML = `<i data-lucide="info" style="color: var(--accent-amber);"></i> Kart eşleştirme modunu kullanın`;
    
    glowCircle.className = "success-glow-circle glow-rose";
    iconEl.setAttribute('data-lucide', 'x-circle');
    progressCircle.className = "countdown-circle-progress progress-rose";
    
    lucide.createIcons();
    overlay.classList.add('active');
    
    let secondsLeft = 4; // Display for 4 seconds for errors
    countdownNumber.textContent = secondsLeft;
    progressCircle.style.strokeDashoffset = 0;
    
    countdownInterval = setInterval(() => {
        secondsLeft--;
        countdownNumber.textContent = secondsLeft;
        
        const ratio = secondsLeft / 4;
        progressCircle.style.strokeDashoffset = 176 - (ratio * 176);
        
        if (secondsLeft <= 0) {
            clearInterval(countdownInterval);
            hideWelcomeOverlay();
        }
    }, 1000);
}

// --- Card Assign Flow (Modal NFC Scan) ---
function startCardLinking(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    
    state.nfcScanState = {
        mode: 'assign',
        targetUserId: userId
    };
    
    const team = state.teams.find(t => t.id === user.teamId);
    const teamName = team ? team.name : 'Takımsız';
    
    document.getElementById('nfc-scan-user-name').textContent = `Çalışan: ${user.name} ${user.surname} (${teamName})`;
    document.getElementById('modal-nfc-scan').classList.add('active');
}

function cancelNfcScan() {
    state.nfcScanState = {
        mode: 'idle',
        targetUserId: null
    };
    document.getElementById('modal-nfc-scan').classList.remove('active');
}

// --- CRUD Actions ---

// Form Modals Control Helpers
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    
    // Clear forms when closing
    if (modalId === 'modal-employee') {
        document.getElementById('employee-form').reset();
        document.getElementById('employee-id').value = '';
        document.getElementById('employee-modal-title').textContent = 'Yeni Çalışan Ekle';
    } else if (modalId === 'modal-leader') {
        document.getElementById('leader-form').reset();
        document.getElementById('leader-id').value = '';
        document.getElementById('leader-modal-title').textContent = 'Yeni Takım Lideri Ekle';
    } else if (modalId === 'modal-team') {
        document.getElementById('team-form').reset();
    }
}

// Populate Dropdowns in Modals
function populateDropdowns() {
    const empSelect = document.getElementById('employee-team');
    const leaderSelect = document.getElementById('leader-team');
    
    empSelect.innerHTML = '';
    leaderSelect.innerHTML = '';
    
    if (state.teams.length === 0) {
        empSelect.innerHTML = `<option value="">Önce Takım Ekleyin</option>`;
        leaderSelect.innerHTML = `<option value="">Önce Takım Ekleyin</option>`;
        return;
    }
    
    state.teams.forEach(team => {
        const opt1 = document.createElement('option');
        opt1.value = team.id;
        opt1.textContent = `${team.name} Takımı`;
        empSelect.appendChild(opt1);
        
        const opt2 = document.createElement('option');
        opt2.value = team.id;
        opt2.textContent = `${team.name} Takımı`;
        leaderSelect.appendChild(opt2);
    });
}

// 1. Employee Form Submission
document.getElementById('employee-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('employee-id').value;
    const name = document.getElementById('employee-name').value.trim();
    const surname = document.getElementById('employee-surname').value.trim();
    const teamId = document.getElementById('employee-team').value;
    const title = document.getElementById('employee-title').value.trim();
    
    if (id) {
        // Edit User
        const user = state.users.find(u => u.id === id);
        if (user) {
            user.name = name;
            user.surname = surname;
            user.teamId = teamId;
            user.title = title;
        }
    } else {
        // Create User
        const newUser = {
            id: 'user-' + Date.now(),
            name,
            surname,
            teamId,
            title,
            cardId: null,
            isPresent: false,
            lastActivity: null
        };
        state.users.push(newUser);
    }
    
    saveData('nothelle_users', state.users);
    closeModal('modal-employee');
    renderUsersList();
    renderAdminDashboard();
    
});

// Edit Employee trigger
window.editUser = function(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('employee-id').value = user.id;
    document.getElementById('employee-name').value = user.name;
    document.getElementById('employee-surname').value = user.surname;
    document.getElementById('employee-team').value = user.teamId;
    document.getElementById('employee-title').value = user.title;
    
    document.getElementById('employee-modal-title').textContent = 'Çalışan Bilgilerini Düzenle';
    openModal('modal-employee');
};

// Delete Employee
window.deleteUser = function(userId) {
    if (confirm("Bu çalışanı silmek istediğinize emin misiniz? (Bağlı kart devredışı kalacaktır)")) {
        state.users = state.users.filter(u => u.id !== userId);
        saveData('nothelle_users', state.users);
        renderUsersList();
        renderAdminDashboard();
        
    }
};

// 2. Team Form Submission
document.getElementById('team-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const teamName = document.getElementById('team-name').value.trim();
    
    // Duplicate check
    const duplicate = state.teams.find(t => t.name.toLowerCase() === teamName.toLowerCase());
    if (duplicate) {
        alert("Bu isimde bir takım zaten mevcut.");
        return;
    }
    
    const newTeam = {
        id: 'team-' + Date.now(),
        name: teamName
    };
    
    state.teams.push(newTeam);
    saveData('nothelle_teams', state.teams);
    closeModal('modal-team');
    populateDropdowns();
    renderTeamsList();
    renderAdminDashboard();
});

// Delete Team
window.deleteTeam = function(teamId) {
    // Check if team has users
    const hasUsers = state.users.some(u => u.teamId === teamId);
    if (hasUsers) {
        alert("Bu takımda kayıtlı çalışanlar var. Silmeden önce çalışanları başka takımlara taşımalısınız.");
        return;
    }
    
    if (confirm("Bu takımı silmek istediğinize emin misiniz?")) {
        state.teams = state.teams.filter(t => t.id !== teamId);
        // Also remove leaders associated with this team
        state.leaders = state.leaders.filter(l => l.teamId !== teamId);
        
        saveData('nothelle_teams', state.teams);
        saveData('nothelle_leaders', state.leaders);
        
        populateDropdowns();
        renderTeamsList();
        renderLeadersList();
        renderAdminDashboard();
    }
};

// 3. Leader Form Submission
document.getElementById('leader-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('leader-id').value;
    const username = document.getElementById('leader-username').value.trim().toLowerCase();
    const password = document.getElementById('leader-password').value.trim();
    const teamId = document.getElementById('leader-team').value;
    
    // Check username duplicates
    const duplicate = state.leaders.find(l => l.username === username && l.id !== id);
    if (duplicate || username === 'admin') {
        alert("Bu kullanıcı adı zaten kullanımda.");
        return;
    }
    
    if (id) {
        // Edit Leader
        const leader = state.leaders.find(l => l.id === id);
        if (leader) {
            leader.username = username;
            leader.password = password;
            leader.teamId = teamId;
        }
    } else {
        // Create Leader
        const newLeader = {
            id: 'leader-' + Date.now(),
            username,
            password,
            teamId
        };
        state.leaders.push(newLeader);
    }
    
    saveData('nothelle_leaders', state.leaders);
    closeModal('modal-leader');
    renderLeadersList();
    renderAdminDashboard();
});

// Edit Leader trigger
window.editLeader = function(leaderId) {
    const leader = state.leaders.find(l => l.id === leaderId);
    if (!leader) return;
    
    document.getElementById('leader-id').value = leader.id;
    document.getElementById('leader-username').value = leader.username;
    document.getElementById('leader-password').value = leader.password;
    document.getElementById('leader-team').value = leader.teamId;
    
    document.getElementById('leader-modal-title').textContent = 'Lider Hesabını Düzenle';
    openModal('modal-leader');
};

// Delete Leader
window.deleteLeader = function(leaderId) {
    if (confirm("Bu lider hesabını silmek istediğinize emin misiniz?")) {
        state.leaders = state.leaders.filter(l => l.id !== leaderId);
        saveData('nothelle_leaders', state.leaders);
        renderLeadersList();
        renderAdminDashboard();
    }
};

// Clear Logs Action
document.getElementById('btn-clear-logs').addEventListener('click', () => {
    if (confirm("Tüm giriş-çıkış loglarını silmek istediğinize emin misiniz?")) {
        state.logs = [];
        saveData('nothelle_logs', state.logs);
        renderLogsList();
    }
});

// --- Authentication / Login Controller ---
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value.trim();
    
    // 1. Check Admin Credentials
    if (username === DEFAULT_ADMIN_CREDS.username && password === DEFAULT_ADMIN_CREDS.password) {
        state.currentUser = { role: 'admin', username: 'Yönetici' };
        sessionStorage.setItem('logged_in_user', JSON.stringify(state.currentUser));
        
        // Reset Login Form and Switch
        document.getElementById('login-form').reset();
        showView('admin-view');
        return;
    }
    
    // 2. Check Leaders Credentials
    const leader = state.leaders.find(l => l.username === username && l.password === password);
    if (leader) {
        state.currentUser = { role: 'leader', username: leader.username, teamId: leader.teamId };
        sessionStorage.setItem('logged_in_user', JSON.stringify(state.currentUser));
        
        document.getElementById('login-form').reset();
        showView('leader-view');
        return;
    }
    
    // 3. Login Error
    alert("Hatalı kullanıcı adı veya şifre! Lütfen tekrar deneyin.");
});

// --- Multi-Tab Synchronization & Window Listeners ---
window.addEventListener('storage', (e) => {
    // Reload state databases from local storage
    loadData();
    
    // Re-render only active views/panels dynamically
    const activeView = document.querySelector('.view-section.active');
    if (activeView) {
        if (activeView.id === 'admin-view') {
            renderAdminDashboard();
        } else if (activeView.id === 'leader-view') {
            renderLeaderDashboard();
        }
    }
    
});

// --- Dom Interactive Setup (onload) ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize databases
    initDatabase();
    
    // 2. Setup icons
    lucide.createIcons();
    
    // 3. Initialize dynamic dropdown selections
    populateDropdowns();
    
    // 4. Start NFC reading scan (if Web NFC supported)
    startWebNfcReader();
    
    // 5. Setup admin panel tabs routing
    setupAdminTabs();
    
    // 6. Check Session persistence on reload
    const savedUser = sessionStorage.getItem('logged_in_user');
    if (savedUser) {
        state.currentUser = JSON.parse(savedUser);
        if (state.currentUser.role === 'admin') {
            showView('admin-view');
        } else if (state.currentUser.role === 'leader') {
            showView('leader-view');
        }
    }
    
    // --- Hook UI click events ---
    
    // View navigation buttons
    document.getElementById('to-login-btn').addEventListener('click', () => showView('login-view'));
    document.getElementById('login-back-btn').addEventListener('click', () => showView('kiosk-view'));
    document.getElementById('admin-to-kiosk-btn').addEventListener('click', () => showView('kiosk-view'));
    document.getElementById('leader-to-kiosk-btn').addEventListener('click', () => showView('kiosk-view'));
    
    // Logout buttons
    document.getElementById('admin-logout-btn').addEventListener('click', () => showView('kiosk-view'));
    document.getElementById('leader-logout-btn').addEventListener('click', () => showView('kiosk-view'));
    
    // Welcome Overlay Close trigger (click anywhere on overlay)
    document.getElementById('welcome-overlay').addEventListener('click', hideWelcomeOverlay);
    
    // Action buttons inside panels
    document.getElementById('btn-add-user').addEventListener('click', () => {
        populateDropdowns();
        openModal('modal-employee');
    });
    
    document.getElementById('btn-add-team').addEventListener('click', () => {
        openModal('modal-team');
    });
    
    document.getElementById('btn-add-leader').addEventListener('click', () => {
        populateDropdowns();
        openModal('modal-leader');
    });
    
    // Search filter trigger
    document.getElementById('search-users').addEventListener('input', renderUsersList);
    
    
});

