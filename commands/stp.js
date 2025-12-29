const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { saveUserData, getUserData } = require("../data/userData");

const CHOICES = {
    schere: "✂️ Schere",
    stein: "🪨 Stein",
    papier: "📄 Papier"
};

function getWinner(choice1, choice2) {
    if (choice1 === choice2) return "draw";
    if (
        (choice1 === "schere" && choice2 === "papier") ||
        (choice1 === "papier" && choice2 === "stein") ||
        (choice1 === "stein" && choice2 === "schere")
    ) return "p1";
    return "p2";
}

module.exports = {
    name: ".stp",

    async run(message, args, updateUserRank) {
        const challenger = message.author;
        const target = message.mentions.users.first();
        const bet = parseInt(args[2]);

        if (!target || isNaN(bet) || bet <= 0) {
            return message.reply("❌ Usage: `.stp @User [Punkte]`");
        }

        if (target.bot) {
            return message.reply("❌ Bots können nicht spielen.");
        }

        const challengerData = getUserData(challenger.id);
        const targetData = getUserData(target.id);

        if (challengerData.points < bet) {
            return message.reply("❌ Du hast nicht genug Punkte.");
        }

        if (targetData.points < bet) {
            return message.reply("❌ Der Gegner hat nicht genug Punkte.");
        }

        const requestRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("stp_accept")
                .setLabel("✅ Annehmen")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("stp_decline")
                .setLabel("❌ Ablehnen")
                .setStyle(ButtonStyle.Danger)
        );

        const requestMsg = await message.channel.send({
            content:
                `🎮 **Schere, Stein, Papier**\n\n` +
                `${target}, möchtest du gegen **${challenger.username}** spielen?\n` +
                `💰 Einsatz: **${bet} Punkte**`,
            components: [requestRow]
        });

        const requestCollector = requestMsg.createMessageComponentCollector({
            time: 30000
        });

        requestCollector.on("collect", async interaction => {
            if (interaction.user.id !== target.id) {
                return interaction.reply({ content: "❌ Nicht dein Spiel.", ephemeral: true });
            }

            if (interaction.customId === "stp_decline") {
                requestCollector.stop();
                return interaction.update({
                    content: "❌ Spiel abgelehnt.",
                    components: []
                });
            }

            if (interaction.customId === "stp_accept") {
                requestCollector.stop();

                const choicesRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("stp_schere")
                        .setLabel("✂️ Schere")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("stp_stein")
                        .setLabel("🪨 Stein")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("stp_papier")
                        .setLabel("📄 Papier")
                        .setStyle(ButtonStyle.Primary)
                );

                await interaction.update({
                    content: "🎯 Beide Spieler wählen jetzt!",
                    components: [choicesRow]
                });

                const choices = {};
                const choiceCollector = requestMsg.createMessageComponentCollector({
                    time: 30000
                });

                choiceCollector.on("collect", async btn => {
                    if (![challenger.id, target.id].includes(btn.user.id)) {
                        return btn.reply({ content: "❌ Nicht dein Spiel.", ephemeral: true });
                    }

                    const choice = btn.customId.replace("stp_", "");
                    choices[btn.user.id] = choice;

                    await btn.reply({
                        content: `✅ Du hast **${CHOICES[choice]}** gewählt.`,
                        ephemeral: true
                    });

                    if (choices[challenger.id] && choices[target.id]) {
                        choiceCollector.stop();

                        const result = getWinner(
                            choices[challenger.id],
                            choices[target.id]
                        );

                        let resultText = `🎮 **Schere, Stein, Papier – Ergebnis**\n\n` +
                            `**${challenger.username}**: ${CHOICES[choices[challenger.id]]}\n` +
                            `**${target.username}**: ${CHOICES[choices[target.id]]}\n\n`;

                        if (result === "draw") {
                            resultText += "🤝 **Unentschieden!** Keine Punkte verloren.";
                        } else {
                            const winner = result === "p1" ? challenger : target;
                            const loser = result === "p1" ? target : challenger;

                            getUserData(winner.id).points += bet;
                            getUserData(loser.id).points -= bet;
                            saveUserData();

                            if (message.guild) {
                                const winnerMember = await message.guild.members.fetch(winner.id).catch(() => null);
                                const loserMember  = await message.guild.members.fetch(loser.id).catch(() => null);

                                if (winnerMember) await updateUserRank(winnerMember, getUserData(winner.id).points);
                                if (loserMember)  await updateUserRank(loserMember,  getUserData(loser.id).points);
                            }

                            resultText +=
                                `🏆 **${winner.username} gewinnt!**\n` +
                                `➕ ${bet} Punkte | ❌ ${loser.username} verliert ${bet} Punkte`;
                        }

                        await requestMsg.edit({
                            content: resultText,
                            components: []
                        });
                    }
                });
            }
        });
    }
};