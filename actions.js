const GUILD_ROLES = require('./GUILDS.js')
const ALL_GUILD_ROLE_IDS = GUILD_ROLES.map(guild => guild.id)

const startsWith = test => content => content.startsWith(test)

const registration = async (client, message) => {
  const { author, guild, content } = message

  const requested = content.split(/\s+/)[1].toLowerCase()
  const member = await guild.members.fetch(author.id)

  const chosenRole = GUILD_ROLES.find(guild => guild.name.toLowerCase() === requested)

  if (!chosenRole) {
    throw new Error('No guild matching name!')
  }

  // remove all guild roles
  await member.roles.remove(ALL_GUILD_ROLE_IDS)

  // assign new role
  await member.roles.add(chosenRole.id)

  // assign nickname
  const nickname = `<${chosenRole.name}> ${author.username}`
  await member.setNickname(nickname)

  message.reply([
    `You've been added to **${chosenRole.name}** guild.`,
    `Your nickname has been updated to **${nickname}**. You can edit this, but **do not remove <GUILD> prefix!**`,
    'You have been removed from all other coalition guild roles.'
  ].join('\n\n'))
}

const scouter = async (client, message) => {
  const { content, guild, author, channel } = message

  const split = content.split(/\s+/)
  const action = split[1]
  const toon = split[2]

  if (toon === undefined) {
    throw new Error('Need toon name!')
  }

  const timestamp = (new Date(message.createdTimestamp)).toUTCString()

  const member = await guild.members.fetch(author.id)

  // look at member.roles to look for guild roles

  console.log(timestamp)
  console.log([
    `Action: ${action}`,
    `Timestamp: ${timestamp}`,
    `Guild / Scout: ${member.nickname}`,
    `Channel Name: ${channel.name}`,
    `Toon Name: ${toon}`,
    `Content: ${content}`
  ].join('\n'))

  message.reply(`Recorded **${toon}** scouting **${action}** for **${channel.name}** at ${timestamp}`)
}

module.exports = [{
  test: startsWith('!scout start'),
  name: '!scout start',
  execute: scouter
}, {
  test: startsWith('!scout stop'),
  name: '!scout stop',
  execute: scouter
}, {
  test: startsWith('!register'),
  name: '!register',
  execute: registration
}]
