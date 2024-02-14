const express = require("express");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");

const axios = require("axios");
const querystring = require("querystring");

const speakeasy = require("speakeasy");
const bodyParser = require("body-parser");
const QRCode = require("qrcode");

const app = express();
const port = 5003;

app.use(bodyParser.json());

app.use(cors());
app.use(express.static(path.join(__dirname, "build")));
app.use(express.json());

const randomBytes = crypto.randomBytes(32);
const yourSecretKey = randomBytes.toString("hex");

app.use((req, res, next) => {
  const token = req.header("Authorization");

  if (token) {
    req.token = token;
  }

  next();
});

app.options("/generate-pdf", cors());
app.post("/generate-pdf", (req, res) => {
  res.json({ message: "generate-pdf, your app is working well" });
  const { userInput, fileName } = req.body;
  res.json({ message: "userInput:", userInput });
  res.json({ message: "fileName:", fileName });
  const filePath = path.join(__dirname, `${fileName}.pdf`);
  generatePDF(userInput, filePath, res);
});

app.options("/api/export-pdf", cors());
app.get("/api/export-pdf", (req, res) => {
  console.log("generate-pdf, your app is working well");
  const { fileName } = req.query;
  const filePath = path.join(__dirname, `${fileName}.pdf`);

  try {
    const stat = fs.statSync(filePath);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Type", "application/pdf");
    res.download(filePath, `${fileName}.pdf`);
  } catch (error) {
    console.error("Error exporting PDF:", error);
    res.status(404).json({ success: false, error: "PDF file not found" });
  }
});

function generatePDF(userInput, filePath, res) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));
  doc.text(userInput);
  doc.end();

  doc.on("finish", () => {
    console.log("Success: PDF generated");
    const fileUrl = `https://final-project-eta-ruby.vercel.app/api/export-pdf?fileName=${encodeURIComponent(
      path.basename(filePath)
    )}`;
    res.json({ success: true, fileUrl });
  });

  doc.on("error", (error) => {
    console.error("Error generating PDF:", error);
    res.status(500).json({ success: false, error: "PDF generation failed" });
  });
}

// -------------------------------------------------------------------------------------------------- Sign PDF
// function generateKeyPair() {
//   const keyPair = crypto.generateKeyPairSync("rsa", {
//     modulusLength: 2048,
//     publicKeyEncoding: {
//       type: "spki",
//       format: "pem",
//     },
//     privateKeyEncoding: {
//       type: "pkcs8",
//       format: "pem",
//     },
//   });

//   return keyPair;
// }

// function createDigitalSignature(privateKey, data) {
//   const sign = crypto.sign("sha256", Buffer.from(data), {
//     key: privateKey,
//     padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
//   });
//   return sign;
// }

// function verifyDigitalSignature(publicKey, data, signature) {
//   const verify = crypto.verify(
//     "sha256",
//     Buffer.from(data),
//     {
//       key: publicKey,
//       padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
//     },
//     signature
//   );

//   console.log("verifyDigitalSignature :", verify);
// }

// app.options("/api/sign-pdf", cors());
// app.post("/api/sign-pdf", (req, res) => {
//   try {
//     const { fileName, downloadLink, content } = req.body;
//     const filePath = path.join(__dirname, `${fileName}-sign.pdf`);
//     const { privateKey, publicKey } = generateKeyPair();

//     const signature = createDigitalSignature(privateKey, content);

//     verifyDigitalSignature(publicKey, content, signature);

//     generate(content, filePath, "Signature");
//     const fileUrl = `https://final-project-eta-ruby.vercel.app/api/export-sign-pdf?fileName=${encodeURIComponent(
//       fileName
//     )}`;
//     res.status(200).json({
//       success: true,
//       message: "Digital Signature created successfully",
//       fileUrl: fileUrl,
//     });
//     console.log("fileUrl :", fileUrl);
//   } catch (error) {
//     console.error("Error signing PDF:", error);
//     res
//       .status(500)
//       .json({ success: false, error: error.message || "Error signing PDF" });
//   }
// });

// app.options("/api/export-sign-pdf", cors());
// app.get("/api/export-sign-pdf", (req, res) => {
//   const { fileName } = req.query;
//   const filePath = path.join(__dirname, `${fileName}-sign.pdf`);

