import { appendFile, readFile, writeFile } from 'fs/promises';

export const broadcastMessages = async (notificationCode, client, message, productList = null) => {
  try {
    const content = await readFile(global.NOTIFICATION_FILE, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const [notification, guildId, channelId] = trimmed.split(/\s+/);
      if (notification !== notificationCode) continue;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        console.warn(`Nie znaleziono gildii o ID ${guildId}`);
        continue;
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        console.warn(`Nie znaleziono kanału ${channelId} w gildii ${guildId}`);
        continue;
      }

      if (channel.isTextBased()) {
        try {
          await message(channel, productList);
        } catch (error) {
          console.error(`Nie można wysłać wiadomości do kanału ${channelId}: ${error.message}`);
        }
      }
    }
  } catch (err) {
    console.error("Błąd podczas odczytu pliku z notyfikacjami:", err.message);
  }
};
