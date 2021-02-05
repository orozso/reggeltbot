import { Client, Message, TextChannel } from "discord.js";
import { messaging } from "firebase-admin";
import CommandManager from "./CommandManager";
import ReggeltService, { ReggeltResult } from "./ReggeltService";

export default class ReggeltBot {

    private commandManager: CommandManager = new CommandManager(this);

    constructor(private client: Client, private reggeltService: ReggeltService) {
        this.client.on("ready", this.clientReady);
        this.client.on("message", this.clientMessage);
        this.client.on("messageUpdate", this.clientMessageUpdate);

this.client.ws.on()

        this.initCommands();
    }

    initCommands() {
        this.commandManager.addCommand("count", "Megmondja, hogy hányszor köszöntél be a #reggelt csatornába", this.getUserCount);
        this.commandManager.addCommand("fact", "Véletlenszerüen kiválasztott érdekes tény", this.getRandomFact);
        this.commandManager.addCommand("restart", "Ujraindítás", this.restart, true);
        this.commandManager.addCommand("update", "", this.updateUser, true);

        this.commandManager.addHelpCommand();
    }

    async clientReady() {
        if (this.client.user != null)
            console.log(`${this.client.user.username} has started`);

    }

    async clientMessage(message: Message) {
        if (message.author.bot) return;

        if (message.channel instanceof TextChannel) {
            if (message.channel.name === await this.reggeltService.getReggeltChannel(process.env.PROD)) {
                let result = await this.reggeltService.reggelt(message);

                if (result == ReggeltResult.Ok) {
                    message.react("☕");
                }
                else if (result == ReggeltResult.NotReggelt) {
                    this.notReggel(message);
                }
                else if (result == ReggeltResult.Cooldown) {
                    message.delete();
                    message.author.send('You are on cooldown!');
                }
                return;
            }
        }

        let prefix = await this.reggeltService.getPrefix() || "r!";
        let messageArray = message.content.split(" ");
        let cmd = messageArray[0].substring(prefix.length);
        let args = messageArray.slice(1);

        this.commandManager.getCommandByName(cmd)?.execute(message, args);
    }

    private notReggel(message: Message) {
        if (!message.deletable) {
            message.channel.send('Missing permission!')
                .catch((err: any) => {
                    if (message.guild && message.guild.owner)
                        message.guild.owner.send('Missing permission! I need **Send Messages** to function correctly');
                    console.log(err);
                });
            if (message.guild && message.guild.owner)
                message.guild.owner.send('Missing permission! I need **Manage Messages** to function correctly');
        } else {
            message.delete();
            message.author.send(`Ide csak reggelt lehet írni! (${message.guild})`)
                .catch(function (error: string) {
                    message.reply("Error: " + error);
                    console.log("Error:", error);
                });
        }
    }

    async clientMessageUpdate(oldMessage: Message, newMessage: Message) {
        if (newMessage.author.bot) return;

        if ((newMessage.channel as TextChannel).name === "reggelt") {
            if (!newMessage.content.toLowerCase().includes("reggelt")) {
                await this.reggeltService.reggeltUpdateEdit(newMessage.author);

                if (newMessage.deletable) {
                    newMessage.delete();
                    newMessage.author.send("Ebben a formában nem modósíthadod az üzenetedet.");
                }
            }
        }
    }

    // ===== Commands ======

    async getUserCount(msg: Message, args: Array<string>) {
        let count = await this.reggeltService.getReggeltCountByUser(msg.author);
        if (count == null) {
            msg.reply("Error reading document!");
        }
        else {
            let embed = new Discord.MessageEmbed()
                .setTitle(`${msg.author.username}`)
                .setColor("#FFCB5C")
                .addField("Ennyiszer köszöntél be a #reggelt csatornába", `${count} [(Megnyitás a weboldalon)](https://reggeltbot.com/count?i=${msg.author.id})`)
                .setFooter(msg.author.username)
                .setThumbnail(msg.author.avatarURL())
                .setTimestamp(msg.createdAt);
            msg.channel.send(embed);
        }
    }

    async getRandomFact(msg: Message, args: Array<string>) {
        if(args.length == 1){
            let upmbed = await this.reggeltService.getRandomFactWithId(args[0], msg);
            if (!upmbed) msg.reply("Cannot find that fact!");
            else msg.channel.send(upmbed);
        }
        else {
            let upmbed = await this.reggeltService.getRandomFact(msg);
            if (!upmbed) msg.reply("Cannot find that fact!");
            else msg.channel.send(upmbed);
        }
    }

    async restart(msg: Message, args: Array<string>) {
        if(msg.author.id === await this.reggeltService.getOwnerId()) {
            msg.reply('Restarting container...').then(() => {
                this.client.destroy();
            }).then(() => {
                process.exit();
            });
        } else {
            msg.reply('Nope <3');
        }
    }

    async updateUser(msg: Message, args: Array<string>) {
        this.reggeltService.updateUser(msg);
    }
}