//   try {
//     const stat = fs.statSync(filePath);
//     res.setHeader("Content-Length", stat.size);
//     res.setHeader("Content-Type", "application/pdf");
//     res.download(filePath, `${fileName}.pdf`);
//     console.log("Export PDF URL:", req.originalUrl);
//   } catch (error) {
//     console.error("Error exporting PDF:", error);
//     res.status(404).json({ success: false, error: "PDF file not found" });
//   }
// });

// // --------------------------------------------------------------------------------------------------

// app.options("/api/reject-pdf", cors());
// app.post("/api/reject-pdf", (req, res) => {
//   const { fileName } = req.body;
//   const hasPermission = true;
//   if (hasPermission) {
//     res.status(200).json({
//       success: true,
//       message: `PDF '${fileName}' rejected successfully`,
//     });
//   } else {
//     res.status(403).json({
//       success: false,
//       error: `Cannot download ${fileName}`,
//     });
//   }
// });

// // -------------------------------------------------------------------------------------------------- OTP google authen

// app.options("/api/generate-otp-and-qrcode", cors());
// app.post("/api/generate-otp-and-qrcode", async (req, res) => {
//   try {
//     const secret = speakeasy.generateSecret({
//       name: "OTP Zero-Trust : project",
//     });
//     const otpauth_url = secret.otpauth_url;
//     const qrCodeDataURL = await QRCode.toDataURL(otpauth_url);

//     res.json({
//       secret: secret.base32,
//       otpauth_url,
//       qrcode: qrCodeDataURL,
//     });
//   } catch (error) {
//     console.error("Error generating QR code:", error);
//     res.status(500).json({ error: "Error generating QR code" });
//   }
// });

// app.options("/api/verify-otp", cors());
// app.post("/api/verify-otp", (req, res) => {
//   try {
//     const { otp, secret } = req.body;
//     const isValid = speakeasy.totp.verify({
//       secret,
//       encoding: "base32",
//       token: otp,
//       window: 2,
//     });

//     if (isValid) {
//       res.json({ message: "OTP is valid" });
//     } else {
//       res.status(401).json({ error: "Invalid OTP" });
//     }
//   } catch (error) {
//     console.error("Error verifying OTP:", error);
//     res.status(500).json({ error: "Error verifying OTP" });
//   }
// });

// // -------------------------------------------------------------------------------------------------- CMU
// app.options("/getToken/:code", cors());
// app.post('/getToken/:code', async (req, res) => {
//   try {
//       const codeFromURL = req.params.code;
//       const requestData = {
//           code: codeFromURL,
//           redirect_uri: 'https://final-project-eta-ruby.vercel.app/callback',
//           client_id: 'dBH4CNbDdruZ8qyD3qqubEYdVz5xvpnqsDe7yrQb',
//           client_secret: 'tYEyZQnjDzQ11j8JQDjdTQh0deHEkAfNKnaqaArf',
//           grant_type: 'authorization_code',
//       };

//       console.log("codeFromURL:",codeFromURL)

//       const headers = {
//           'Content-Type': 'application/x-www-form-urlencoded',
//       };

//       const response = await axios.post(
//           'https://oauth.cmu.ac.th/v1/GetToken.aspx',
//           querystring.stringify(requestData),
//           { headers }
//       );

//       console.log('Response:', response.data);
//       res.status(200).json(response.data);
//   } catch (error) {
//       console.error('Error:', error.message);
//       res.status(500).json({ message: 'Internal Server Error' });
//   }
// });

// // --------------------------------------------------------------------------------------------------

// // API endpoint for jwt key
// app.get("/api/get-secret-key", (req, res) => {
//   res.json({ secretKey: yourSecretKey });
// });

// const generatePDF = (userInput, filePath) => {
//   const doc = new PDFDocument();
//   doc.text(userInput);
//   doc.pipe(fs.createWriteStream(filePath));
//   doc.end();
// };

// const generate = (content, filePath, signature) => {
//   const doc = new PDFDocument();
//   doc.text(content);

//   const signatureOptions = {
//     width: 300,
//     height: 50,
//     align: "center",
//     valign: "middle",
//     opacity: 0.5,
//     color: "gray",
//   };

//   doc.text(`Digital Signature: ${signature}`, signatureOptions);

//   doc.pipe(fs.createWriteStream(filePath));
//   doc.end();
// };

app.options("/", cors());
app.get("/", (req, res) => {
  res.send("Welcome, your app is working well");
});

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.listen(port, () => {
  console.log(`Server is running on `);
});

// Export the Express API
module.exports = app;
