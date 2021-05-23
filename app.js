const Discord = require('discord.js');
require('dotenv').config();

const client = new Discord.Client();

client.login(process.env.BOT_TOKEN)

client.on('ready', () => {
  console.log('Bot is ready');
});

client.on('message', (msg) => {
  if (msg.content === 'Hello') msg.reply('Hi');
});