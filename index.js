require('dotenv').config();
const axios = require('axios');
const emoji = require('node-emoji');
const TelegramBot = require('node-telegram-bot-api');
const getFlagEmoji = require('./helpers/getFlagEmoji.js');

const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

const leagues = [];
const state = {};

getAllLeagues().then((data) => handleLeagues(data));

async function getAllLeagues() {
  const response = await axios.get(
    'https://v3.football.api-sports.io/leagues',
    {
      headers: {
        'x-apisports-key': process.env.API_SPORTS_API_KEY,
      },
    },
  );
  return response.data.response.slice(0, 10);
}

function handleLeagues(data) {
  data.forEach((el) => {
    leagues.push({
      id: el.league.id,
      name: el.league.name,
      country: el.country.name,
      countryFlag:
        el.country.name === 'World'
          ? emoji.emojify(':earth_americas:')
          : getFlagEmoji(el.country.code),
      firstYear: el.seasons[0].year,
      lastYear: el.seasons[el.seasons.length - 1].year,
    });
  });
}

function sendLeaguesButtons(chatId) {
  const inline_keyboard = leagues.map((el) => [
    {
      text: `${el.name}, ${el.countryFlag}`,
      callback_data: `league_${el.id}_${el.name}`,
    },
  ]);

  bot.sendMessage(chatId, 'Для того, щоб знайти матч, оберіть спершу лігу', {
    reply_markup: {
      inline_keyboard,
    },
  });
}

function sendSeasonButtons(chatId) {
  const league = leagues.find((el) => el.id == state[chatId].league);

  const inline_keyboard = [];
  for (let i = league.firstYear; i <= league.lastYear; i++) {
    inline_keyboard.push([{ text: i, callback_data: `season_${i}` }]);
  }

  bot.sendMessage(chatId, 'Тепер оберіть сезон', {
    reply_markup: {
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
  const chatId = query.message.chat.id;
  const data = query.data.split('_');

  if (data[0] === 'league') {
    const leagueId = data[1];
    const leagueName = data[2];

    state[chatId] = { league: leagueId };

    bot.sendMessage(chatId, `Ви обрали лігу: ${leagueName}`);
    sendSeasonButtons(chatId);
  } else if (data[0] === 'season') {
    const season = data[1];

    bot.sendMessage(chatId, `Ви обрали сезон: ${season}`);
  }
});

bot.on('message', (msg) => {
  bot.sendMessage(msg.chat.id, msg.text);
});
