const { getUserData } = require("../data/userData");

module.exports = {
    name: ".punkte",

    async run(message, args) {
        const target =
            message.mentions.users.first() || message.author;

        const data = getUserData(target.id);

        return message.reply(
            `💰 **Punktestand von ${target.username}**: **${data.points} Punkte**`
        );
    }
};