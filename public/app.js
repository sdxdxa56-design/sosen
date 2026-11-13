// language: JavaScript, file: public/app.js
const startButton = document.querySelector("#start");
const captureButton = document.querySelector("#capture");
const video = document.querySelector("#preview");
const status = document.querySelector("#status");
let stream;

function setStatus(message) {
  status.textContent = message;
}

startButton.addEventListener("click", async () => {
  startButton.disabled = true;
  try {
    if (!navigator.mediaDevices?.getUserMedia || !navigator.geolocation) {
      throw new Error("المتصفح لا يدعم الكاميرا أو تحديد الموقع.");
    }
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user" }
    });
    video.srcObject = stream;
    video.hidden = false;
    captureButton.hidden = false;
    setStatus("تم تشغيل معاينة الكاميرا. اضغط زر الالتقاط للإرسال.");
  } catch (error) {
    startButton.disabled = false;
    setStatus(`تعذر تشغيل الكاميرا: ${error.message}`);
  }
});

captureButton.addEventListener("click", async () => {
  captureButton.disabled = true;
  setStatus("جارٍ التقاط الصورة وتحديد الموقع...");
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      });
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (!canvas.width || !canvas.height) throw new Error("لم تصبح معاينة الكاميرا جاهزة بعد.");
    canvas.getContext("2d").drawImage(video, 0, 0);
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.88);

    const response = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageDataUrl,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "فشل الإرسال.");
    setStatus(result.message);
    stream?.getTracks().forEach((track) => track.stop());
    video.hidden = true;
    captureButton.hidden = true;
  } catch (error) {
    setStatus(`لم يتم الإرسال: ${error.message}`);
    captureButton.disabled = false;
  }
});