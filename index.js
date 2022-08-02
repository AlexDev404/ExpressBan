const banList = require("./system/global.banlist.json");
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
  // console.log(client);

  // Check if IP is banned
  if (client.ip in banList === true) {
    if (banList[client.ip].global === true) {
      // IP is banned on a global scale
      res.sendStatus(403);
      return;
    }
  } else {
    // Bad JSON
    res.sendStatus(500);
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
  let slipShot = 0;
  config.supportedVersions.forEach((version) => {
    if (client.version === version) {
      // We're running a supported version of the launcher
      res.sendStatus(200);
      return;
    }
    slipShot++;
  });

  if (slipShot === config.supportedVersions.length) {
    // We need an update
    res.sendStatus(503);
    return;
  }
  // We have no errors
  res.sendStatus(200);
  return;
});
