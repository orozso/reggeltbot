import { Message, MessageEmbed, User } from "discord.js";
import * as FireBaseAdmin from "firebase-admin";




export enum ReggeltResult {
    Ok,
    NotReggelt,
    Cooldown
}

export default class ReggeltService {

    constructor() {

    }

    async reggelt(message: Message): Promise<ReggeltResult> {

        const db = FireBaseAdmin.firestore();

        if (message.content.toLowerCase().includes("reggelt")) {
            const { configDoc, cooldownDoc, cooldownRef, userDoc, userRef } = await this.initDocs(db, message);

            const cooldownHours = configDoc.data()?.id || 6;
            const cooldownValue = cooldownHours * 3600;
            const cooldown = Math.floor(Date.now() / 1000) + cooldownValue;

            console.log(`Cooldown ends: ${cooldown}`);
            console.log(Math.floor(Date.now() / 1000));

            if (cooldownDoc.exists) {
                console.log(cooldownDoc.data()?.reggeltcount);
                if (cooldownDoc.data()?.reggeltcount > Math.floor(Date.now() / 1000)) {
                    return ReggeltResult.Cooldown;
                } else {
                    if (!process.env.PROD) {
                        await this.updateAllReggeltCount();
                        await this.createOrUpdateReggeltCount(message.author);
                    }
                    cooldownRef.update({
                        reggeltcount: cooldown,
                    });
                }
            } else {
                cooldownRef.set({
                    reggeltcount: cooldown,
                });
                if (!process.env.PROD) {
                    await this.updateAllReggeltCount();
                    await this.createOrUpdateReggeltCount(message.author);
                }
                console.log('doc created');
            }

            if (userDoc.exists) {
                userRef.update({
                    tag: message.author.tag,
                    username: message.author.username,
                    pp: message.author.avatarURL(),
                });
            } else {
                userRef.set({
                    tag: message.author.tag,
                    username: message.author.username,
                    pp: message.author.avatarURL(),
                });
            }

            console.log(`message passed in: "${message.guild}, by.: ${message.author.username} (id: "${message.guild?.id}")"(HUN)`);
            return ReggeltResult.Ok;
        }
        else {
            await this.createOrUpdateReggeltCount(message.author, true);
            return ReggeltResult.NotReggelt;
        }
    }

    private async initDocs(db: FirebaseFirestore.Firestore, message: Message) {
        const userRef = db.collection('dcusers').doc(message.author.id);
        const userDoc = await userRef.get();

        const guildId = (message.guild) ? message.guild.id : "notGuild";
        const cooldownRef = db.collection('dcusers').doc(message.author.id).collection('cooldowns').doc(guildId);
        const cooldownDoc = await cooldownRef.get();

        const configRef = db.collection('bots').doc('reggeltbot').collection('config').doc('default');
        const configDoc = await configRef.get();

        return { configDoc, cooldownDoc, cooldownRef, userDoc, userRef };
    }

    async getBotToken(PROD: string | undefined): Promise<string | null> {
        const db = FireBaseAdmin.firestore();
        const botRef = db.collection("bots").doc("reggeltbot");
        const doc = await botRef.get();

        if (PROD === "false") {
            return doc.data()?.testtoken;
        } else if (PROD === "beta") {
            return doc.data()?.betatoken;
        } else {
            return doc.data()?.token;
        }
    }

    async getReggeltChannel(PROD: string | undefined): Promise<string | null> {
        const db = FireBaseAdmin.firestore();
        const ref = db.collection('bots').doc('reggeltbot-channels');
        const doc = await ref.get();

        if (PROD === "false") {
            return doc.data()?.test;
        } else if (PROD === "beta") {
            return doc.data()?.beta;
        } else {
            return doc.data()?.main;
        }
    }

