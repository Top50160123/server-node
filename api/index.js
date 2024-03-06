const express = require("express");
const { PDFDocument } = require("pdf-lib");
const cors = require("cors");
const admin = require("firebase-admin");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const crypto = require("crypto");

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

// api CMU
app.post("/getToken/:code", async (req, res) => {
  try {
    const codeFromURL = req.params.code;

    console.log("codeFromURL:", codeFromURL);

    const requestData = {
      code: codeFromURL,
      redirect_uri: "https://final-project-eta-ruby.vercel.app/callback",
      client_id: "dBH4CNbDdruZ8qyD3qqubEYdVz5xvpnqsDe7yrQb",
      client_secret: "tYEyZQnjDzQ11j8JQDjdTQh0deHEkAfNKnaqaArf",
      grant_type: "authorization_code",
    };

    // const headers = {
    //   "Content-Type": "application/x-www-form-urlencoded",
    // };

    // const response = await axios.post(
    //   "https://oauth.cmu.ac.th/v1/GetToken.aspx",
    //   querystring.stringify(requestData),
    //   { headers }
    // );

    console.log("Response:", response.data);
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// app.post("/getToken/:code", async (req, res) => {
//   try {
//     const codeFromURL = req.params.code;
//     const requestData = {
//       code: codeFromURL,
//       redirect_uri: "https://final-project-eta-ruby.vercel.app/callback",
//       client_id: "dBH4CNbDdruZ8qyD3qqubEYdVz5xvpnqsDe7yrQb",
//       client_secret: "tYEyZQnjDzQ11j8JQDjdTQh0deHEkAfNKnaqaArf",
//       grant_type: "authorization_code",
//     };

//     console.log("codeFromURL:", codeFromURL);

//     const headers = {
//       "Content-Type": "application/x-www-form-urlencoded",
//     };

//     const response = await axios.post(
//       "https://oauth.cmu.ac.th/v1/GetToken.aspx",
//       querystring.stringify(requestData),
//       { headers }
//     );

//     console.log("Response:", response.data);
//     res.status(200).json(response.data);
//   } catch (error) {
//     console.error("Error:", error.message);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });

app.listen(5004, () => console.log("Server ready on port 3000."));

module.exports = app;
