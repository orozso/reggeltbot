/* eslint-disable quotes */
/* eslint-disable no-undef */
const Discord = require("discord.js");
const bot = new Discord.Client();
const DBL = require("dblapi.js");
let ms = require("ms");
let admin = require("firebase-admin");
const https = require('https');
const express = require('express');

const app = express();

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://zal1000.firebaseio.com"
});
let rdb = admin.database();

let dblRef = rdb.ref("bots/reggeltbot/dblToken");
dblRef.once("value", function(snapshot: { val: () => any; }) {
    new DBL(snapshot.val(), bot);
    console.debug(snapshot.val());
}, function (errorObject: { code: string; }) {
    console.log("The read failed: " + errorObject.code);
});

bot.on("ready", async() => {
    console.log(`${bot.user.username} has started`);
    const doc = admin.firestore().collection("bots").doc("reggeltbot-count-all");
    doc.onSnapshot((docSnapshot: { data: () => { (): any; new(): any; reggeltcount: any; }; }) => {
        bot.user.setActivity(`for ${docSnapshot.data().reggeltcount} morning message`, {type: "WATCHING"});
    }, (err: any) => {
        console.log(`Encountered error: ${err}`);
        bot.user.setActivity(`Encountered error: ${err}`, {type: "PLAYING"});
    });

});

bot.on("messageUpdate", async (_: any, newMsg: any) => {
    if(newMsg.author.bot) return;

    if(newMsg.channel.name === "reggelt"){
        if(!newMsg.content.toLowerCase().includes("reggelt")) {
            await reggeltUpdateEdit(newMsg);
            if(newMsg.deletable){
                newMsg.delete();
                newMsg.author.send("Ebben a formában nem modósíthadod az üzenetedet.");
            }
        }
    }
});

app.get('/ping', async (req: any, res: any) => {
    res.status(200).send({
        ping: bot.ws.ping,
    });
});

bot.ws.on('INTERACTION_CREATE', async (interaction: any) => {
    let prefix = (await getPrefix()).prefix; 
    const cmd = interaction.data.name;
    if(cmd === "count" || cmd === "ciunt") {
        let db = admin.firestore();
        let dcid = interaction.member.user.id;
        const cityRef = db.collection("dcusers").doc(dcid);
        const doc = await cityRef.get();
        if (!doc.exists) {
            interactionResponse(interaction, {
                type: 4,
                data: {
                    content: 'Error reading document!'
                }
            });
        } else {
            let upmbed = new Discord.MessageEmbed()
                .setTitle(`${interaction.member.user.username}`)
                .setColor("#FFCB5C")
                .addField("Ennyiszer köszöntél be a #reggelt csatornába", `${doc.data().reggeltcount} [(Megnyitás a weboldalon)](https://reggeltbot.com/count?i=${dcid})`)
                .setFooter(interaction.member.user.username)
                .setThumbnail(doc.data().pp)
                .setTimestamp(Date.now());
            console.log(upmbed);
    
            interactionResponse(interaction, {
                type: 4,
                data: {
                    embeds: [upmbed]
                }
            });
        }
    } else if(cmd === "help") {
        let upmbed = new Discord.MessageEmbed()
            .setTitle(interaction.member.user.username)
            .setColor("#FFCB2B")
            .addField(`${prefix}count`, `Megmondja, hogy hányszor köszöntél be a #reggelt csatornába (vagy [itt](https://reggeltbot.com/count?i=${interaction.member.user.id}) is megnézheted)`)
            .addField(`${prefix}invite`, "Bot meghívása")
            .addField("Reggelt csatorna beállítása", "Nevezz el egy csatornát **reggelt**-nek és kész")
            .addField("top.gg", "Ha bárkinek is kéne akkor itt van a bot [top.gg](https://top.gg/bot/749037285621628950) oldala")
            .addField("Probléma jelentése", "Ha bármi problémát észlelnél a bot használata közben akkor [itt](https://github.com/zal1000/reggeltbot/issues) tudod jelenteni")
            .addField('\u200B', '\u200B')
            .addField("Bot ping", `${bot.ws.ping}ms`)
            .addField("Uptime", `${ms(bot.uptime)}`)
            .setFooter(interaction.member.user.username)
            .setThumbnail(bot.user.avatarURL())
            .setTimestamp(Date.now());
        interactionResponse(interaction, {
            type: 4,
            data: {
                embeds: [upmbed]
            }
        });
    }
});

