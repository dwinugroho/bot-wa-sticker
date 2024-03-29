const { create, decryptMedia } = require("@open-wa/wa-automate");
const fs = require("fs-extra");
const moment = require("moment");
const mime = require("mime-types");

const msg = require("./api/messages");

const serverOption = {
  headless: true,
  qrTimeout: 40,
  authTimeout: 40,
  autoRefresh: true,
  qrRefreshS: 15,
  devtools: false,
  chromiumArgs: ["--no-sandbox", "--disable-setuid-sandbox"],
};

const opsys = process.platform;
if (opsys == "win32" || opsys == "win64") {
  serverOption["executablePath"] =
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
} else if (opsys == "linux") {
  serverOption["browserRevision"] = "737027";
} else if (opsys == "darwin") {
  serverOption["executablePath"] =
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
}

const startServer = async (from) => {
  create("Imperial", serverOption)
    .then((client) => {
      console.log("[SERVER] Server Started!");

      // Force it to keep the current session
      client.onStateChanged((state) => {
        console.log("[stateChanged]", state);
        if (state === "CONFLICT") client.forceRefocus();
      });

      client.onMessage((message) => {
        msgHandler(client, message);
      });
    })
    .catch(() => {
      console.log("ERROR");
    });
};

async function msgHandler(client, message) {
  // console.log(client);
  try {
    // console.log(message)
    const {
      type,
      body,
      from,
      t,
      sender,
      isGroupMsg,
      chat,
      caption,
      isMedia,
      mimetype,
      quotedMsg,
    } = message;
    const { id, pushname } = sender;
    const { name } = chat;
    const time = moment(t * 1000).format("DD/MM HH:mm:ss");
    const commands = [
      "#help",
      "#sticker",
      "#stiker",
      "#halo",
      "#hello",
      "#mentionall",
      // "#kick",
    ];
    const cmds = commands.map((x) => x + "\\b").join("|");
    const cmd =
      type === "chat"
        ? body.match(new RegExp(cmds, "gi"))
        : type === "image" && caption
        ? caption.match(new RegExp(cmds, "gi"))
        : "";

    if (cmd) {
      if (!isGroupMsg)
        console.log(
          "[EXEC]",
          color(time, "yellow"),
          color(cmd[0]),
          "from",
          color(pushname)
        );
      if (isGroupMsg)
        console.log(
          "[EXEC]",
          color(time, "yellow"),
          color(cmd[0]),
          "from",
          color(pushname),
          "in",
          color(name)
        );
      const args = body.trim().split(" ");
      switch (cmd[0].toLowerCase()) {
        case "#help":
          await client.reply(from, msg.greeting, message.id);
          break;
        case "#sticker":
        case "#stiker":
          if (isMedia) {
            const mediaData = await decryptMedia(message);
            const imageBase64 = `data:${mimetype};base64,${mediaData.toString(
              "base64"
            )}`;
            await client.sendImageAsSticker(from, imageBase64);
          } else if (quotedMsg && quotedMsg.type == "image") {
            const mediaData = await decryptMedia(quotedMsg);
            const imageBase64 = `data:${
              quotedMsg.mimetype
            };base64,${mediaData.toString("base64")}`;
            await client.sendImageAsSticker(from, imageBase64);
          } else {
            client.reply(
              from,
              "Kirim gambar pake hashtag #sticker GOBLOK !",
              message.id
            );
          }
          break;
        case "#hello":
        case "#halo":
          client.reply(from, `Hi ${pushname}`, message.id);
          break;

        case "#mentionall":
          let member = await client.getGroupMembers(from);
          let number = [];
          member.map((data) => {
            number.push("@" + data.id.slice(0, -5));
          });
          client.sendTextWithMentions(from, number.join("\n"));
          break;

        // case "#kick":
        //   const admin = await client.getGroupAdmins(from);
        //   const chatMessage = body.split(" ");
        //   const index = chatMessage.indexOf("#kick");
        //   let participantId = chatMessage[index + 1];

        //   // const allMembers = await client.getGroupMembers(from);

        //   if (participantId) {
        //     participantId = participantId.replace(/@/g, "");
        //     if (admin.includes(id)) {
        //       // console.log({ from, participantId });
        //       client.removeParticipant(from, `${participantId}@c.us`);
        //     }
        //   }

        //   // let admin = await client.getGroupAdmins(from);
        //   // const participantId = body.split(" ")[1].slice(1);
        //   // console.log(`${participantId}@c.us`)
        //   // console.log({ from, participantId });
        //   // if (admin.includes(id)) {
        //   //   console.log({ from, participantId });
        //   //   // client.removeParticipant(from, `${participantId}@c.us`);
        //   // }
        //   break;
      }
    } else {
      if (!isGroupMsg)
        console.log(
          color("[RECV]"),
          color(time, "yellow"),
          "Message from",
          color(pushname)
        );
      if (isGroupMsg)
        console.log(
          color("[RECV]"),
          color(time, "yellow"),
          "Message from",
          color(pushname),
          "in",
          color(name)
        );
    }
  } catch (err) {
    console.log(color("[ERROR]", "red"), err);
  }
}

function color(text, color) {
  switch (color) {
    case "red":
      return "\x1b[31m" + text + "\x1b[0m";
    case "yellow":
      return "\x1b[33m" + text + "\x1b[0m";
    default:
      return "\x1b[32m" + text + "\x1b[0m"; // default is green
  }
}

startServer();
