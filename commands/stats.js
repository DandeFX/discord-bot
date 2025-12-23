const {
    getTodayString,
    getTomorrowMidnight,
    formatDuration
} = require("../utils/time");

const { getGamblingXPForNextLevel } = require("../utils/gambling");

module.exports = {
    name: ".stats",

    async run(message, data) {
        const today = getTodayString();
        let next = "Jetzt verfügbar ✅";

        if (data.lastDaily === today) {
            const remaining = getTomorrowMidnight() - new Date();
            next = `In ${formatDuration(remaining)}`;
        }

        const highestCrashText = data.highestCrash
            ? `${Number(data.highestCrash).toFixed(2)}x`
            : "Noch keiner";

        const gambling = {
            xp: Number(data.gambling?.xp) || 0,
            level: Number(data.gambling?.level) || 1
        };

        const nextXP = Number(
            getGamblingXPForNextLevel(gambling.level)
        ) || 0;

        await message.reply(
            `📊 **Statistiken von ${message.author.username}**\n` +
            `💰 Punkte: ${data.points}\n` +
            `🔥 Streak: ${data.streak}\n` +
            `⏳ Nächstes Daily: ${next}\n` +
            `🚀 Höchster erfolgreicher Crash: ${highestCrashText}\n\n` +
            `🎰 **Gambling Addiction**\n` +
            `📈 Level: ${gambling.level}\n` +
            `✨ XP: ${gambling.xp.toFixed(2)} / ${nextXP.toFixed(2)}`
        );
    }
};