bot.on("message", async (message: any) => {
    if(message.author.bot) return;
    let prefix = (await getPrefix()).prefix; 
    let messageArray = message.content.split(" ");
    let cmd = messageArray[0];
    let args = messageArray.slice(1);
    // reggelt
    if(message.channel.name === (await getReggeltChannel(process.env.PROD)).channel) {
        const db = admin.firestore();

        if(message.content.toLowerCase().includes("reggelt")){
            const ref = db.collection('dcusers').doc(message.author.id);
            const doc = await ref.get();

            const cdref = db.collection('dcusers').doc(message.author.id).collection('cooldowns').doc(message.guild.id);
            const cddoc = await cdref.get();

            const configref = db.collection('bots').doc('reggeltbot').collection('config').doc('default');
            const configDoc = await configref.get();
            const cdval = configDoc.data().cd * 3600;
            const cd = Math.floor(Date.now() / 1000) + cdval;

            console.log(`Cooldown ends: ${cd}`);
            console.log(Math.floor(Date.now() / 1000));

            if(cddoc.exists) {
                console.log('');
                console.log(cddoc.data().reggeltcount);
                if(cddoc.data().reggeltcount > Math.floor(Date.now() / 1000)) {
                    message.delete();
                    message.author.send('You are on cooldown!');
                } else {
                    if(!process.env.PROD) {
                        await reggeltupdateall();
                        await reggeltupdatefs(message);
                    }
                    cdref.update({
                        reggeltcount: cd,
                    });
                    console.log(2);
                }

                console.log(1);
            } else {
                cdref.set({
                    reggeltcount: cd,
                });
                if(!process.env.PROD) {
                    await reggeltupdateall();
                    await reggeltupdatefs(message);
                }
                console.log('doc created');
            }



            if(doc.exists) {
                ref.update({
                    tag: message.author.tag,
                    username: message.author.username,
                    pp: message.author.avatarURL(),
                });
            } else {
                ref.set({
                    tag: message.author.tag,
                    username: message.author.username,
                    pp: message.author.avatarURL(),
                });
            }


            


            console.log(`message passed in: "${message.guild}, by.: ${message.author.username} (id: "${message.guild.id}")"(HUN)`);
            message.react("☕");     
        }
        else {
            if(!message.deletable) {
                message.channel.send('Missing permission!')
                    .catch((err: any) => {
                        message.guild.owner.send('Missing permission! I need **Send Messages** to function correctly');
                        console.log(err);
                    });
                message.guild.owner.send('Missing permission! I need **Manage Messages** to function correctly')
                    .catch(
                        
                    );
            } else {
                message.delete();
                message.author.send(`Ide csak reggelt lehet írni! (${message.guild})`)
                    .catch(function(error: string) {
                        message.reply("Error: " + error);
                        console.log("Error:", error);
                    });
    
            }
            await reggeltupdatefs(message, true);
        }
    }
    

    else if(cmd === `${prefix}link`) {
        if(!args[0]){
            message.reply("Please provide your email");
        } else if(!args[1]) {
            message.reply("Please provide your link code");
        } else {
            botTypeing(message.channel.id);
            const db = admin.firestore();
            admin
                .auth()
                .getUserByEmail(args[0])
                .then((userRecord: any) => {
                    accountLink(userRecord, db, message);
                })
                .catch((error: any) => {
                    console.log("Error fetching user data:", error);
                });
            
        }
    }
});


async function botTypeing(channel: any) {
    const data = JSON.stringify({});
    console.log((await getBotToken(process.env.PROD)).token);
      
    const options = {
        hostname: 'discord.com',
        port: 443,
        path: `/api/v8/channels/${channel}/typing`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'Authorization': `Bot ${(await getBotToken(process.env.PROD)).token}`,
            
        }
    };
      
    const req = https.request(options, (res: { statusCode: any; on: (arg0: string, arg1: (d: any) => void) => void; }) => {
        console.log(`statusCode: ${res.statusCode}`);
      
        res.on('data', (d: string | Buffer) => {
            process.stdout.write(d);
        });
    });
      
    req.on('error', (error: any) => {
        console.error(error);
    });
      
    req.write(data);
    req.end();
}
console.log(process.env.PROD);
const PROD = process.env.PROD;
botlogin(PROD);


async function accountLink(userRecord: { uid: any; }, db: { collection: (arg0: string) => { (): any; new(): any; doc: { (arg0: any): any; new(): any; }; }; }, message: { content: string; author: { id: any; }; reply: (arg0: string, arg1: undefined) => void; }) {
    let messageArray = message.content.split(" ");
    //let cmd = messageArray[0];
    let args: any = messageArray.slice(1);
    const userRef = db.collection("users").doc(userRecord.uid);
    const userDoc = await userRef.get();

    const dcUserRef = db.collection("dcusers").doc(message.author.id);
    // eslint-disable-next-line no-unused-vars
    //const dcUserDoc = await dcUserRef.get();

    if(userDoc.data().dclinked) {
        message.reply("This account is already linked!", args[1]);
    } else if(`${userDoc.data().dclink}` === args[1]) {
        dcUserRef.update({
            uid: message.author.id,
        });
        userRef.update({
            dclink: admin.firestore.FieldValue.delete(),
            dclinked: true,
            dcid: message.author.id,
        });
        message.reply("Account linked succesfuly!", undefined);
    } else {
        message.reply("Error linking account", undefined);
    }
}

async function botlogin(PROD: string | undefined) {
    const db = admin.firestore();
    const botRef = db.collection("bots").doc("reggeltbot");
    const doc = await botRef.get();
    if(PROD === "false") {
        bot.login(doc.data().testtoken);
    } else if(PROD === "beta") {
        bot.login(doc.data().betatoken);
    } else {
        bot.login(doc.data().token);
    }
}

async function interactionResponse(interaction: { id: any; token: any; }, data: { type: number; data: { content: string; } | { embeds: any[]; } | { embeds: any[]; }; }) {
    bot.api.interactions(interaction.id, interaction.token).callback.post({data: data});
}

app.listen(3000);