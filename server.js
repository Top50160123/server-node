const express = require("express");
const { PDFDocument } = require("pdf-lib");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = require("./firebase.json");
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require("crypto");
const axios = require('axios');
const querystring = require('querystring');

const app = express();
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "final-auth-project.appspot.com",
});
const bucket = admin.storage().bucket();

const randomBytes = crypto.randomBytes(32);
const yourSecretKey = randomBytes.toString("hex");

app.options("/api/get-secret-key", cors());
app.get("/api/get-secret-key", (req, res) => {
  res.json({ secretKey: yourSecretKey });
});

app.options("/api/generate-otp-and-qrcode", cors());
app.post("/api/generate-otp-and-qrcode", async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: "OTP Zero-Trust : project",
    });
    const otpauth_url = secret.otpauth_url;
    const qrCodeDataURL = await QRCode.toDataURL(otpauth_url);

    res.json({
      secret: secret.base32,
      otpauth_url,
      qrcode: qrCodeDataURL,
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ error: "Error generating QR code" });
  }
});

app.options("/api/verify-otp", cors());
app.post("/api/verify-otp", (req, res) => {
  try {
    const { otp, secret } = req.body;
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token: otp,
      window: 2,
    });

    if (isValid) {
      res.json({ message: "OTP is valid" });
    } else {
      res.status(401).json({ error: "Invalid OTP" });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Error verifying OTP" });
  }
});

app.options("/getToken/:code", cors());
app.post("/getToken/:code", async (req, res) => {
  try {
    const codeFromURL = req.params.code;
    const requestData = {
      code: codeFromURL,
      redirect_uri: "YOUR_REDIRECT_URI_HERE",
      client_id: "YOUR_CLIENT_ID_HERE",
      client_secret: "YOUR_CLIENT_SECRET_HERE",
      grant_type: "authorization_code",
    };

    console.log("codeFromURL:", codeFromURL);

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const response = await axios.post(
      "YOUR_EXTERNAL_API_URL_HERE",
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

app.options("/api/delete-pdf/:fileName", cors());
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

app.options("/", cors());
app.get("/", (req, res) => {
  res.send("Node start");
});

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
