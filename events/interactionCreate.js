export const name = "interactionCreate"
export const once = false

export async function execute(client, interaction) {
  /*
  if (interaction.isButton()) {
    if (interaction.customId === "guziol") {
      try {
        await interaction.reply("kurwaaaa")
        await interaction.followUp({
          content: "niewidzialne kurwaa",
          ephemeral: true,
        })
      } catch (error) {
        console.error("Błąd podczas odpowiadania na interakcję przycisku:", error)
      }
    }
    return
  }*/

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName)

    if (!command) {
      console.error(`Nie znaleziono komendy ${interaction.commandName}`)
      return
    }

    try {
      await command.execute(interaction)
    } catch (error) {
      console.error(`Błąd podczas wykonywania komendy ${interaction.commandName}:`, error)

      const replyOptions = {
        content: "Wystąpił błąd podczas wykonywania tej komendy!",
        ephemeral: true,
      }

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions)
      } else {
        await interaction.reply(replyOptions)
      }
    }
  }
}
