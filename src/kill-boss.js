const { google } = require('googleapis')
const { dateFromTimestamp } = require('./utils')
const { GUILDS, findGuild } = require('./guilds')

const sheets = google.sheets('v4')

const BOSSES = new Map()

const BOSS_KILL_TIMEOUT_SECONDS = 60 * 60 * 1000 // 1 hour

const addKill = async (boss) => {
  console.log(`Logging kill completed for ${boss.name} to sheets`)

  const request = {
    spreadsheetId: '1G4E9RhKZteUUh0G_pl-ti64ZwqJAvgexGOpzI0BKqAA',
    // Values are appended after the last row of the table beginning at A1
    range: "'Kill Logs'!A1:A1",
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    // Body to be appended
    resource: {
      majorDimension: 'ROWS',
      values: [
        [
          boss.name,
          boss.timestamp,
          boss.diedAt,
          ...(GUILDS.map(({ name }) => (boss.participants.get(name) || null)))
        ]
      ]
    }
  }

  return sheets.spreadsheets.values.append(request)
}

const completeKillHelper = async (name) => {
  const boss = BOSSES.get(name)

  if (boss == null) {
    return false
  }

  // clean up any timers
  clearTimeout(boss.timeoutId)

  // remove the boss from the active stack
  BOSSES.delete(name)

  await addKill(boss)

  return true
}

const startKill = async (message) => {
  const name = message.channel.name
  const timestamp = message.createdTimestamp

  const newBoss = {
    timeoutId: null,
    name,
    timestamp,
    diedAt: dateFromTimestamp(timestamp),
    participants: new Map()
  }

  const oldBoss = BOSSES.get(name)

  BOSSES.set(name, newBoss)

  newBoss.timeoutId = setTimeout(() => {
    completeKillHelper(name)
  }, BOSS_KILL_TIMEOUT_SECONDS)

  const reply = [
    `Killed **${name}** at ${newBoss.diedAt}.`,
    oldBoss ? `An incomplete kill for **${name}** from ${oldBoss.diedAt} was discarded.` : '',
    'Please add participants by using the command `!kill participate <guild-name> <number>`.'
  ]
    .filter(a => a.length > 0) // remove empty lines
    .join('\n\n')

  message.reply(reply)
}

const participateKill = async (message) => {
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

const completeKill = async (message) => {
  const name = message.channel.name
  const completed = await completeKillHelper(name)

  if (completed) {
    message.reply(`Completed kill for **${name}** and recorded to spreadsheet.`)
  } else {
    message.reply(`No kill to complete for **${name}**. It may have been completed automatically (1 hour timeout), or you may need to start a kill with \`!kill start\``)
  }
}

module.exports = {
  startKill,
  participateKill,
  completeKill
}
