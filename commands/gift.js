const { saveUserData, getUserData, userData } = require("../data/userData");

module.exports = {
    name: ".gift",

    async run(message, args, data, context) {
        const { updateUserRank } = context;

        const target = message.mentions.users.first();
        const amount = parseInt(args[2]);

        if (!target || isNaN(amount) || amount <= 0) {
            return message.reply("❌ Usage: `.gift @User [Punkt(e)]`");
        }

        if (data.points < amount) {
            return message.reply("❌ Nicht genug Punkt(e)");
        }

        if (!userData.has(target.id)) {
            userData.set(target.id, {
                points: 0,
                lastDaily: null,
                streak: 0
            });
        }

        const targetData = getUserData(target.id);

        data.points -= amount;
        targetData.points += amount;

        // 🔄 Ränge aktualisieren
        if (message.member && updateUserRank) {
            await updateUserRank(message.member, data.points);
        }

        const targetMember = await message.guild.members
            .fetch(target.id)
            .catch(() => null);

        if (targetMember && updateUserRank) {
            await updateUserRank(targetMember, targetData.points);
        }

        await message.reply(
            `🎁 **${amount} Punkt(e)** an **${target.username}** verschenkt!`
        );

        saveUserData();
    }
};