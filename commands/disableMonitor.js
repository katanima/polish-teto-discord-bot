import { SlashCommandBuilder } from '@discordjs/builders';
import { disableChannelFromNotificationList } from '../utils/productMonitor.js';
import { MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('wylacz-monitorowanie')
  .setDescription('Wyłącza monitorowanie fumosów na tym kanale.')

export async function execute(interaction) {
  const exitCode = await disableChannelFromNotificationList(
    interaction.guildId,
    interaction.channelId
  );

  const ping = `<@${interaction.user.id}>`;
  if (exitCode === "success") {
    await interaction.reply({
      content: `
        ${ping} cwaniak wyłączył monitorowanie fumosów na tym kanale.
        https://tenor.com/view/fat-guy-falling-off-chair-fast-chair-pissed-off-fast-nole-fast-falling-fast-gif-25168440`
    });
  } else if (exitCode === "failed") {
    await interaction.reply({ 
      content: 
      `Wygląda na to, że monitor jest już wyłączony na tym kanale.
      https://cdn.discordapp.com/attachments/1146490917142929449/1333553326037532683/tumblr_28e3a1dbc7af0368b94fe84ade053f5a_c35d1d14_400.webp?ex=68285a91&is=68270911&hm=0bdb647c22a10e080714e6b69fd1836572696b18a61c68cff2dcc3d7fd530fb9&`, 
      flags: MessageFlags.Ephemeral
    });
  } else {
    throw new Error("Nie prawidłowy exit code.")
  }
}