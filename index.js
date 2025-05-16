import dotenv from "dotenv"
import { Client, GatewayIntentBits, Collection, Events } from "discord.js"
import path from "path"
import { fileURLToPath } from "url"
import { initProductMonitor } from "./utils/productMonitor.js"
import { initWordOfTheDayService } from "./utils/wordOfTheDayService.js"
import { loadCommands } from "./loadCommands.js"
import { loadEvents } from "./loadEvents.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

global.NOTIFICATION_FILE = './notifications.json';
global.NOTIFICATION_CODE = {
  AMIAMI_NEW_FUMOS: "0",
  TETO_WORD_OF_THE_DAY: "1"
};

dotenv.config()

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
})

client.commands = new Collection()

process.on("unhandledRejection", (error) => {
  console.error("Nieobsłużone odrzucenie obietnicy:", error)
})

process.on("uncaughtException", (error) => {
  console.error("Nieobsłużony wyjątek:", error)
})

async function initBot() {
  try {
    await loadCommands(client)
    await loadEvents(client)

    await client.login(process.env.DISCORD_TOKEN)
    //await client.user.setUsername("Katarzyna Tetrzyńska");
    await initProductMonitor(client)
    await initWordOfTheDayService(client)

    console.log("Bot został pomyślnie zainicjalizowany")
  } catch (error) {
    console.error("Błąd podczas inicjalizacji bota:", error)
  }
}

initBot()
