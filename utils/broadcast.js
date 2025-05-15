import { appendFile, readFile, writeFile } from 'fs/promises';

export const broadcastMessages = async (notificationCode, client, message, productList = null) => {
    const content = await readFile(global.NOTIFICATION_FILE, "utf-8");
    const lines = content.split("\n");
  
    for (const line of lines) {
      const trimmed = line.trim();
      if(!trimmed) continue;
  
      const [notification, guildId, channelId] = trimmed.split(/\s+/);
      if(notification !== notificationCode) continue
  
      const guild = client.guilds.cache.get(guildId);
      const channel = guild.channels.cache.get(channelId);
  
      if (channel && channel.isTextBased()) {
        try {
          message(channel, productList);
        } catch (error) {
          console.error(`Nie można wysłać wiadomości do kanału ${channelId}: ${error.message}`);
        }
      }
    }
  }