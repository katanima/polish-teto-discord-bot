import { SlashCommandBuilder } from '@discordjs/builders';
import { monitorProducts } from '../utils/productMonitor.js';
import { MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('monitor')
  .setDescription('Monitoruje dostępność produktów')
  /*
  .addStringOption(option => 
    option.setName('url')
      .setDescription('URL produktu do monitorowania')
      .setRequired(true));
  */

export async function execute(interaction) {
  /*
  const productUrl = interaction.options.getString('url');
  if (!productUrl.startsWith('http')) {
    return interaction.reply({ 
      content: 'Podaj prawidłowy URL produktu.', 
      ephemeral: true 
    });
  } */


  monitorProducts(
    interaction.guildId, 
    interaction.channelId
  );
  
  await interaction.reply({ 
    content: `Rozpoczynam monitorowanie produktów. Powiadomienia będą wysyłane na ten kanał.`, 
    flags: MessageFlags.Ephemeral
  });
}