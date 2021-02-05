import { Message, MessageEmbed } from "discord.js";
import ReggeltBot from "./ReggeltBot";
import { Command, ExecuteBlock } from "./Command";


export default class CommandManager {
    commands: Array<Command> = [];

    constructor(private bot: ReggeltBot) {
    }

    addCommand(name: string, description: string, execute: ExecuteBlock, hiddenInHelp: boolean = false): void {
        this.commands.push({ name: name, description: description, hiddenInHelp: hiddenInHelp, execute: execute });
    }

    getCommandByName(cmd: string): Command | undefined {
        return this.commands.find(command => command.name === cmd);
    }

    addHelpCommand(): void {
        this.commands.push(
            {
                name: "help",
                description: "Segítség",
                execute: (m, args) => {
                    let embed = this.createHelpEmbet(m);
                    m.channel.send(embed);
                }
            }
        );
    }

    createHelpEmbet(message: Message): MessageEmbed {
        let embed = new MessageEmbed()
            .setTitle("Segítség")
            .setColor("#FFCB2B");

        let prefix = this.bot || "";

        for (let cmd of this.commands) {
            embed.addField(`${prefix}${cmd.name}`, cmd.description);
        }

        embed.addField("Reggelt csatorna beállítása", "Nevezz el egy csatornát **reggelt**-nek és kész")
            .addField("top.gg", "Ha bárkinek is kéne akkor itt van a bot [top.gg](https://top.gg/bot/749037285621628950) oldala")
            .addField("Probléma jelentése", "Ha bármi problémát észlelnél a bot használata közben akkor [itt](https://github.com/zal1000/reggeltbot/issues) tudod jelenteni")
            .addField('\u200B', '\u200B')
            //.addField("Bot ping", `${this.bot.ping}ms`)
            //.addField("Uptime", `${ms(this.bot.uptime)}`)
            .setFooter(message.author.username)
            .setThumbnail(bot.user.avatarURL())
            .setTimestamp(message.createdAt);

        return embed;
    }
}
