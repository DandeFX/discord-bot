const {
    calculateGamblingXP,
    addGamblingXP
} = require("../utils/gambling");

const { saveUserData } = require("../data/userData");

module.exports = {
    name: ".crash",

    async run(message, args, data, context) {
        const {
            activeCrashGameRef,
            updateUserRank
        } = context;

        if (activeCrashGameRef.game) {
            return message.reply("❌ Es läuft bereits ein Crash-Spiel.");
        }

        const bet = parseInt(args[1]);
        if (isNaN(bet) || bet <= 0) {
            return message.reply("❌ .crash [Einsatz]");
        }

        if (data.points < bet) {
            return message.reply("❌ Nicht genug Punkte!");
        }

        data.points -= bet;
        saveUserData();

        const crashPoint = +(Math.pow(Math.random(), 5) * 9 + 1).toFixed(2);
        const growthFactor = 1.04;

        const crashMsg = await message.reply(
            `🚀 **CRASH gestartet!**\n` +
            `Einsatz: ${bet} Punkte\n` +
            `📈 Multiplikator: **1.00x**\n` +
            `💸 Tippe .cashout, um auszuzahlen`
        );

        const game = {
            userId: message.author.id,
            bet,
            multiplier: 1.0,
            crashPoint,
            crashed: false,
            cashedOut: false,
            message: crashMsg,
            interval: null,
            editing: false
        };

        activeCrashGameRef.game = game;

        game.interval = setInterval(async () => {
            if (!activeCrashGameRef.game) return;
            if (game.cashedOut || game.crashed || game.editing) return;

            game.multiplier = +(game.multiplier * growthFactor).toFixed(2);

            if (game.multiplier >= game.crashPoint) {
                game.crashed = true;
                clearInterval(game.interval);

                await game.message.edit(
                    `💥 **CRASH bei ${game.crashPoint.toFixed(2)}x!** ❌\n` +
                    `Einsatz verloren 😢`
                ).catch(() => {});

                activeCrashGameRef.game = null;
                return;
            }

            game.editing = true;
            await game.message.edit(
                `🚀 **CRASH läuft**\n` +
                `Einsatz: ${bet} Punkte\n` +
                `📈 Multiplikator: **${game.multiplier.toFixed(2)}x**\n` +
                `💸 .cashout zum Auszahlen`
            ).catch(() => {});
            game.editing = false;
        }, 800);
    },

    async cashout(message, data, context) {
        const {
            activeCrashGameRef,
            updateUserRank
        } = context;

        const game = activeCrashGameRef.game;

        if (!game) {
            return message.reply("❌ Aktuell läuft kein Crash-Spiel.");
        }

        if (game.userId !== message.author.id) {
            return message.reply("❌ Du spielst dieses Crash-Spiel nicht.");
        }

        if (game.cashedOut || game.crashed) {
            return message.reply("❌ Zu spät zum Auscashen!");
        }

        game.cashedOut = true;
        clearInterval(game.interval);

        const finalMultiplier = Math.min(game.multiplier, game.crashPoint);
        const win = Math.floor(game.bet * finalMultiplier);

        data.points += win;

        if (!data.highestCrash || finalMultiplier > data.highestCrash) {
            data.highestCrash = finalMultiplier;
        }

        const xp = calculateGamblingXP(game.bet, data.points);
        const leveledUp = addGamblingXP(data, xp);

        saveUserData();

        if (message.member && updateUserRank) {
            await updateUserRank(message.member, data.points);
        }

        if (leveledUp) {
            message.channel.send(
                `🧠 Gambling Addiction **Level ${data.gambling.level}** erreicht!`
            );
        }

        await game.message.edit(
            `💸 **CASHOUT ERFOLGREICH!**\n` +
            `📈 Multiplikator: **${finalMultiplier.toFixed(2)}x**\n` +
            `🎉 Gewinn: **${win} Punkte**\n` +
            `Crashpoint: ${game.crashPoint.toFixed(2)}x`
        ).catch(() => {});

        activeCrashGameRef.game = null;
    }
};