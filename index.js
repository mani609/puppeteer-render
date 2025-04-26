const express = require("express");
const { scrapeLogic } = require("./scrapeLogic");
const { scrapeRecipes } = require("./scrapeRecipes");

const app = express();

const PORT = process.env.PORT || 4000;

app.get("/test", (req, res) => {
  scrapeLogic(res);
});

app.get("/scrape", (req, res) => {
  scrapeRecipes(res);
});

app.get("/", (req, res) => {
  res.send("Render Puppeteer server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
