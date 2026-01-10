const fs = require("fs");
const path = require("path");

const dataFile = path.join(__dirname, "..", "userData.json");
let userData = new Map();

function createDefaultUser() {
    return {
        points: 0,
        streak: 0,
        lastDaily: null,
        items: {
            rareKey: 0,
            epicKey: 0,
            legendaryKey: 0
        },
        gambling: { xp: 0, level: 1 },
        highestCrash: 0,
        pets: { owned: {}, active: null }
    };
}

function loadUserData() {
    if (!fs.existsSync(dataFile)) return userData;

    const raw = fs.readFileSync(dataFile, "utf8");
    const json = JSON.parse(raw);

    userData.clear();

    for (const [id, value] of Object.entries(json)) {
        const user = {
            points: Number(value.points) || 0,
            streak: Number(value.streak) || 0,
            lastDaily: value.lastDaily ?? null,
            gambling: value.gambling ?? { xp: 0, level: 1 },
            highestCrash: value.highestCrash ?? 0,
            items: value.items ?? { rareKey: 0, epicKey: 0, legendaryKey: 0 },
            pets: value.pets ?? { owned: {}, active: null }
        };
        userData.set(id, user);
    }

    return userData;
}

function saveUserData() {
    const obj = Object.fromEntries(userData);
    fs.writeFileSync(dataFile, JSON.stringify(obj, null, 2));
}

function getUserData(userId) {
    if (!userData.has(userId)) {
        const defaultUser = createDefaultUser();
        userData.set(userId, defaultUser);
    }
    return userData.get(userId);
}

function getAllUsers() {
    return userData;
}

module.exports = {
    loadUserData,
    saveUserData,
    getUserData,
    getAllUsers
};