'use strict';
const TelegramBotConfig = require('./telegrambotconfig');
const apiai = require('apiai');
const uuid = require('node-uuid');
const request = require('request');

module.exports = class TelegramBot {

    get apiaiService() {
        return this._apiaiService;
    }

    set apiaiService(value) {
        this._apiaiService = value;
    }

    get botConfig() {
        return this._botConfig;
    }

    set botConfig(value) {
        this._botConfig = value;
    }

    get sessionIds() {
        return this._sessionIds;
    }

    set sessionIds(value) {
        this._sessionIds = value;
    }

    constructor(botConfig, baseUrl) {
        this._botConfig = botConfig;
        var apiaiOptions = {
            language: botConfig.apiaiLang,
            requestSource: "telegram"
        };

        this._apiaiService = apiai(botConfig.apiaiAccessToken, apiaiOptions);
        this._sessionIds = new Map();

        this._webhookUrl = baseUrl + '/webhook';
        console.log('Starting bot on ' + this._webhookUrl);

        this._telegramApiUrl = 'https://api.telegram.org/bot' + botConfig.telegramToken;
    }

    start(responseCallback, errCallback) {
        // https://core.telegram.org/bots/api#setwebhook
        request.post(this._telegramApiUrl + '/setWebhook', {
            json: {
                url: this._webhookUrl
            }
        }, function (error, response, body) {

            if (error) {
                console.error('Error while /setWebhook', error);
                if (errCallback) {
                    errCallback(error);
                }
                return;
            }

            if (response.statusCode != 200) {
                console.error('Error status code while /setWebhook', body);
                if (errCallback) {
                    errCallback('Error status code while setWebhook ' + body);
                }
                return;
            }

            console.log('Method /setWebhook completed', body);
            if (responseCallback) {
                responseCallback('Method /setWebhook completed ' + body)
            }
        });
    }

    processMessage(req, res) {
        if (this._botConfig.devConfig) {
            console.log("body", req.body);
        }

        let updateObject = req.body;

        if (updateObject && updateObject.message) {
            let msg = updateObject.message;

            var chatId;

            if (msg.chat) {
                chatId = msg.chat.id;
            }

            let messageText = msg.text;

            console.log(chatId, messageText);

            if (chatId && messageText) {
                if (!this._sessionIds.has(chatId)) {
                    this._sessionIds.set(chatId, uuid.v1());
                }

                let apiaiRequest = this._apiaiService.textRequest(messageText, {
                    sessionId: this._sessionIds.get(chatId)
                });

                apiaiRequest.on('response', (response) => {
                    if (TelegramBot.isDefined(response.result)) {
                        let responseText = response.result.fulfillment.speech;
                        let responseData = response.result.fulfillment.data;
                        let responseAction = response.result.action;



                        if (TelegramBot.isDefined(responseData) && TelegramBot.isDefined(responseData.telegram)) {

                            console.log('Response as formatted message');

                            let telegramMessage = responseData.telegram;
                            telegramMessage.chat_id = chatId;

                            this.reply(telegramMessage);
                            TelegramBot.createResponse(res, 200, 'Message processed');

                        } else if (TelegramBot.isDefined(responseText)) {
                            console.log('Response as text message');
                            console.log('Action: ' + responseAction);
                            switch (responseAction) {
                                //Action /moeda
                                case 'ValorMoedaAction':
                                    let moeda = response.result.parameters.moeda;
                                    console.log(moeda)
                                    this.getCriptoCourrence(moeda, function (resp) {
                                        resp = JSON.parse(resp.replace(/]|[[]/g, ''))
                                        var cripto_brl = moeda+" vale: R$" + parseFloat(resp.price_brl).toFixed(2);
                                        const DEV_CONFIG = process.env.DEVELOPMENT_CONFIG == 'true';
                                        const APP_NAME = "api-telegram-btc";
                                        const APIAI_ACCESS_TOKEN = "b797b87e61fa4846b407af418965a57d";
                                        const APIAI_LANG = "pt-br";
                                        const TELEGRAM_TOKEN = "406121750:AAHzZVy3dHL-SW6JOk9ANkB0GtKmX1XoyOI";
                                        const baseUrl = `https://${APP_NAME}.herokuapp.com`;
                                        const botConfig = new TelegramBotConfig(
                                            APIAI_ACCESS_TOKEN,
                                            APIAI_LANG,
                                            TELEGRAM_TOKEN);

                                        botConfig.devConfig = DEV_CONFIG;

                                        const bot = new TelegramBot(botConfig, baseUrl);

                                        bot.reply({
                                            chat_id: chatId,
                                            text: cripto_brl
                                        });
                                    })
                                    break;

                                case 'VariacaoMoedaAction':
                                    this.getVariacao(function (resp) {
                                        const DEV_CONFIG = process.env.DEVELOPMENT_CONFIG == 'true';
                                        const APP_NAME = "api-telegram-btc";
                                        const APIAI_ACCESS_TOKEN = "b797b87e61fa4846b407af418965a57d";
                                        const APIAI_LANG = "pt-br";
                                        const TELEGRAM_TOKEN = "406121750:AAHzZVy3dHL-SW6JOk9ANkB0GtKmX1XoyOI";
                                        const baseUrl = `https://${APP_NAME}.herokuapp.com`;
                                        const botConfig = new TelegramBotConfig(
                                            APIAI_ACCESS_TOKEN,
                                            APIAI_LANG,
                                            TELEGRAM_TOKEN);

                                        botConfig.devConfig = DEV_CONFIG;

                                        const bot = new TelegramBot(botConfig, baseUrl);
                                        var keys = Object.keys(resp.slice(0, 10));
                                        resp = JSON.parse(resp)
                                        msg = "Cryptopia maior variacao*\n"
                                        for (var i = 0, length = keys.length; i < length; i++) {
                                            if (resp[i].volume > 1000){
                                                msg += "\n\u{2757}#"+(i+1);
                                            } else {
                                                msg += "\n#"+(i+1);
                                            }
                                            msg += "\n\u{1F4B2}Moeda " + resp[i].nome.replace('/', ' para ');
                                            msg += "\n\u{2197}Pedido " + resp[i].pedido;
                                            msg += "\n\u{2196}Ofertado " + resp[i].ofertado;
                                            msg += "\n\u{1F4B0}Volume " + resp[i].volume.toFixed(8);
                                            msg += "\n\u{1F4B9}Variação " + resp[i].variacao.toFixed(2) +"%";
                                            msg += "\n\n";
                                        }
                                        console.log(msg)
                                        bot.reply({
                                            chat_id: chatId,
                                            text: msg
                                        });

                                    })


                                    break;
                                    //Default Action
                                default:
                                    this.reply({
                                        chat_id: chatId,
                                        text: responseText
                                    });
                                    break;
                            }

                            TelegramBot.createResponse(res, 200, 'Message processed');

                        } else {
                            console.log('Received empty speech');
                            TelegramBot.createResponse(res, 200, 'Received empty speech');
                        }
                    } else {
                        console.log('Received empty result');
                        TelegramBot.createResponse(res, 200, 'Received empty result');
                    }
                });

                apiaiRequest.on('error', (error) => {
                    console.error('Error while call to api.ai', error);
                    TelegramBot.createResponse(res, 200, 'Error while call to api.ai');
                });
                apiaiRequest.end();
            } else {
                console.log('Empty message');
                return TelegramBot.createResponse(res, 200, 'Empty message');
            }
        } else {
            console.log('Empty message');
            return TelegramBot.createResponse(res, 200, 'Empty message');
        }
    }

    reply(msg) {
        // https://core.telegram.org/bots/api#sendmessage
        request.post(this._telegramApiUrl + '/sendMessage', {
            json: msg
        }, function (error, response, body) {
            if (error) {
                console.error('Error while /sendMessage', error);
                return;
            }

            if (response.statusCode != 200) {
                console.error('Error status code while /sendMessage', body);
                return;
            }

            console.log('Method /sendMessage succeeded');
        });
    }
    //Value getCripto
    getCriptoCourrence(val, callback) {
        request.get('https://api.coinmarketcap.com/v1/ticker/' + val + '/?convert=BRL', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var result = JSON.stringify(JSON.parse(body));
                return callback(result, false);
            } else {
                return callback(null, error);
            }
        });
    }


    getVariacao(callback) {
        request.get('https://www.cryptopia.co.nz/api/GetMarkets/BTC', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var response = JSON.parse(body);
                let data = response.Data;
                var obj_dic = [];
                var keys = Object.keys(data);
                for (var i = 0, length = keys.length; i < length; i++) {
                    obj_dic.push({
                        'nome': data[i].Label,
                        'pedido': data[i].AskPrice,
                        'ofertado': data[i].BidPrice,
                        'volume': data[i].Volume,
                        'variacao': (((
                                parseFloat(
                                    (data[i].AskPrice - 0.00000001)
                                ) - parseFloat((data[i].BidPrice + 0.00000001))) /
                            parseFloat((data[i].BidPrice + 0.00000001))) * 100)
                    });
                }
                obj_dic = obj_dic.sort(function (a, b) {
                    return ((b.variacao > a.variacao) ? 1 : ((b.variacao < a.variacao) ? -1 : 0));
                });

                var result = JSON.stringify(obj_dic);
                return callback(result, false);

            } else {
                return callback(null, error);
            }
        });

    }


    static createResponse(resp, code, message) {
        return resp.status(code).json({
            status: {
                code: code,
                message: message
            }
        });
    }

    static isDefined(obj) {
        if (typeof obj == 'undefined') {
            return false;
        }

        if (!obj) {
            return false;
        }

        return obj != null;
    }
};