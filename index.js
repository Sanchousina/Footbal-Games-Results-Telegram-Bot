require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

const leagues = [];

async function getAllLeagues() {
  const response = await axios.get(
    'https://v3.football.api-sports.io/leagues',
    {
      headers: {
        'x-apisports-key': process.env.API_SPORTS_API_KEY,
      },
    },
  );
  const leagues = response.data.response.slice(0, 10);
  return leagues;
}

function handleLeagues(data) {
  console.log(data);
  data.forEach((el) => {
    leagues.push({
      id: el.league.id,
      name: el.league.name,
      country: el.country.name,
    });
  });
  console.log(leagues);
}

async function sendLeaguesButtons(chatId) {
  handleLeagues(await getAllLeagues());
  const inline_keyboard = leagues.map((el) => [
    { text: `${el.name}, ${el.country}`, callback_data: `league_${el.id}` },
  ]);

  bot.sendMessage(chatId, 'Для того, щоб знайти матч, оберіть спершу лігу', {
    reply_markup: {
      // inline_keyboard: [
      //   [{ text: 'League 1', callback_data: 'league_League 1' }],
      //   [{ text: 'League 2', callback_data: 'league_League 2' }],
      //   [{ text: 'League 3', callback_data: 'league_League 3' }],
      // ],
      inline_keyboard,
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
  // console.log(msg);
  bot.sendMessage(msg.chat.id, msg.text);
});
