const {
    calculateGamblingXP,
    addGamblingXP
} = require("../utils/gambling");

const {
    saveUserData,
    getUserData
} = require("../data/userData");

module.exports = {
    name: ".coinflip",

    async run(message, args, updateUserRank) {
        const userId = message.author.id;
        const data = getUserData(userId);

        const bet = parseInt(args[1]);
        if (isNaN(bet) || bet <= 0) {
            return message.reply("❌ Usage: `.coinflip [Einsatz]`");
        }

        if (data.points < bet) {
            return message.reply("❌ Nicht genug Punkte!");
        }

        const xp = calculateGamblingXP(bet, data.points);
        const leveledUp = addGamblingXP(data, xp);

        data.points -= bet;

        let resultText;

        if (Math.random() < 0.5) {
            const win = bet * 2;
            data.points += win;
            resultText = `🎉 **Gewonnen!** +${win} Punkt(e)`;
        } else {
            resultText = `❌ **Verloren!** -${bet} Punkt(e)`;
        }

        await message.reply(
            `🪙 **Coinflip**\n${resultText}\n💰 Neuer Stand: **${data.points}**`
        );

        if (leveledUp) {
            message.channel.send(
                `🧠 Gambling Addiction **Level ${data.gambling.level}** erreicht!`
            );
        }

        // ✅ RANK UPDATE (KORREKT)
        if (message.member) {
            await updateUserRank(message.member, data.points);
        }

        saveUserData();
    }
};