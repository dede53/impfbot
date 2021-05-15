require('dotenv').config();
const axios = require('axios').default;
const TelegramBot = require('node-telegram-bot-api');
const fs = require("fs");

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });
let config = {};
let requests = {};
const configFile = "config.json";


if (fs.existsSync(configFile)) {
    config = JSON.parse(fs.readFileSync(configFile));
    Object.keys(config).forEach(user => {
        registerUser(user, config[user]);
    });
} else {
    fs.writeFileSync(configFile, "{}");
}

bot.onText(/\/start(.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    const plz = match[1] || 37073;

    bot.sendMessage(chatId, "Du wirst benachrichtigt sobald ein Termin frei ist!");
    registerUser(chatId, plz);
    saveNewUser(chatId, plz);
});

bot.onText(/\/stop(.*)/, (msg, match) => {
    bot.sendMessage(msg.chat.id, "Du wirst nicht weiter benachrichtig!");
    clearInterval(requests[msg.chat.id]);
    delete config[msg.chat.id];
    fs.writeFileSync(configFile, JSON.stringify(config));
});

function registerUser(chatId, plz) {
    checkAppointment(chatId, plz);
    requests[chatId] = setInterval(function () {
        checkAppointment(chatId, plz);
    }, 30 * 1000);
}

function checkAppointment(chatId, plz) {
    axios.get("https://www.impfportal-niedersachsen.de/portal/rest/appointments/findVaccinationCenterListFree/" + plz).then(function (response) {
        if (response.data.resultList[0].outOfStock == false) {
            console.log(new Date().toLocaleString(), "Es ist ein Impftermin verfügbar!");
            bot.sendMessage(chatId, "Es ist ein Impftermin verfügbar!");
        } else {
            console.log(new Date().toLocaleString(), "Leider kein Termin verfügbar für ", chatId);
        }
    }).catch((error) => {
        console.log(error);
    });
}

function saveNewUser(chatId, plz) {
    config[chatId] = plz;
    fs.writeFileSync(configFile, JSON.stringify(config));
}