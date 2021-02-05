import { Message } from "discord.js";

export type ExecuteBlock = (message: Message, args: Array<string>) => void;

export interface Command {
    name: string;
    description: string;
    hiddenInHelp?: boolean;
    execute: ExecuteBlock;
}