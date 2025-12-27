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

    async run(message, args) {
        const userId = message.author.id;
        const data = getUserData(userId);

        const bet = parseInt(args[1]);
        if (isNaN(bet) || bet <= 0) {
            return message.reply("❌ Usage: `.coinflip [Einsatz]`");
        }

        if (data.points < bet) {
            return message.reply("❌ Nicht genug Punkte!");
        }

        // 🎰 XP berechnen
        const xp = calculateGamblingXP(bet, data.points);
        const leveledUp = addGamblingXP(data, xp);

        // Einsatz abziehen
        data.points -= bet;

        if (Math.random() < 0.5) {
            const win = bet * 2;
            data.points += win;

            await message.reply(
                `🪙 **Coinflip**\n🎉 **Gewonnen!** +${win} Punkt(e)\n💰 Neuer Stand: **${data.points}**`
            );
        } else {
            await message.reply(
                `🪙 **Coinflip**\n❌ **Verloren!** -${bet} Punkt(e)\n💰 Neuer Stand: **${data.points}**`
            );
        }

        if (leveledUp) {
            message.channel.send(
                `🧠 Gambling Addiction **Level ${data.gambling.level}** erreicht!`
            );
        }

        // Rang aktualisieren
        if (message.member) {
            // updateUserRank bleibt im index.js
            message.client.emit("updateRank", message.member, data.points);
        }

        saveUserData();
    }
};