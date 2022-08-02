let banList = require("./system/global.banlist.json");
let accesslog = require("./system/system.accesslog.json");
const fs = require("fs");
const path = require("path");
const config = require("./system/global.config.json");
const { arraysEqual, deepEquals } = require("./system/support/util");
const express = require("express");
const app = express();
const port = config.port;

// Let's start parsing the incoming body as JSON
// We'll use the middleware ExpressJSON, which is based upon BodyParser

app.use(express.json());

// We listen on a port for requests

app.listen(port, () => {
  console.log(
    "ExpressBan Server - (c) 2022 The Blaze Authors\n",
    `ExpressBan has started listening on port ${port}`
  );
});

// Base Plate

app.get("/", (req, res) => {
  res.send("ExpressBan Server\n");
});

// We now have a path for banning people on

app.post("/launcher/echo", (req, res, next) => {
  const client = req.body;
  // If we dont get what we want we ban
  if (client.ip === undefined) {
    res.sendStatus(403);
    return;
  }
  // Write to accesslog
  accesslog[accesslog.length] = client;
  fs.writeFile(
    path.join(__dirname, "system/system.accesslog.json"),
    JSON.stringify(accesslog, false, 3),
    "utf8",
    (err) => {
      if (err) console.log(err);
    }
  );
  // console.log(client);
  // console.log(client);
  // Check if IP is banned
  if (client.ip in banList === true) {
    if (banList[client.ip].global === true) {
      // IP is banned on a global scale
      res.sendStatus(403);
      return;
    }
  } else {
    // Upload to server
    banList[client.ip] = {
      global: false,
      nodes: [],
    };
    let jsonBanList = JSON.stringify(banList, false, 3);
    fs.writeFileSync(
      path.join(__dirname, "system/global.banlist.json"),
      jsonBanList,
      "utf8"
    );
    res.sendStatus(200);
    return;
  }

  // Check if MAC Address is banned and compare installList as well
  try {
    banList[client.ip].nodes.forEach((node) => {
      // Check MAC - 403 if banned
      try {
        if (client.mac === node.mac) {
          res.sendStatus(403);
          return;
        }
      } catch (error) {
        res.sendStatus(500);
        return;
      }
      // Check InstallList - 403 if banned
      try {
        if (deepEquals(client.installs, node.installList)) {
          res.sendStatus(403);
          return;
        }
      } catch (error) {
        // Bad JSON
        res.sendStatus(500);
        return;
      }
      try {
        if (client.discord === node.discord) {
          // If we can test the Discord, lets do it.
          // If it matches we ban the dude.
          res.sendStatus(403);
          return;
        }
      } catch (error) {
        // Bad JSON
        res.sendStatus(500);
        return;
      }
    });
  } catch (e) {
    // Bad JSON or actual error
    res.sendStatus(500);
    return;
  }

  // check client version against suppported versions
  let slipShot = false;
  config.supportedVersions.forEach((version) => {
    if (client.version === version) {
      // We're running a supported version of the launcher
      slipShot = false;
    } else {
      slipShot = true;
    }
  });

  if (slipShot) {
    // We need an update
    res.sendStatus(503);
    return;
  } else {
    // We don't need an update
    res.sendStatus(200);
    return;
  }
  // We have no errors
  try {
    res.sendStatus(200);
  } catch (error) {
    return;
  }

  return;
});
