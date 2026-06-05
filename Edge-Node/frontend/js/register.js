const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const statusDiv = document.getElementById("statusMessage");
const captureBtn = document.getElementById("captureBtn");

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        statusDiv.style.color = "#22c55e";
        statusDiv.innerText = "Camera Active. Please face the lens.";
        captureBtn.disabled = false;
    } catch(err) {
        console.error("Camera Error:", err);
        statusDiv.style.color = "#ef4444";
        statusDiv.innerText = "Error: Camera access denied or unavailable.";
    }
}

function captureFrame() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
}

captureBtn.addEventListener("click", async () => {
    const userId = document.getElementById("userId").value.trim();
    const name = document.getElementById("name").value.trim();
    if (!userId || !name) {
        statusDiv.style.color = "#ef4444";
        statusDiv.innerText = "Error: Employee ID and Name are required.";
        return;
    }
    captureBtn.disabled = true;
    statusDiv.style.color = "#facc15";
    statusDiv.innerText = "Processing Enrollment...";

    try {
        const startRes = await fetch("/api/register/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, name: name })
        });
        const startData = await startRes.json();
        if (startData.status !== "success") throw new Error("Failed to start session");
        
        const sessionId = startData.session_id;
        const frameRes = await fetch("/api/register/frame", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, image: captureFrame() })
        });
        const frameData = await frameRes.json();
        if (frameData.status !== "success" || !frameData.face_detected) {
            throw new Error(frameData.message || "No face detected. Try again.");
        }

        const completeRes = await fetch(`/api/register/complete?session_id=${sessionId}`, { method: "POST" });
        const completeData = await completeRes.json();
        if (completeData.status === "success") {
            statusDiv.style.color = "#22c55e";
            statusDiv.innerText = "Enrollment Successful!";
            document.getElementById("userId").value = "";
            document.getElementById("name").value = "";
        } else {
            throw new Error(completeData.message || "Registration failed.");
        }
    } catch (err) {
        console.error(err);
        statusDiv.style.color = "#ef4444";
        statusDiv.innerText = err.message;
    } finally {
        setTimeout(() => { captureBtn.disabled = false; }, 2500);
    }
});

startCamera();