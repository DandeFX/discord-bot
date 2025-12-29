require("dotenv").config();

const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const activeCrashGameRef = { game: null };

const {
    loadUserData,
    saveUserData,
    getUserData,
} = require("./data/userData");

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
const ranksCommand = require("./commands/ranks");
const RANKS = require("./config/ranks");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* ================= RANK SYSTEM ================= */

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

/* ================= DROP SYSTEM ================= */

const DROP_CHANNEL_ID = "1450567294714515549";
const DROP_INTERVAL = 30 * 60 * 1000;

let currentDrop = null;
let dropLock = false;
let dropExpireTimer = null;
let dropMessageId = null;

function rollDrop() {
    const roll = Math.random() * 100;

    if (roll < 1) {
        return { type: "legendary", text: "🌟 Legendär", reward: "legendaryKey" };
    }
    if (roll < 11) {
        return { type: "epic", text: "💜 Episch", reward: "epicKey" };
    }
    if (roll < 41) {
        return { type: "rare", text: "💙 Selten", reward: "rareKey" };
    }
    return { type: "common", text: "⚪ Gewöhnlich", reward: "points" };
}

async function startDrop(channel) {
    if (!channel || dropLock || currentDrop) return;
    dropLock = true;

    currentDrop = {
        claimed: false,
        drop: rollDrop()
    };

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
                await m.edit("⌛ **Drop abgelaufen!** (nicht geclaimt)");
            } catch {}
            dropMessageId = null;
            dropExpireTimer = null;
        }
    }, 10 * 60 * 1000);

    dropLock = false;
}

/* ================= READY ================= */

client.once("ready", () => {
    console.log(`🤖 Bot online als ${client.user.tag}`);
    loadUserData();

    setInterval(async () => {
        if (currentDrop) return;
        const channel = await client.channels.fetch(DROP_CHANNEL_ID).catch(() => null);
        if (!channel) return;
        await startDrop(channel);
    }, DROP_INTERVAL);
});

/* ================= COMMAND HANDLER ================= */

client.on("messageCreate", async message => {
    if (message.author.bot) return;

    const userId = message.author.id;
    const data = getUserData(userId);
    const args = message.content.trim().split(/ +/);
    const command = args[0].toLowerCase();

    switch (command) {

        case ".stats":
            return statsCommand.run(message, data);

        case ".stp":
            return stpCommand.run(message, args, updateUserRank);

        case ".coinflip":
            return coinflipCommand.run(message, args, updateUserRank);

        case ".roulette":
            return rouletteCommand.run(message, args, data, updateUserRank);

        case ".hot":
            return hotCommand.run(message, args, data, updateUserRank);

        case ".crash":
            return crashCommand.run(message, args, data, { activeCrashGameRef, updateUserRank });

        case ".cashout":
            return crashCommand.cashout(message, data, { activeCrashGameRef, updateUserRank });

        case ".gift":
            return giftCommand.run(message, args, data, { updateUserRank });

        case ".daily":
            return dailyCommand.run(message, data, { updateUserRank });

        case ".help":
            return helpCommand.run(message);

        case ".punkte":
            return punkteCommand.run(message, args);

        case ".leaderboard":
            return leaderboardCommand.run(message, args, client);

        case ".ranks":
            return ranksCommand.run(message, args);

        case ".kamikaze":
            return kamikazeCommand.run(message, args, { updateUserRank });

        case ".add":
        case ".remove":
            return adminPointsCommand.run(message, args, { updateUserRank });

        case ".drop":
            if (message.channel.id !== DROP_CHANNEL_ID) return;

            if (!currentDrop || currentDrop.claimed) {
                return message.reply("❌ Aktuell ist kein Drop aktiv.");
            }

            const drop = currentDrop.drop;
            currentDrop.claimed = true;

            if (!data.items) {
                data.items = {
                    rareKey: 0,
                    epicKey: 0,
                    legendaryKey: 0
                };
            }

            if (drop.reward === "points") {
                const points = Math.floor(Math.random() * 21) + 10;
                data.points += points;

                await message.reply(
                    `🎉 **Drop erhalten!**\n` +
                    `⚪ Gewöhnlich\n` +
                    `💰 +${points} Punkte`
                );

                if (message.member) {
                    await updateUserRank(message.member, data.points);
                }
            } else {
                data.items[drop.reward]++;

                await message.reply(
                    `🎉 **${drop.text} Drop!**\n` +
                    `🔑 Du hast **1 Key** erhalten!`
                );
            }

            saveUserData();

            if (dropExpireTimer) clearTimeout(dropExpireTimer);
            dropExpireTimer = null;
            dropMessageId = null;
            currentDrop = null;
            break;

        // ===== TEST DROPS =====
        case ".startdrop":
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            const channel = await client.channels.fetch(DROP_CHANNEL_ID).catch(() => null);
            if (!channel) return message.reply("❌ Drop-Channel nicht gefunden!");
            await startDrop(channel);
            break;
    }
});

client.login(process.env.DISCORD_TOKEN);