async function loadLogs(){

    const response =
        await fetch("/logs-api");

    const logs =
        await response.json();

    const tbody =
        document.querySelector(
            "#logsTable tbody"
        );

    tbody.innerHTML = "";

    let pending = 0;
    let synced = 0;

    logs.forEach(log => {

        const status =
            log.sync_status || "PENDING";

        if(status === "PENDING"){
            pending++;
        }else{
            synced++;
        }

        tbody.innerHTML += `
        <tr>
            <td>${log.id}</td>
            <td>${log.user_id}</td>
            <td class="confidence">
                ${(log.confidence * 100).toFixed(2)}%
            </td>
            <td>${log.timestamp}</td>
            <td class="${
                status === "PENDING"
                ? "pending"
                : "synced"
            }">
                ${status}
            </td>
        </tr>
        `;
    });

    document.getElementById(
        "totalLogs"
    ).innerText =
        logs.length;

    document.getElementById(
        "pendingLogs"
    ).innerText =
        pending;

    document.getElementById(
        "syncedLogs"
    ).innerText =
        synced;
}

loadLogs();