module.exports = {
    name: ".kamikaze",

    async run(message, args, { updateUserRank }) {
        const userId = message.author.id;
        const target = message.mentions.users.first();

        if (!target) {
            return message.reply("❌ Usage: `.kamikaze @User`");
        }

        if (target.bot) {
            return message.reply("❌ Bots können kein Ziel sein.");
        }

        const userData = require("../data/userData").getUserData(userId);
        const targetData = require("../data/userData").getUserData(target.id);

        if (userData.points < 100) {
            return message.reply("❌ Du brauchst mindestens **100 Punkte** für Kamikaze.");
        }

        const success = Math.random() < 0.5;

        userData.points -= 100;

        if (!success) {
            await message.reply(
                `💥 **KAMIKAZE FEHLGESCHLAGEN!**\n` +
                `❌ Du verlierst **100 Punkte**\n` +
                `💰 Neuer Stand: **${userData.points} Punkte**`
            );
        } else {
            const loss = Math.min(100, targetData.points);
            targetData.points -= loss;

            await message.reply(
                `🔥 **KAMIKAZE ERFOLG!**\n` +
                `💣 ${message.author.username} & ${target.username} verlieren jeweils **100 Punkte**\n` +
                `💰 Dein Stand: **${userData.points} Punkte**`
            );
        }

        if (message.member) {
            await updateUserRank(message.member, userData.points);
        }

        if (message.guild.members.cache.get(target.id)) {
            await updateUserRank(
                message.guild.members.cache.get(target.id),
                targetData.points
            );
        }

        require("../data/userData").saveUserData();
    }
};