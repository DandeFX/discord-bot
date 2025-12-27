const {
    getTodayString,
    getTomorrowMidnight,
    formatDuration
} = require("../utils/time");

const { saveUserData } = require("../data/userData");

module.exports = {
    name: ".daily",

    async run(message, data, context) {
        const { updateUserRank } = context;

        const now = new Date();
        const today = getTodayString();

        if (data.lastDaily === today) {
            const remaining = getTomorrowMidnight() - now;
            return message.reply(
                `⏳ Nächstes Daily in **${formatDuration(remaining)}**`
            );
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        data.streak = data.lastDaily === yesterdayStr
            ? data.streak + 1
            : 1;

        let reward = 10 + (data.streak - 1) * 2;

        if (now.getDay() === 0) {
            reward *= 2;
        }

        data.points += reward;
        data.lastDaily = today;

        if (message.member && updateUserRank) {
            await updateUserRank(message.member, data.points);
        }

        await message.reply(
            `🎁 **Daily erhalten!**\n` +
            `➕ ${reward} Punkt(e)\n` +
            `🔥 Streak: ${data.streak}\n` +
            `💰 Kontostand: ${data.points}`
        );

        saveUserData();
    }
};