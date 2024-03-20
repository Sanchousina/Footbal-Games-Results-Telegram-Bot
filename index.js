require('dotenv').config();
const axios = require('axios');
const emoji = require('node-emoji');
const TelegramBot = require('node-telegram-bot-api');
const getFlagEmoji = require('./helpers/getFlagEmoji.js');

const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

const leagues = [];
let teams = [];
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

async function getAllTeams(league, season) {
  const response = await axios.get('https://v3.football.api-sports.io/teams', {
    params: {
      league,
      season,
    },
    headers: {
      'x-apisports-key': process.env.API_SPORTS_API_KEY,
    },
  });
  return response.data.response;
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

function createInlineKeyboardTeamsArray(teams, columns) {
  let result = [];
  for (let i = 0; i < teams.length; i = i + columns) {
    let column = [];
    for (let j = 0; j < columns; j++) {
      i + j < teams.length &&
        column.push({
          text: teams[i + j].team.name,
          callback_data: `team1_${teams[i + j].team.id}`,
        });
      console.log(column);
    }
    result.push(column);
  }
  return result;
}

function createCustomInlineKeyboard(teams) {
  let inline_keyboard = [];
  const teamsNumber = teams.length;

  if (teamsNumber > 10) {
    if (teamsNumber % 5 == 0 || teamsNumber % 4 == 0) {
      inline_keyboard = createInlineKeyboardTeamsArray(teams, 4);
      // } else if (teamsNumber % 4 == 0) {
      //   inline_keyboard = createInlineKeyboardTeamsArray(teams, 4);
    } else if (teamsNumber % 3 == 0) {
      inline_keyboard = createInlineKeyboardTeamsArray(teams, 3);
    } else {
      if (teamsNumber < 40) {
        inline_keyboard = createInlineKeyboardTeamsArray(teams, 3);
      } else {
        inline_keyboard = createInlineKeyboardTeamsArray(teams, 5);
      }
    }
  } else {
    inline_keyboard = teams.map((el) => [
      { text: el.team.name, callback_data: `team1_${el.team.id}` },
    ]);
  }
  return inline_keyboard;
}

function sendTeamsButton(chatId, teams) {
  const inline_keyboard = createCustomInlineKeyboard(teams);
  bot.sendMessage(chatId, 'Оберіть першй команду', {
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

bot.on('callback_query', async (query) => {
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
    state[chatId].season = season;

    bot.sendMessage(chatId, `Ви обрали сезон: ${season}`);
    teams = await getAllTeams(state[chatId].league, season);
    sendTeamsButton(chatId, teams);
  }
});

bot.on('message', (msg) => {
  bot.sendMessage(msg.chat.id, msg.text);
});
