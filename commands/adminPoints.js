const { userData, saveUserData } = require("../data/userData");
const { PermissionsBitField } = require("discord.js");

module.exports = {
    name: "adminPoints",
    description: "Admin Commands: .add / .remove Punkte",

    async run(message, args, { updateUserRank }) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return message.reply("❌ Du hast keine Berechtigung!");

        const targetUser = message.mentions.users.first();
        const amount = parseInt(args[2]);

        if (!targetUser || isNaN(amount))
            return message.reply("❌ Usage: .add @User [Punkt(e)] oder .remove @User [Punkt(e)]");

        if (!userData.has(targetUser.id)) userData.set(targetUser.id, { points: 0, lastDaily: null, streak: 0 });
        const targetData = userData.get(targetUser.id);

        const command = args[0].toLowerCase();

        if (command === ".add") targetData.points += amount;
        else targetData.points = Math.max(targetData.points - amount, 0);

        const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
        if (targetMember) await updateUserRank(targetMember, targetData.points);

        message.reply(`✅ Neuer Stand von ${targetUser.username}: ${targetData.points} Punkt(e)`);

        saveUserData();
    }
};