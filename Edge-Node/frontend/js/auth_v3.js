const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const statusDiv = document.getElementById("statusMessage");
const startBtn = document.getElementById("startAuthBtn");
const resultCard = document.getElementById("resultCard");

let sessionId = null;
let authLoop = null;

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        statusDiv.style.color = "#22c55e";
        statusDiv.innerText = "Camera Active. Ready to authenticate.";
        startBtn.disabled = false;
    } catch(err) {
        console.error("Camera Error:", err);
        statusDiv.style.color = "#ef4444";
        statusDiv.innerText = "Error: Camera access denied. Check browser permissions.";
    }
}

function captureFrame() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.7);
}

async function startAuthenticationFlow() {
    startBtn.disabled = true;
    resultCard.style.display = "none";
    statusDiv.style.color = "#facc15";
    statusDiv.innerText = "Initializing session...";

    try {
        const res = await fetch("/api/auth/start", { method: "POST" });
        if (!res.ok) throw new Error("API not found or server error.");
        const data = await res.json();

        if (data.status === "success") {
            sessionId = data.session_id;
            statusDiv.innerText = "Challenge: Turn " + data.challenge;
            authLoop = setInterval(processFrame, 800);
        } else {
            throw new Error(data.message || "Failed to start session.");
        }
    } catch(e) {
        console.error(e);
        statusDiv.style.color = "#ef4444";
        statusDiv.innerText = "Server Error: Could not connect to API.";
        startBtn.disabled = false;
    }
}

async function processFrame() {
    if (!sessionId) return;
    const frameData = captureFrame();
    try {
        const response = await fetch("/api/auth/frame", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, image: frameData })
        });
        const result = await response.json();

        if (result.status === "pending") {
            statusDiv.innerText = result.message;
        } else if (result.status === "challenge_passed" || result.status === "liveness_passed") {
            statusDiv.style.color = "#38bdf8";
            statusDiv.innerText = result.message;
        } else if (result.status === "success") {
            clearInterval(authLoop);
            sessionId = null;
            statusDiv.innerText = "";
            resultCard.style.display = "block";
            document.getElementById("authName").innerText = "User: " + result.user.name;
            document.getElementById("authConfidence").innerText = "Match Confidence: " + (result.user.confidence * 100).toFixed(2) + "%";
            startBtn.disabled = false;
            startBtn.innerText = "Authenticate Again";
        } else if (result.status === "failed" || result.status === "error") {
            clearInterval(authLoop);
            sessionId = null;
            statusDiv.style.color = "#ef4444";
            statusDiv.innerText = "Authentication Failed: " + result.message;
            startBtn.disabled = false;
            startBtn.innerText = "Retry";
        }
    } catch (e) {
        console.error("Frame processing error", e);
    }
}

startCamera();
startBtn.addEventListener("click", startAuthenticationFlow);
