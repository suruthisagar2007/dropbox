
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { Dropbox } = require("dropbox");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf" &&
            file.originalname.toLowerCase().endsWith(".pdf")) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed"));
        }
    }
});

const dbx = new Dropbox({
    accessToken: process.env.DROPBOX_ACCESS_TOKEN
});

app.get("/", (req, res) => {
    res.send("Dropbox PDF Storage Server is running");
});

// Upload PDF to Dropbox
app.post("/upload", upload.single("pdf"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Select a PDF file" });
        }

        const filename = req.file.originalname.replace(/[\\/]/g, "_");

        const result = await dbx.filesUpload({
            path: "/" + filename,
            contents: req.file.buffer,
            mode: { ".tag": "overwrite" }
        });

        res.json({
            message: "PDF uploaded successfully",
            name: result.result.name,
            path: result.result.path_display
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// List files in the Dropbox app folder
app.get("/files", async (req, res) => {
    try {
        const result = await dbx.filesListFolder({ path: "" });

        res.json(result.result.entries.map(file => ({
            name: file.name,
            path: file.path_lower,
            type: file[".tag"]
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Download a PDF from Dropbox
app.get("/download", async (req, res) => {
    try {
        const filePath = req.query.path;

        if (!filePath || !filePath.startsWith("/")) {
            return res.status(400).send("Valid Dropbox file path required");
        }

        const result = await dbx.filesDownload({ path: filePath });
        const file = result.result;

        const content = Buffer.isBuffer(file.fileBinary)
            ? file.fileBinary
            : Buffer.from(file.fileBinary);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${file.name.replace(/["\\]/g, "_")}"`
        );

        res.send(content);
    } catch (error) {
        console.error(error);
        res.status(500).send("Download failed: " + error.message);
    }
});

app.use((error, req, res, next) => {
    res.status(400).json({ error: error.message });
});

app.listen(5000, () => {
    console.log("Dropbox PDF Storage Server running on port 5000");
});
