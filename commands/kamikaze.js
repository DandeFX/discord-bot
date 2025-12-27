const { userData, saveUserData } = require("../data/userData");

module.exports = {
    name: ".kamikaze",
    description: "Beide Spieler verlieren 100 Punkte",

    async run(message, args, { updateUserRank }) {
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply("❌ Bitte erwähne einen User!");

        if (!userData.has(message.author.id)) userData.set(message.author.id, { points: 0, lastDaily: null, streak: 0 });
        if (!userData.has(targetUser.id)) userData.set(targetUser.id, { points: 0, lastDaily: null, streak: 0 });

        const authorData = userData.get(message.author.id);
        const targetData = userData.get(targetUser.id);

        if (authorData.points < 100 || targetData.points < 100)
            return message.reply("❌ Beide brauchen mindestens 100 Punkt(e)!");

        authorData.points -= 100;
        targetData.points -= 100;

        if (message.member) await updateUserRank(message.member, authorData.points);
        const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
        if (targetMember) await updateUserRank(targetMember, targetData.points);

        message.reply(
            `💥 Kamikaze ausgeführt!\n**${message.author.username}**: ${authorData.points} Punkt(e)\n**${targetUser.username}**: ${targetData.points} Punkt(e)`
        );
        
        saveUserData();
    }
};