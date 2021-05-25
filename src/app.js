const Discord = require('discord.js')
const { google } = require('googleapis')

const actions = require('./actions')

require('dotenv').config()

const client = new Discord.Client()

google.options({
  // All requests made with this object will use these settings unless overridden.
  timeout: 1000,
  auth: new google.auth.GoogleAuth({
    keyFile: 'secret.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })
})

client.login(process.env.DISCORD_TOKEN)

client.on('ready', () => {
  console.log('Bot is ready')
})

client.on('message', async message => {
  // TODO add channel restrictions
  for (const action of actions) {
    if (action.test(message.content)) {
      try {
        await action.execute(message)
      } catch (err) {
        console.error(err)
        message.member.send(`Invalid command for ${action.name}`)
      }
    }
  }
})
