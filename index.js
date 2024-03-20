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

function createInlineKeyboardTeamsArray(teams, columns, teamOrder) {
  let result = [];
  for (let i = 0; i < teams.length; i = i + columns) {
    let column = [];
    for (let j = 0; j < columns; j++) {
      i + j < teams.length &&
        column.push({
          text: teams[i + j].team.name,
          callback_data: `team${teamOrder}_${teams[i + j].team.id}_${
            teams[i + j].team.name
          }`,
        });
    }
    result.push(column);
  }
  return result;
}

function createCustomInlineKeyboard(teams, teamOrder) {
  let inline_keyboard = [];
  const teamsNumber = teams.length;

  if (teamsNumber > 10) {
    if (teamsNumber % 5 == 0 || teamsNumber % 4 == 0) {
      inline_keyboard = createInlineKeyboardTeamsArray(teams, 4, teamOrder);
      // } else if (teamsNumber % 4 == 0) {
      //   inline_keyboard = createInlineKeyboardTeamsArray(teams, 4);
    } else if (teamsNumber % 3 == 0) {
      inline_keyboard = createInlineKeyboardTeamsArray(teams, 3, teamOrder);
    } else {
      if (teamsNumber < 40) {
        inline_keyboard = createInlineKeyboardTeamsArray(teams, 3, teamOrder);
      } else {
        inline_keyboard = createInlineKeyboardTeamsArray(teams, 5, teamOrder);
      }
    }
  } else {
    inline_keyboard = teams.map((el) => [
      {
        text: el.team.name,
        callback_data: `team${teamOrder}_${el.team.id}_${el.team.name}`,
      },
    ]);
  }
  return inline_keyboard;
}

function sendTeamsButton(chatId, teams, messageText, teamOrder) {
  const inline_keyboard = createCustomInlineKeyboard(teams, teamOrder);
  bot.sendMessage(chatId, messageText, {
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
    state[chatId].leagueName = leagueName;

    bot.sendMessage(chatId, `Ви обрали лігу: ${leagueName}`);
    sendSeasonButtons(chatId);
  } else if (data[0] === 'season') {
    const season = data[1];
    state[chatId].season = season;

    bot.sendMessage(chatId, `Ви обрали сезон: ${season}`);
    teams = await getAllTeams(state[chatId].league, season);
    sendTeamsButton(chatId, teams, 'Оберіть першу команду', 1);
  } else if (data[0] === 'team1') {
    const team1Id = data[1];
    const team1Name = data[2];
    state[chatId].team1 = team1Id;
    state[chatId].team1Name = team1Name;

    // bot.sendMessage(chatId, `Ви обрали першу команду: {}`);
    sendTeamsButton(chatId, teams, 'Оберіть другу команду', 2);
  } else if (data[0] === 'team2') {
    const team2Id = data[1];
    const team2Name = data[2];
    state[chatId].team2 = team2Id;
    state[chatId].team2Name = team2Name;

    bot.sendMessage(
      chatId,
      `Ви обрали: \nЛіга: ${state[chatId].leagueName}\nСезон: ${state[chatId].season}\nПерша команда: ${state[chatId].team1Name}\nДруга команда: ${state[chatId].team2Name}\n\nЗнайти матч?`,
      {
        reply_markup: {
          keyboard: [[{ text: 'Знайти матч!' }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      },
    );
  }
});

bot.on('message', (msg) => {
  bot.sendMessage(msg.chat.id, msg.text);
});
