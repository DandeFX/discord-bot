const {
    calculateGamblingXP,
    addGamblingXP
} = require("../utils/gambling");

const { saveUserData } = require("../data/userData");

module.exports = {
    name: ".roulette",

    async run(message, args, data, updateUserRank) {
        if (!args[1] || !args[2]) {
            return message.reply("❌ Usage: .roulette [Einsatz] [Zahl/rot/schwarz/grün]");
        }

        const bet = parseInt(args[1]);
        const choice = args[2].toLowerCase();

        if (isNaN(bet) || bet <= 0) {
            return message.reply("❌ Ungültiger Einsatz!");
        }

        if (data.points < bet) {
            return message.reply("❌ Du hast nicht genug Punkt(e)!");
        }

        const numbers = Array.from({ length: 37 }, (_, i) => i);
        const colors = {
            rot: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36],
            schwarz: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35],
            grün: [0]
        };

        const result = numbers[Math.floor(Math.random() * numbers.length)];

        let win = false;
        let multiplier = 0;

        if (choice === "rot" || choice === "schwarz") {
            if (colors[choice].includes(result)) {
                win = true;
                multiplier = 2;
            }
        } else if (choice === "grün") {
            if (result === 0) {
                win = true;
                multiplier = 35;
            }
        } else {
            const chosenNumber = parseInt(choice);
            if (!isNaN(chosenNumber) && chosenNumber >= 0 && chosenNumber <= 36) {
                if (chosenNumber === result) {
                    win = true;
                    multiplier = 35;
                }
            } else {
                return message.reply("❌ Ungültige Zahl! 0–36 oder rot/schwarz/grün.");
            }
        }

        data.points -= bet;

        let wonPoints = 0;
        if (win) {
            wonPoints = bet * multiplier;
            data.points += wonPoints;
        }

        const xp = calculateGamblingXP(bet, data.points);
        const leveledUp = addGamblingXP(data, xp);

        if (leveledUp) {
            message.channel.send(
                `🧠 Gambling Addiction **Level ${data.gambling.level}** erreicht!`
            );
        }

        if (message.member && updateUserRank) {
            await updateUserRank(message.member, data.points);
        }

        await message.reply(
            `🎲 **Roulette Ergebnis:** ${result}\n` +
            (win
                ? `🎉 **Gewonnen:** +${wonPoints} Punkt(e)`
                : `❌ **Verloren:** -${bet} Punkt(e)`) +
            `\n💰 Kontostand: **${data.points} Punkt(e)**`
        );

        saveUserData();
    }
};