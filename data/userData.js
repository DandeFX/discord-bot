const fs = require("fs");
const path = require("path");

const dataFile = path.join(__dirname, "..", "userData.json");
let userData = new Map();

function loadUserData() {
    if (!fs.existsSync(dataFile)) return userData;

    const raw = fs.readFileSync(dataFile, "utf8");
    const json = JSON.parse(raw);

    userData.clear();

    for (const [id, value] of Object.entries(json)) {
        userData.set(id, {
            points: Number(value.points) || 0,
            streak: Number(value.streak) || 0,
            lastDaily: value.lastDaily ?? null,
            gambling: value.gambling ?? { xp: 0, level: 1 },
            highestCrash: value.highestCrash ?? 0
        });
    }

    return userData;
}

function saveUserData() {
    const obj = Object.fromEntries(userData);
    fs.writeFileSync(dataFile, JSON.stringify(obj, null, 2));
}

function getUserData(userId) {
    if (!userData.has(userId)) {
        userData.set(userId, {
            points: 0,
            lastDaily: null,
            streak: 0,
            gambling: { xp: 0, level: 1 },
            highestCrash: 0
        });
    }
    return userData.get(userId);
}

module.exports = {
    loadUserData,
    saveUserData,
    getUserData,
    userData
};