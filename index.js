require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const activeCrashGameRef = { game: null };

// =====================
// DATA & PET PAYOUT
// =====================
const startPetPayoutLoop = require("./utils/petPayout");

const {
    loadUserData,
    saveUserData,
    getUserData
} = require("./data/userData");

// =====================
// COMMANDS
// =====================
const statsCommand = require("./commands/stats");
const stpCommand = require("./commands/stp");
const coinflipCommand = require("./commands/coinflip");
const rouletteCommand = require("./commands/roulette");
const hotCommand = require("./commands/hot");
const crashCommand = require("./commands/crash");
const giftCommand = require("./commands/gift");
const dailyCommand = require("./commands/daily");
const helpCommand = require("./commands/help");
const punkteCommand = require("./commands/punkte");
const leaderboardCommand = require("./commands/leaderboard");
const kamikazeCommand = require("./commands/kamikaze");
const adminPointsCommand = require("./commands/adminPoints");
const lootboxCommand = require("./commands/lootbox");
const inventoryCommand = require("./commands/inventory");
const useCommand = require("./commands/use");
const peterCommand = require("./commands/peter");
const ranksCommand = require("./commands/ranks");
const petCommand = require("./commands/pets"); // 🐾 PETS

const RANKS = require("./config/ranks");

// =====================
// CLIENT
// =====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// =====================
// RANK UPDATE
// =====================
async function updateUserRank(member, points) {
    if (!member?.guild) return;

    const guild = member.guild;
    const targetRank = [...RANKS]
        .sort((a, b) => b.min - a.min)
        .find(r => points >= r.min);

    if (!targetRank) return;

    const newRole = guild.roles.cache.find(r => r.name === targetRank.name);
    if (!newRole) return;

    const allRankRoles = RANKS
        .map(r => guild.roles.cache.find(role => role.name === r.name))
        .filter(Boolean);

    for (const role of allRankRoles) {
        if (member.roles.cache.has(role.id) && role.id !== newRole.id) {
            await member.roles.remove(role).catch(() => {});
        }
    }

    if (!member.roles.cache.has(newRole.id)) {
        await member.roles.add(newRole).catch(() => {});
    }
}

// =====================
// DROPS
// =====================
const DROP_CHANNEL_ID = "1450567294714515549";
const DROP_INTERVAL = 20 * 60 * 1000;

let currentDrop = null;
let dropLock = false;
let dropExpireTimer = null;
let dropMessageId = null;

function rollDrop() {
    const roll = Math.random() * 100;
    if (roll < 1) return { type: "legendary", text: "🌟 Legendär", reward: "legendaryKey" };
    if (roll < 11) return { type: "epic", text: "💜 Episch", reward: "epicKey" };
    if (roll < 31) return { type: "rare", text: "💙 Selten", reward: "rareKey" };
    return { type: "common", text: "⚪ Gewöhnlich", reward: "points" };
}

async function startDrop(channel) {
    if (!channel || dropLock || currentDrop) return;
    dropLock = true;

    currentDrop = { claimed: false, drop: rollDrop() };

    const msg = await channel.send(
        `🎁 **Ein Drop ist erschienen!**\n` +
        `✨ Seltenheit: **${currentDrop.drop.text}**\n\n` +
        `Tippe \`.drop\` um ihn zu claimen!`
    );

    dropMessageId = msg.id;

    dropExpireTimer = setTimeout(async () => {
        if (currentDrop && !currentDrop.claimed) {
            currentDrop = null;
            try {
                const m = await channel.messages.fetch(dropMessageId);
                await m.edit("⌛ **Drop abgelaufen!**");
            } catch {}
            dropMessageId = null;
            dropExpireTimer = null;
        }
    }, 10 * 60 * 1000);

    dropLock = false;
}

// =====================
// READY
// =====================
client.once("ready", () => {
    console.log(`🤖 Bot online als ${client.user.tag}`);

    loadUserData();

    // 🐾 PET PAYOUT LOOP
    startPetPayoutLoop(client, updateUserRank);

    // 🎁 DROPS
    setInterval(async () => {
        if (currentDrop) return;
        const channel = await client.channels.fetch(DROP_CHANNEL_ID).catch(() => null);
        if (!channel) return;
        await startDrop(channel);
    }, DROP_INTERVAL);
});

// =====================
// MESSAGE HANDLER
// =====================
client.on("messageCreate", async message => {
    if (message.author.bot) return;

    const data = getUserData(message.author.id);
    const args = message.content.trim().split(/ +/);
    const command = args[0].toLowerCase();

    switch (command) {

        case ".stats": return statsCommand.run(message, data);
        case ".stp": return stpCommand.run(message, args, updateUserRank);
        case ".coinflip": return coinflipCommand.run(message, args, updateUserRank);
        case ".roulette": return rouletteCommand.run(message, args, data, updateUserRank);
        case ".hot": return hotCommand.run(message, args, data, updateUserRank);
        case ".crash": return crashCommand.run(message, args, data, { activeCrashGameRef, updateUserRank });
        case ".cashout": return crashCommand.cashout(message, data, { activeCrashGameRef, updateUserRank });
        case ".gift": return giftCommand.run(message, args, data, { updateUserRank });
        case ".daily": return dailyCommand.run(message, data, { updateUserRank });
        case ".help": return helpCommand.run(message);
        case ".punkte": return punkteCommand.run(message, args);
        case ".leaderboard": return leaderboardCommand.run(message, args, client);
        case ".ranks": return ranksCommand.run(message, args);
        case ".kamikaze": return kamikazeCommand.run(message, args, { updateUserRank });
        case ".add":
        case ".remove": return adminPointsCommand.run(message, args, { updateUserRank });
        case ".lootbox": return lootboxCommand.run(message, args);
        case ".inventory": return inventoryCommand.run(message);
        case ".use": return useCommand.run(message, args);
        case ".peter": return peterCommand.run(message);

        // 🐾 PET COMMAND
        case ".pet":
            return petCommand.run(message, args);

        // 🎁 DROP
        case ".drop":
            if (message.channel.id !== DROP_CHANNEL_ID) return;
            if (!currentDrop || currentDrop.claimed) {
                return message.reply("❌ Aktuell ist kein Drop aktiv.");
            }

            currentDrop.claimed = true;
            const drop = currentDrop.drop;

            if (!data.items) {
                data.items = { rareKey: 0, epicKey: 0, legendaryKey: 0 };
            }

            const points = Math.floor(Math.random() * 21) + 10;
            data.points += points;
            if (drop.type !== "common") data.items[drop.reward]++;

            await message.reply(
                `🎉 **Drop erhalten!**\n` +
                `✨ Seltenheit: ${drop.text}\n` +
                `💰 +${points} Punkte`
            );

            if (message.member) await updateUserRank(message.member, data.points);
            saveUserData();

            if (dropExpireTimer) clearTimeout(dropExpireTimer);
            currentDrop = null;
            dropMessageId = null;
            dropExpireTimer = null;
            break;
    }
});

client.login(process.env.DISCORD_TOKEN);