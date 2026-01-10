const path = require("path");

module.exports = {
    name: ".peter",

    async run(message) {
        // Zufällige Zahl von 1 bis 10
        const randomNumber = Math.floor(Math.random() * 10) + 1;

        // Pfad zum GIF
        const gifPath = path.join(
            __dirname,
            "..",
            "gifs",
            `${randomNumber}.gif`
        );

        await message.reply({
            files: [gifPath]
        });
    }
};