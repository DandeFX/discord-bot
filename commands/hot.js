const {
    calculateGamblingXP,
    addGamblingXP
} = require("../utils/gambling");

const { saveUserData } = require("../data/userData");

module.exports = {
    name: ".hot",

    async run(message, args, data, updateUserRank) {
        const bet = parseInt(args[1]);
        const choice = args[2]?.toLowerCase();

        if (isNaN(bet) || bet <= 0) {
            return message.reply("❌ Usage: `.hot [Einsatz] [heads/tails]`");
        }

        if (!choice || (choice !== "heads" && choice !== "tails")) {
            return message.reply("❌ Bitte wähle **heads** oder **tails**.");
        }

        if (data.points < bet) {
            return message.reply("❌ Du hast nicht genug Punkt(e)!");
        }

        data.points -= bet;

        const xp = calculateGamblingXP(bet, data.points);
        const leveledUp = addGamblingXP(data, xp);

        const result = Math.random() < 0.5 ? "heads" : "tails";

        if (choice === result) {
            const win = bet * 2;
            data.points += win;

            await message.reply(
                `🪙 **Heads or Tails**\n` +
                `Deine Wahl: **${choice}**\n` +
                `Ergebnis: **${result}**\n\n` +
                `🎉 **Gewonnen!** +${win} Punkt(e)\n` +
                `💰 Neuer Stand: **${data.points} Punkt(e)**`
            );
        } else {
            await message.reply(
                `🪙 **Heads or Tails**\n` +
                `Deine Wahl: **${choice}**\n` +
                `Ergebnis: **${result}**\n\n` +
                `❌ **Verloren!** -${bet} Punkt(e)\n` +
                `💰 Neuer Stand: **${data.points} Punkt(e)**`
            );
        }

        if (leveledUp) {
            message.channel.send(
                `🧠 Gambling Addiction **Level ${data.gambling.level}** erreicht!`
            );
        }

        if (message.member && updateUserRank) {
            await updateUserRank(message.member, data.points);
        }

        saveUserData();
    }
};