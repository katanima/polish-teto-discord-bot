import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const name = 'messageCreate';
export const once = false; // Zdarzenie uruchamiane za każdym razem

export async function execute(client, message) {
  if (message.author.bot) return;
  
  try {
    // Tworzenie przycisku
    const button = new ButtonBuilder()
      .setCustomId('guziol')
      .setLabel('XD')
      .setStyle(ButtonStyle.Primary);
    
    // Tworzenie rzędu akcji i dodanie przycisku
    const row = new ActionRowBuilder()
      .addComponents(button);
    
      /*
    await message.author.send({
      content: 'Guziolole',
      components: [row.toJSON()]
    }); */
  } catch (error) {
    console.error('Błąd podczas wysyłania wiadomości:', error);
  }
}