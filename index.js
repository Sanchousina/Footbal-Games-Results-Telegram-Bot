require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

function sendLeaguesButtons(chatId) {
  bot.sendMessage(chatId, 'Для того, щоб знайти матч, оберіть спершу лігу', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'League 1', callback_data: 'league_League 1' }],
        [{ text: 'League 2', callback_data: 'league_League 2' }],
        [{ text: 'League 3', callback_data: 'league_League 3' }],
      ],
    },
  });
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    'Привіт! Я бот для інформування про результати футбольних матчів',
  );
  sendLeaguesButtons(chatId);
});

bot.on('callback_query', (query) => {
  // console.log('From callback query: ');
  // console.log(query);

  const chatId = query.message.chat.id;
  const data = query.data;
  const league = data.split('_')[1];

  bot.sendMessage(chatId, `Ви обрали лігу: ${league}`);
});

bot.on('message', (msg) => {
  console.log(msg);
  bot.sendMessage(msg.chat.id, msg.text);
});
