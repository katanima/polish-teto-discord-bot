import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v9"
import { readdirSync, constants } from "fs"
import { readFile, access } from 'fs/promises'

import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const commands = []
const commandsPath = path.join(__dirname, "commands")
const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith(".js"))

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
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      )

      const priorityGuildsFilePath = "./priorityGuilds.json";
      try {
        await access(priorityGuildsFilePath, constants.F_OK);
        const file = await readFile(priorityGuildsFilePath, 'utf-8');
        const priorityGuilds = file.split('\n').map(l => l.trim());

        if (priorityGuilds.filter(Boolean).length > 0) {
          for (let guild of priorityGuilds) {
            await rest.put(
              Routes.applicationGuildCommands(process.env.CLIENT_ID, guild),
              { body: commands },
            )
          }
        }
      } catch {}

      console.log("Pomyślnie zarejestrowano komendy aplikacji (/).")
    } catch (error) {
      console.error("Wystąpił błąd podczas rejestracji komend:", error)
    }
  })()
}
