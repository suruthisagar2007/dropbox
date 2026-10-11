const express = require("express");
const cors = require("cors");
const { Dropbox } = require("dropbox");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const dbx = new Dropbox({
  accessToken: process.env.DROPBOX_ACCESS_TOKEN
});

app.get("/", (req, res) => {
  res.json({ message: "Dropbox API server is running" });
});

app.post("/upload", async (req, res) => {
  try {
    const { filename, content } = req.body;

    if (!filename || content === undefined) {
      return res.status(400).json({ error: "Filename and content required" });
    }

    const result = await dbx.filesUpload({
      path: "/" + filename.replace(/^\/+/, ""),
      contents: Buffer.from(content, "utf8"),
      mode: { ".tag": "overwrite" }
    });

    res.json({ message: "Upload successful", name: result.result.name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/files", async (req, res) => {
  try {
    const result = await dbx.filesListFolder({ path: "" });
    res.json(result.result.entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => {
  console.log("Dropbox API server running on port 5000");
});