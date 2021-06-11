const express = require("express");
const exphbs = require("express-handlebars");
const methodOverride = require("method-override");
const launchChrome = require("./../launchChrome");
const app = express();
const path = require("path");
const port = 3000;

app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

app.use(methodOverride("_method"));
app.use(express.urlencoded());
app.use(express.json());

app.engine(
  "hbs",
  exphbs.create({
    extname: ".hbs",
    helpers: {
      raw: function (options) {
        return options.fn();
      },
    },
  }).engine
);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  res.render("home");
});

app.post("/process", async (req, res) => {
  const comicLink = req.body.comicLink;
  const selectorImage = req.body.selectorImage || ".comicDetail2 img";
  const selectorListChapter =
    req.body.selectorListChapter || "select.list-chapter:first-child";
  const comicName = req.body.comicName;
  if (!comicLink || !comicName) {
    res.json({
      error: "Params is invalid!",
      body: req.body,
    });
  }

  const result = await launchChrome.process(
    comicLink,
    comicName,
    selectorImage,
    selectorListChapter
  );
  if (!result) {
    res.json({
      error: "Cannot find element",
    });
  }

  res.json({
    message: "Process successfully!",
  });
});

app.get("/success", (req, res) => {
  res.render("success");
});

app.listen(process.env.PORT || port, () =>
  console.log(`Application listen on port: ${port}`)
);
