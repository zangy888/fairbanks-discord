const GUILD_ROLES = require('./GUILDS')
const { logKill } = require('./google')

const ALL_GUILD_ROLE_IDS = GUILD_ROLES.map(guild => guild.id)

const startsWith = test => content => content.startsWith(test)

const findGuild = input => {
  input = input.toLowerCase()
  return GUILD_ROLES.find(guild => guild.name.toLowerCase() === input)
}

const registration = async (client, message) => {
  const { author, guild, content } = message

  const requested = content.split(/\s+/)[1]
  const member = await guild.members.fetch(author.id)

  const chosenRole = findGuild(requested)

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

const timestampFromMessage = message => (new Date(message.createdTimestamp)).toUTCString()

const scouter = async (client, message) => {
  const { content, guild, author, channel } = message

  const split = content.split(/\s+/)
  const action = split[1]
  const toon = split[2]

  if (toon === undefined) {
    throw new Error('Need toon name!')
  }

  const timestamp = timestampFromMessage(message)

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

const BOSSES = new Map()

const BOSS_KILL_TIMEOUT = 4000 // 60 * 60 * 1000 // 1 hour

const completeKillHelper = async (googleAuth, name) => {
  const boss = BOSSES.get(name)

  if (boss == null) {
    return false
  }

  // clean up any timers
  clearTimeout(boss.timeoutId)

  // remove the boss from the active stack
  BOSSES.delete(name)

  await logKill(googleAuth, boss)

  return true
}

const startKill = async (client, message, googleAuth) => {
  const name = message.channel.name

  const newBoss = {
    timeoutId: null,
    name,
    diedAt: timestampFromMessage(message),
    participants: new Map()
  }

  const oldBoss = BOSSES.get(name)

  BOSSES.set(name, newBoss)

  newBoss.timeoutId = setTimeout(() => {
    completeKillHelper(googleAuth, name)
  }, BOSS_KILL_TIMEOUT)

  const reply = [
    `Killed **${name}** at ${newBoss.diedAt}.`,
    oldBoss ? `An incomplete kill for **${name}** from ${oldBoss.diedAt} was discarded.` : '',
    'Please add participants by using the command `!kill participate <guild-name> <number>`.'
  ]
    .filter(a => a.length > 0) // remove empty lines
    .join('\n\n')

  message.reply(reply)
}

const participateKill = async (client, message) => {
  const name = message.channel.name

  const boss = BOSSES.get(name)

  if (boss == null) {
    message.reply(`No kill started for ${name}. Please start kill with \`!kill start\``)
    return
  }

  const { participants } = boss

  const parsed = message.content.split(/\s+/)
  const participantGuild = findGuild(parsed[2])
  const participantCount = parseInt(parsed[3], 10)

  if (participantGuild == null) {
    throw new Error('Invalid guild name')
  }

  if (participantCount == null) {
    throw new Error('Invalid number of participants')
  }

  participants.set(participantGuild.name, participantCount)

  const rolls = []

  let counter = 0

  for (const guildName of participants.keys()) {
    const participantCount = participants.get(guildName)
    rolls.push({ guildName, start: counter + 1, stop: counter + participantCount })
    counter += participantCount
  }

  const reply = [
    `Set ${participantCount} participants for ${participantGuild.name}.`,
    rolls.map(({ guildName, start, stop }) => `For **${guildName}**, roll **${start} to ${stop}**.`).join('\n')
  ].join('\n\n')

  message.reply(reply)
}

const completeKill = async (client, message, googleAuth) => {
  const name = message.channel.name
  const completed = await completeKillHelper(googleAuth, name)

  if (completed) {
    message.reply(`Completed kill for **${name}** and recorded to spreadsheet.`)
  } else {
    message.reply(`No kill to complete for **${name}**. It may have been completed automatically (1 hour timeout), or you may need to start a kill with \`!kill start\``)
  }
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
}, {
  test: startsWith('!kill start'),
  name: '!kill start',
  execute: startKill
}, {
  test: startsWith('!kill participate'),
  name: '!kill guild',
  execute: participateKill
}, {
  test: startsWith('!kill complete'),
  name: '!kill complete',
  execute: completeKill
}]
