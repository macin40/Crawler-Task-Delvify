const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const fs = require('fs');



const routes = require("./routes");
app.use(express.static('public'));
app.listen(4000, () => {
  console.log("scraping server is listening on port 4000");
});

app.use(bodyParser.json({ limit: "20mb", extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/", routes);
