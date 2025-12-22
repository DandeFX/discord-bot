function getTodayString() {
    return new Date().toISOString().split("T")[0];
}

function getTomorrowMidnight() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDuration(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}min`;
}

module.exports = {
    getTodayString,
    getTomorrowMidnight,
    formatDuration
};