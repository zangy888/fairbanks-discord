const { dateFromTimestamp } = require('./utils')

const SCOUT_UPDATE_TIMEOUT_SECONDS = 60 * 60 * 1000 // 1 hour

const scouter = async (message) => {
  const { content, guild, author, channel } = message

  const split = content.split(/\s+/)
  const action = split[1]
  const toon = split[2]

  if (toon === undefined) {
    throw new Error('Need toon name!')
  }

  const date = dateFromTimestamp(message.createdTimestamp)

  const member = await guild.members.fetch(author.id)

  // look at member.roles to look for guild roles

  console.log([
    `Action: ${action}`,
    `Date: ${date}`,
    `Guild / Scout: ${member.nickname}`,
    `Channel Name: ${channel.name}`,
    `Toon Name: ${toon}`,
    `Content: ${content}`
  ].join('\n'))

  message.reply(`Recorded **${toon}** scouting **${action}** for **${channel.name}** at ${date}`)
}