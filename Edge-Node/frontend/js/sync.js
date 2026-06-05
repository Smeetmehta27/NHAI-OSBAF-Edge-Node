const pendingCount = document.getElementById("pendingCount");
const syncedCount = document.getElementById("syncedCount");
const syncBtn = document.getElementById("syncBtn");
const logArea = document.getElementById("logArea");

function addLog(message, isError = false) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const color = isError ? '#ef4444' : '#22c55e';
    logArea.innerHTML += `<div class="log-line" style="color: ${color}"><span class="log-time">[${time}]</span> ${message}</div>`;
    logArea.scrollTop = logArea.scrollHeight;
}

async function fetchStats() {
    try {
        const res = await fetch("/sync-stats");
        const data = await res.json();
        pendingCount.innerText = data.pending;
        syncedCount.innerText = data.synced;
        syncBtn.disabled = data.pending === 0;
    } catch (e) {
        addLog("ERROR: Could not fetch local SQLite stats.", true);
    }
}

syncBtn.addEventListener("click", async () => {
    syncBtn.disabled = true;
    addLog("Network connection established. Initiating AWS Datalake batch upload...");
    
    try {
        // Sync
        const syncRes = await fetch("/sync", { method: "POST" });
        const syncData = await syncRes.json();
        addLog(`SUCCESS: Transmitted ${syncData.synced_records} secure records to AWS Kinesis.`);
        await fetchStats();

        // Purge
        addLog("Initiating local storage purge and SQLite VACUUM to reclaim disk space...");
        const purgeRes = await fetch("/purge", { method: "POST" });
        const purgeData = await purgeRes.json();
        addLog(`SUCCESS: Securely purged ${purgeData.purged_records} records. Model footprint optimized.`);
        await fetchStats();
    } catch (e) {
        addLog("ERROR: Sync sequence failed. Connection unstable.", true);
        syncBtn.disabled = false;
    }
});

window.addEventListener('online', () => {
    addLog("SYSTEM ALERT: Hardware network restored. Auto-sync triggered.");
    if (!syncBtn.disabled) syncBtn.click();
});

window.addEventListener('offline', () => {
    addLog("SYSTEM ALERT: Device is offline. Switching to encrypted local vault.", true);
});

fetchStats();