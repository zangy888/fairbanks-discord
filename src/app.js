const Discord = require('discord.js')
const { google } = require('googleapis')

const actions = require('./actions')

require('dotenv').config()

const client = new Discord.Client()

const TEST_CHANNEL = 'bot-development'

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
  for (const action of actions) {
    const { content, channel } = message
    const allowedAction = action.test(content)
    const channelName = channel.name

    const allowedChannel =
      channelName === TEST_CHANNEL ||
      action.channels == null ||
      action.channels.includes(channelName)

    if (allowedAction) {
      if (allowedChannel) {
        try {
          await action.execute(message)
        } catch (err) {
          console.error(err)
          message.member.send(`Invalid command for ${action.name}`)
        }
      } else {
        const validChannels = action.channels.map(channel => `#${channel}`).join(', ')
        message.member.send(`Cannot do \`${message.content}\` in this channel. Try ${validChannels}`)
      }
    }
  }
})
