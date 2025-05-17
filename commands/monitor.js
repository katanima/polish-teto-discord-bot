import { SlashCommandBuilder } from '@discordjs/builders';
import { addChannelToNotificationList } from '../utils/productMonitor.js';
import { MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('monitoruj')
  .setDescription('Monitoruje dostępność fumosów na tym kanale.')
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

  const exitCode = await addChannelToNotificationList(
    interaction.guildId, 
    interaction.channelId
  );

  const ping = `<@${interaction.user.id}>`;
  if(exitCode === "success") {
    await interaction.reply({ 
      content: 
      `Ayyy ${ping} aktywował monitorowanie fumosów. Powiadomienia będą wysyłane na ten kanał JFS
      https://tenor.com/view/suwako-moriya-suwako-moriya-touhou-touhou-project-gif-6911405824567521378`
    });
  } else if (exitCode === "failed") {
    await interaction.reply({ 
      content: 
      `Wydaje mi się, że ten kanał otrzymuje już powiadomienia z fumosami.
      https://cdn.discordapp.com/attachments/1146490917142929449/1333553326037532683/tumblr_28e3a1dbc7af0368b94fe84ade053f5a_c35d1d14_400.webp?ex=68285a91&is=68270911&hm=0bdb647c22a10e080714e6b69fd1836572696b18a61c68cff2dcc3d7fd530fb9&`, 
      flags: MessageFlags.Ephemeral
    });
  } else {
    await interaction.reply({ 
      content: 
      `Pierdole. Nic nie można w tym kraju. Nawet ustawić monitora fumosów.`,
      flags: MessageFlags.Ephemeral
    });
  }
}