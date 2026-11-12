const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbx-FgMwL_DDWZTdetuTZLJ0Yep6VxWPzfvWuc63uIwUMfXcjLkd-aVJBj3RtcRoQEOm/exec";

let students = JSON.parse(localStorage.getItem('alhuda_students')) || [];
let normalAttendance = JSON.parse(localStorage.getItem('alhuda_normal_attendance')) || {};
let dailyRecitation = JSON.parse(localStorage.getItem('alhuda_daily_recitation')) || {};

let isSyncing = false;
let pendingChanges = false;
let syncInterval = null;
let saveDebounceTimer = null;

// Local timezone YYYY-MM-DD (prevents UTC midnight date shift in IST)
function getLocalTodayString() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
}

const todayStr = getLocalTodayString();
const attendanceDateEl = document.getElementById('attendance-date');
const recitationDateEl = document.getElementById('recitation-date');
if (attendanceDateEl) attendanceDateEl.value = todayStr;
if (recitationDateEl) recitationDateEl.value = todayStr;

function setSyncStatus(text, color = "rgba(255,255,255,0.7)") {
    const el = document.getElementById('sync-status');
    if (el) {
        el.textContent = text;
        el.style.color = color;
    }
}

async function loginAdmin() {
    const inputPass = document.getElementById('admin-pass').value;
    if (inputPass === '0709') {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        document.getElementById('lock-btn').classList.remove('hidden');
        document.getElementById('auth-error').classList.add('hidden');

        renderAllTables();
        await syncFromGoogleSheets(true);
    } else {
        document.getElementById('auth-error').classList.remove('hidden');
    }
}

function logoutAdmin() {
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('lock-btn').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('admin-pass').value = '';
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    btnElement.classList.add('active');
}

function sanitizeAndSortStudents() {
    const uniqueMap = {};
    students.forEach(st => {
        const id = Number(st.id);
        if (id > 0) {
            uniqueMap[id] = {
                id: id,
                name: String(st.name || "").trim(),
                examMark: Number(st.examMark) || 0,
                vivaMark: Number(st.vivaMark) || 0,
                noteMark: Number(st.noteMark) || 0
            };
        }
    });
    students = Object.keys(uniqueMap)
        .map(Number)
        .sort((a, b) => a - b)
        .map(id => uniqueMap[id]);
}

function renderAllTables() {
    sanitizeAndSortStudents();
    renderExamTable();
    loadAttendanceDate();
    loadRecitationDate();
    renderStudentsList();
}

function renderExamTable() {
    const tbody = document.getElementById('exam-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    students.forEach((st, idx) => {
        tbody.innerHTML += `
            <tr>
                <td>${st.id}</td>
                <td><strong>${st.name}</strong></td>
                <td><input type="number" style="width: 55px;" min="0" max="100" value="${st.examMark}" onchange="updateMark(${idx}, 'examMark', this.value)"></td>
                <td><input type="number" style="width: 50px;" min="0" max="50" value="${st.vivaMark}" onchange="updateMark(${idx}, 'vivaMark', this.value)"></td>
                <td><input type="number" style="width: 50px;" min="0" max="10" value="${st.noteMark}" onchange="updateMark(${idx}, 'noteMark', this.value)"></td>
            </tr>
        `;
    });
}

function updateMark(index, field, value) {
    students[index][field] = Number(value) || 0;
    saveLocal();
    queueAutoSave();
}

function loadAttendanceDate() {
    const date = (attendanceDateEl && attendanceDateEl.value) ? attendanceDateEl.value : todayStr;
    if (!normalAttendance[date]) normalAttendance[date] = {};

    const tbody = document.getElementById('attendance-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    students.forEach(st => {
        const key = String(st.id);
        const status = normalAttendance[date][key] || 'Present';
        normalAttendance[date][key] = status;

        const isPresent = status === 'Present';
        tbody.innerHTML += `
            <tr>
                <td>${st.id}</td>
                <td>${st.name}</td>
                <td>
                    <button class="status-btn ${isPresent ? 'status-present' : 'status-absent'}" 
                        onclick="toggleAttendance('${date}', '${key}')">
                        ${isPresent ? '✓ Present' : '✗ Absent'}
                    </button>
                </td>
            </tr>
        `;
    });
    saveLocal();
}

function toggleAttendance(date, studentId) {
    const key = String(studentId);
    if (!normalAttendance[date]) normalAttendance[date] = {};
    const current = normalAttendance[date][key] || 'Present';
    normalAttendance[date][key] = (current === 'Present') ? 'Absent' : 'Present';
    loadAttendanceDate();
    queueAutoSave();
}

