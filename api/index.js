const express = require("express");
const { PDFDocument } = require("pdf-lib");
const cors = require("cors");
const admin = require("firebase-admin");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const crypto = require("crypto");
const axios = require("axios");
const querystring = require("querystring");

const app = express();
app.use(cors());
app.use(express.json());

// firebase
const serviceAccount = require("./firebase.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "final-auth-project.appspot.com",
});
const bucket = admin.storage().bucket();

// api /
app.get("/", (req, res) => res.send("Express on Vercel"));

// random key
const randomBytes = crypto.randomBytes(32);
const yourSecretKey = randomBytes.toString("hex");

app.options("/api/get-secret-key", cors());
app.get("/api/get-secret-key", (req, res) => {
  res.json({ secretKey: yourSecretKey });
});

// api create pdf
app.options("/generate-pdf", cors());
app.post("/generate-pdf", async (req, res) => {
  try {
    const { userInput, fileName } = req.body;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    page.drawText(userInput, { x: 50, y: 50 });

    const pdfBytes = await pdfDoc.save();

    const buffer = Buffer.from(pdfBytes.buffer);
    const file = bucket.file(`${fileName}.pdf`);
    await file.save(buffer, {
      metadata: {
        contentType: "application/pdf",
      },
    });

    const url = await file.getSignedUrl({
      action: "read",
      expires: "03-01-2500",
    });

    res.json({ url, fileName });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res
      .status(500)
      .json({ error: "An error occurred while generating the PDF" });
  }
});

// api delete PDF
app.delete("/api/delete-pdf/:fileName", async (req, res) => {
  try {
    const fileName = req.params.fileName;
    console.log(`${fileName}.pdf`);
    await bucket.file(`${fileName}.pdf`).delete();
    res.status(200).json({ message: "PDF deleted successfully" });
  } catch (error) {
    console.error("Error deleting PDF:", error);
    res.status(500).json({ error: "An error occurred while deleting the PDF" });
  }
});

// api CMU
app.post("/getToken/:code", async (req, res) => {
  try {
    const codeFromURL = req.params.code;
    const requestData = {
      code: codeFromURL,
      redirect_uri: "https://final-project-eta-ruby.vercel.app/callback",
      client_id: "dBH4CNbDdruZ8qyD3qqubEYdVz5xvpnqsDe7yrQb",
      client_secret: "tYEyZQnjDzQ11j8JQDjdTQh0deHEkAfNKnaqaArf",
      grant_type: "authorization_code",
    };

    console.log("codeFromURL:", codeFromURL);

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const response = await axios.post(
      "https://oauth.cmu.ac.th/v1/GetToken.aspx",
      querystring.stringify(requestData),
      { headers }
    );

    console.log("Response:", response.data);
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// api generate qr

app.options("/api/generate-otp-and-qrcode", cors());
app.post("/api/generate-otp-and-qrcode", async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: "OTP Zero-Trust : project",
    });

    const otpauth_url = secret.otpauth_url;
    const qrCodeDataURL = await QRCode.toDataURL(otpauth_url);

    const token = speakeasy.totp({
      secret: secret.base32,
      encoding: "base32",
    });

    res.json({
      secret: secret.base32,
      otpauth_url,
      qrcode: qrCodeDataURL,
      token: token,
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ error: "Error generating QR code" });
  }
});

//api verify qr
app.options("/api/verify-otp", cors());
app.post("/api/verify-otp", async (req, res) => {
  try {
    const { otp, secret, token } = req.body;
    if (secret) {
      if (token == otp) {
        res.json({ valid: true });
      } else {
        res.json({ valid: false });
      }
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Error verifying OTP" });
  }
});

app.listen(5004, () => console.log("Server ready on port 3000."));

module.exports = app;
