// dashboard.js

async function loadDashboard() {

    const response =
        await fetch("/dashboard");

    const data =
        await response.json();

    document.getElementById("users")
        .innerHTML =
        "Users: " + data.total_users;

    document.getElementById("auth")
        .innerHTML =
        "Authentications: " +
        data.total_authentications;

    document.getElementById("pending")
        .innerHTML =
        "Pending Sync: " +
        data.pending_sync;
}

loadDashboard();