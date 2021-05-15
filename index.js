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
    bot.sendMessage(msg.chat.id, "Du wirst nicht weiter benachrichtigt!");
    unregisterUser(msg.chat.id);
});

bot.onText(/\/restart(.*)/, (msg, match) => {
    if (config[msg.chat.id]) {
        bot.sendMessage(msg.chat.id, "Du wirst wieder benachrichtigt!");
        registerUser(msg.chat.id, config[msg.chat.id]);
    } else {
        bot.sendMessage(msg.chat.id, "Du musst den Service erst wieder aktivieren mit /start und deiner Postleitzahl");
    }
});

function registerUser(chatId, plz) {
    checkAppointment(chatId, plz);
    requests[chatId] = setInterval(function () {
        checkAppointment(chatId, plz);
    }, 30 * 1000);
}

function unregisterUser(chatId) {
    clearInterval(requests[chatId]);
    delete config[chatId];
    fs.writeFileSync(configFile, JSON.stringify(config));
}

function checkAppointment(chatId, plz) {
    const url = "https://www.impfportal-niedersachsen.de/portal/rest/appointments/findVaccinationCenterListFree/" + plz.trim();
    axios.get(url).then(function (response) {
        let result = response.data.resultList[0];
        if (result.outOfStock == false) {
            let message = "In " + result.city + " ist ein Impftermin verfügbar!\nEs handelt sich um Impfstoff von " + result.vaccineName + ".\nDu wirst nicht weiter benachrichtigt. Sende /restart um wieder informiert zu werden.";
            if (result.freeSlotSizeOnline > 1) {
                message = "In " + result.city + " sind " + result.freeSlotSizeOnline + " Impftermine verfügbar!\nEs handelt sich um Impfstoff von " + result.vaccineName + ". \nDu wirst nicht weiter benachrichtigt. Sende /restart um wieder informiert zu werden.";
            }
            console.log(new Date().toLocaleString(), message);
            bot.sendMessage(chatId, message);
            clearInterval(requests[chatId]);
        } else {
            console.log(new Date().toLocaleString(), "Leider kein Termin verfügbar für ", chatId);
        }
    }).catch((error) => {
        console.log(error);
    });
}

function saveNewUser(chatId, plz) {
    config[chatId] = plz.trim();
    fs.writeFileSync(configFile, JSON.stringify(config));
}