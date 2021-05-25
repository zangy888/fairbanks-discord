const Discord = require('discord.js')
const actions = require('./actions')
require('dotenv').config()

const client = new Discord.Client()

client.login(process.env.DISCORD_TOKEN)

client.on('ready', () => {
  console.log('Bot is ready')
})

client.on('message', async message => {
  // TODO add channel restrictions
  for (const action of actions) {
    if (action.test(message.content)) {
      try {
        await action.execute(client, message)
      } catch (err) {
        console.error(err)
        message.member.send(`Invalid command for ${action.name}`)
      }
    }
  }
})