function loadRecitationDate() {
    const date = (recitationDateEl && recitationDateEl.value) ? recitationDateEl.value : todayStr;
    if (!dailyRecitation[date]) dailyRecitation[date] = {};

    const tbody = document.getElementById('recitation-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    students.forEach(st => {
        const key = String(st.id);
        const status = dailyRecitation[date][key] || 'Not Done';
        dailyRecitation[date][key] = status;

        const isDone = status === 'Done';
        tbody.innerHTML += `
            <tr>
                <td>${st.id}</td>
                <td>${st.name}</td>
                <td>
                    <button class="status-btn ${isDone ? 'status-present' : 'status-absent'}" 
                        onclick="toggleRecitation('${date}', '${key}')">
                        ${isDone ? '✓ Done' : '✗ Not Done'}
                    </button>
                </td>
            </tr>
        `;
    });
    saveLocal();
}

function toggleRecitation(date, studentId) {
    const key = String(studentId);
    if (!dailyRecitation[date]) dailyRecitation[date] = {};
    const current = dailyRecitation[date][key] || 'Not Done';
    dailyRecitation[date][key] = (current === 'Not Done') ? 'Done' : 'Not Done';
    loadRecitationDate();
    queueAutoSave();
}

function addStudent() {
    const nameInput = document.getElementById('new-student-name');
    const name = nameInput.value.trim();
    if (!name) return;

    const newId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101;
    students.push({
        id: newId,
        name: name,
        examMark: 0,
        vivaMark: 0,
        noteMark: 0
    });

    nameInput.value = '';
    saveLocal();
    renderAllTables();
    queueAutoSave();
}

function deleteStudent(id) {
    if (confirm("Delete student?")) {
        students = students.filter(s => s.id !== Number(id));
        saveLocal();
        renderAllTables();
        queueAutoSave();
    }
}

function renderStudentsList() {
    const tbody = document.getElementById('students-list-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    students.forEach(st => {
        tbody.innerHTML += `
            <tr>
                <td>${st.id}</td>
                <td>${st.name}</td>
                <td><button style="background:#ff5252; color:white; border:none; padding:4px 8px; border-radius:6px; cursor:pointer; font-size:11px;" onclick="deleteStudent(${st.id})">Delete</button></td>
            </tr>
        `;
    });
}

function saveLocal() {
    localStorage.setItem('alhuda_students', JSON.stringify(students));
    localStorage.setItem('alhuda_normal_attendance', JSON.stringify(normalAttendance));
    localStorage.setItem('alhuda_daily_recitation', JSON.stringify(dailyRecitation));
}

// Debounces rapid clicks so multiple quick toggles batch into a single clean write
function queueAutoSave() {
    pendingChanges = true;
    setSyncStatus("Saving changes...", "#b4d32b");
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
        saveDataToGoogleSheets(true);
    }, 600);
}

async function saveDataToGoogleSheets(isSilent = true) {
    if (!GOOGLE_SHEET_WEBHOOK_URL || GOOGLE_SHEET_WEBHOOK_URL.includes("PASTE_YOUR")) {
        if (!isSilent) alert("Saved locally!");
        return;
    }

    isSyncing = true;
    pendingChanges = false;
    sanitizeAndSortStudents();
    saveLocal();
    setSyncStatus("Syncing to Google Sheets...", "#b4d32b");

    try {
        const payload = {
            students: students,
            attendance: normalAttendance,
            recitation: dailyRecitation
        };

        await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        // Allow Google Sheets 1.5s to commit write before resuming polling
        await new Promise(resolve => setTimeout(resolve, 1500));
        setSyncStatus("All changes synced ✓", "#b4d32b");
        if (!isSilent) alert("Saved & synced successfully!");
    } catch (err) {
        setSyncStatus("Sync error - saved locally", "#ff5252");
        if (!isSilent) alert("Sync error: " + err.message);
    } finally {
        isSyncing = false;
    }
}

async function syncFromGoogleSheets(isAutomatic = false) {
    if (isSyncing || pendingChanges) return;

    if (!GOOGLE_SHEET_WEBHOOK_URL || GOOGLE_SHEET_WEBHOOK_URL.includes("PASTE_YOUR")) {
        if (!isAutomatic) alert("Please add GOOGLE_SHEET_WEBHOOK_URL first.");
        renderAllTables();
        return;
    }

    try {
        const res = await fetch(`${GOOGLE_SHEET_WEBHOOK_URL}?t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();

        // Abort applying fetched state if the user clicked something while fetching
        if (isSyncing || pendingChanges) return;

        if (Array.isArray(data.students) && data.students.length > 0) {
            students = data.students;
        }
        if (data.attendance && typeof data.attendance === 'object') {
            normalAttendance = data.attendance;
        }
        if (data.recitation && typeof data.recitation === 'object') {
            dailyRecitation = data.recitation;
        }

        sanitizeAndSortStudents();
        saveLocal();

        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (activeTag !== 'INPUT') {
            renderAllTables();
        }

        setSyncStatus(`Synced • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);

        if (!syncInterval) {
            syncInterval = setInterval(() => {
                if (!document.getElementById('admin-dashboard').classList.contains('hidden')) {
                    syncFromGoogleSheets(true);
                }
            }, 5000);
        }

        if (!isAutomatic) alert("Synced latest data!");
    } catch (err) {
        if (!isAutomatic) alert("Sync failed: " + err.message);
        renderAllTables();
    }
}