    async getPrefix(): Promise<string | null> {
        const db = FireBaseAdmin.firestore();
        const botRef = db.collection("bots").doc("reggeltbot");
        const doc = await botRef.get();
        const PROD = process.env.PROD;

        if (PROD === "false") {
            return doc.data()?.testprefix;
        } else if (PROD === "beta") {
            return doc.data()?.betaprefix;
        } else {
            return doc.data()?.prefix;
        }
    }

    async getReggeltCountByUser(user: User): Promise<number | null> {
        let db = FireBaseAdmin.firestore();
        const cityRef = db.collection("dcusers").doc(user.id);
        const doc = await cityRef.get();

        if (!doc.exists) {
            console.log("No such document!");
            return null;
        } else {
            return doc.data()?.reggeltcount;
        }
    }

    async updateAllReggeltCount() {
        let db = FireBaseAdmin.firestore();
        const botRef = db.collection("bots").doc("reggeltbot");
        const botDoc = await botRef.get();
        const incrementCount = botDoc.data()?.incrementCount;

        await db.collection("bots").doc("reggeltbot-count-all").update({
            reggeltcount: admin.firestore.FieldValue.increment(incrementCount)
        });
    }

    async createOrUpdateReggeltCount(user: User, decreased = false) {
        let db = FireBaseAdmin.firestore();
        const reggeltRef = db.collection("dcusers").doc(user.id);
        const doc = await reggeltRef.get();
        const botRef = db.collection("bots").doc("reggeltbot");
        const botDoc = await botRef.get();

        const decreaseCount = botDoc.data()?.decreaseCount;
        const incrementCount = botDoc.data()?.incrementCount;

        if (!doc.exists) {
            reggeltRef.set({
                reggeltcount: (decreased ? decreaseCount : incrementCount),
                tag: user.tag,
                username: user.username,
                pp: user.avatarURL(),
            });
        } else {
            reggeltRef.update({
                reggeltcount: FireBaseAdmin.firestore.FieldValue.increment(decreased ? decreaseCount : incrementCount),
                tag: user.tag,
                username: user.username,
                pp: user.avatarURL(),
            });
        }
    }

    async getOwnerId(): Promise<string> {
        const ref = admin.firestore().collection("bots").doc("reggeltbot");
        const doc = await ref.get();
        return doc.data().ownerid;
    }

    async updateUser(message: Message) {
        if (!message.guild) return;

        const ref = FireBaseAdmin.firestore().collection('dcusers').doc(message.author.id).collection('guilds').doc(message.guild.id);
        //const doc = await ref.get();
        const gme = message.guild.me;
        if (!gme) return;

        console.log(gme.permissions.toArray());
        ref.set({
            name: message.guild.name,
            owner: message.guild.ownerID,
            icon: message.guild.iconURL(),
            permissions: {
                ADMINISTRATOR: gme.hasPermission("ADMINISTRATOR"),
                MANAGE_CHANNELS: gme.hasPermission("MANAGE_CHANNELS"),
                MANAGE_GUILD: gme.hasPermission("MANAGE_GUILD"),
                MANAGE_MESSAGES: gme.hasPermission("MANAGE_MESSAGES"),
            },
            allpermissions: gme.permissions.toArray()
        }).then(() => {
            message.reply('Server added/updated succesfuly!');
        }).catch(() => {
            message.reply('Error adding the server, please try again later and open a new issue on Github(https://github.com/zal1000/reggeltbot/issues)');
        });
    }

    async reggeltUpdateEdit(user: User) {
        let db = FireBaseAdmin.firestore();
        const botRef = db.collection("bots").doc("reggeltbot");
        const botDoc = await botRef.get();
        const decreaseCount = botDoc.data()?.decreaseCount;

        await db.collection("bots").doc("reggeltbot-count-all").update({
            reggeltcount: admin.firestore.FieldValue.increment(decreaseCount)
        });

        await db.collection("dcusers").doc(user.id).update({
            reggeltcount: admin.firestore.FieldValue.increment(decreaseCount)
        });
    }

