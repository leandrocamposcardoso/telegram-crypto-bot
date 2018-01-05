'use strict';

const apiai = require('apiai');
const express = require('express');
const bodyParser = require('body-parser');

const TelegramBot = require('./telegrambot');
const TelegramBotConfig = require('./telegrambotconfig');

const REST_PORT = (process.env.PORT || 5000);
const DEV_CONFIG = process.env.DEVELOPMENT_CONFIG == 'true';

const APP_NAME = "api-telegram-btc";
const APIAI_ACCESS_TOKEN = "b797b87e61fa4846b407af418965a57d";
const APIAI_LANG = "pt-br";
const TELEGRAM_TOKEN = "406121750:AAHzZVy3dHL-SW6JOk9ANkB0GtKmX1XoyOI";

var baseUrl = "";
if (APP_NAME) {
    // Heroku case
    baseUrl = `https://${APP_NAME}.herokuapp.com`;
} else {
    console.error('Set up the url of your service here and remove exit code!');
    process.exit(1);
}

// console timestamps
require('console-stamp')(console, 'yyyy.mm.dd HH:MM:ss.l');

const botConfig = new TelegramBotConfig(
    APIAI_ACCESS_TOKEN,
    APIAI_LANG,
    TELEGRAM_TOKEN);

botConfig.devConfig = DEV_CONFIG;

const bot = new TelegramBot(botConfig, baseUrl);
bot.start(() => {
        console.log("Bot started");
    },
    (errStatus) => {
        console.error('It seems the TELEGRAM_TOKEN is wrong! Please fix it.')
    });


const app = express();
app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
    console.log('POST webhook');

    try {
        bot.processMessage(req, res);
    } catch (err) {
        return res.status(400).send('Error while processing ' + err.message);
    }
});

app.listen(REST_PORT, function () {
    console.log('Rest service ready on port ' + REST_PORT);
});