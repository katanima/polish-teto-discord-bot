import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v9"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const commands = []
const commandsPath = path.join(__dirname, "commands")
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"))

export async function loadCommands(client) {
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file)
    const fileURL = `file://${filePath}`

    try {
      const command = await import(fileURL)
      if (command.data) {
        commands.push(command.data.toJSON())
        client.commands.set(command.data.name, command)
        console.log(`Dodano komendę: ${command.data.name}`)
      }
    } catch (error) {
      console.error(`Błąd podczas ładowania komendy z pliku ${file}:`, error)
    }
  }

  const rest = new REST({ version: "9" }).setToken(process.env.DISCORD_TOKEN);
  (async () => {
    try {
      console.log("Rozpoczynam rejestrację komend aplikacji (/).")

      if (!process.env.CLIENT_ID) {
        throw new Error("Brak CLIENT_ID w zmiennych środowiskowych. Dodaj CLIENT_ID do pliku .env")
      }

      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID, process.env.TEST_SERVER_ID),
        { body: commands },
      )

      console.log("Pomyślnie zarejestrowano komendy aplikacji (/).")
    } catch (error) {
      console.error("Wystąpił błąd podczas rejestracji komend:", error)
    }
  })()
}