    async getRandomFactWithId(id: string, message: Message): Promise<MessageEmbed | null> {

        const db = FireBaseAdmin.firestore();

        const ref = db.collection("facts").doc(id);
        const doc = await ref.get();

        if (doc.exists && doc.data()) {
            return this.getRandomFactEmbed(doc.id, doc.data() as Fact, message);
        } else {
            return null;
        }
    }

    async getRandomFact(message: Message): Promise<MessageEmbed | null> {
        const db = FireBaseAdmin.firestore();

        var quotes = db.collection("facts");
        var key2 = quotes.doc().id;

        quotes.where(FireBaseAdmin.firestore.FieldPath.documentId(), '>=', key2).limit(1).get()
            .then((snapshot: { size: number; forEach: (arg0: (doc: any) => void) => void; }) => {
                if (snapshot.size > 0) {
                    snapshot.forEach((doc: { id: any; data: () => any; }) => {
                        return this.getRandomFactEmbed(doc.id, doc.data() as Fact, message);
                    });
                } else {
                    quotes.where(admin.firestore.FieldPath.documentId(), '<', key2).limit(1).get()
                        .then((snapshot: any[]) => {
                            snapshot.forEach((doc: { id: any; data: () => any; }) => {
                                return this.getRandomFactEmbed(doc.id, doc.data() as Fact, message);
                            });
                        })
                        .catch((err: any) => {
                            message.reply(`Error geting fact: **${err}**`);
                            console.log('Error getting documents', err);
                        });
                }
            })
            .catch((err: { message: any; }) => {
                console.log('Error getting documents', err);
                message.reply(`Error geting fact: **${err.message}**`);
            });
        return null;
    }



    async getRandomFactEmbed(factId: string, fact: Fact, message: Message) {
        const db = admin.firestore();

        const userRef = db.collection('users').doc(`${fact.owner}`);
        const userDoc = await userRef.get();

        if (!fact.owner) {
            let upmbed = new Discord.MessageEmbed()
                .setTitle(`Random fact`)
                .setColor("#FFCB5C")
                .addField("Fact", fact.fact)
                .setFooter(`This is a template fact`)
                .addField('\u200B', '\u200B')
                .addField("Add your fact", `You can add your fact [here](https://facts.zal1000.com/) (to display discord info, link your discord account [here](https://dclink.zal1000.com/))`)
                .setTimestamp(message.createdAt);

            return upmbed;

        } else if (!userDoc.data().dcid) {

            let upmbed = new Discord.MessageEmbed()
                .setTitle(`Random fact by.: ${fact.author}`)
                .setColor("#FFCB5C")
                .addField("Fact", fact.fact)
                .addField("Fact id", factId)
                .addField('\u200B', '\u200B')
                .addField("Add your fact", `You can add your fact [here](https://facts.zal1000.com/) (to display discord info, link your discord account [here](https://dclink.zal1000.com/))`)
                .setFooter(fact.author)
                .setTimestamp(message.createdAt);

            return upmbed;

        } else {
            const dcRef = db.collection('dcusers').doc(`${userDoc.data().dcid}`);
            const dcDoc = await dcRef.get();

            let upmbed = new Discord.MessageEmbed()
                .setTitle(`Random fact by.: ${dcDoc.data().username}`)
                .setColor("#FFCB5C")
                .addField("Fact", fact.fact)
                .addField("Fact id", factId)
                .addField('\u200B', '\u200B')
                .addField("Add your fact", `You can add your fact [here](https://facts.zal1000.com/) (to display discord info, link your discord account [here](https://dclink.zal1000.com/))`)
                .setFooter(dcDoc.data().tag)
                .setThumbnail(dcDoc.data().pp)
                .setTimestamp(message.createdAt);

            return upmbed;
        }

    }

}

interface Fact {
    owner: string;
    fact: string;
    author: string;
}