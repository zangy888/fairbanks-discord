const { google } = require('googleapis')
const { dateFromTimestamp, createAsyncQueue } = require('./utils')

const ValidationError = require('./validation-error')
const { GUILDS, findGuild } = require('./guilds')
const { readfirst } = require('./channels')

const sheets = google.sheets('v4')

const KILL_COMPLETE_POLL_MS = 10 * 60 * 1000 // 10 minutes
const KILL_COMPLETE_TIMEOUT_MS = 60 * 60 * 1000 // 1 hour

const asyncQueue = createAsyncQueue()

const LAST_COLUMN = GUILDS[GUILDS.length - 1].column

const getActiveKills = async () => {
  const request = {
    spreadsheetId: '1G4E9RhKZteUUh0G_pl-ti64ZwqJAvgexGOpzI0BKqAA',
    range: `'Active Kills'!A2:${LAST_COLUMN}3`,
    majorDimension: 'ROWS'
  }

  const bosses = (await sheets.spreadsheets.values.get(request)).data.values

  if (bosses == null) {
    return []
  }

  return bosses.map(data => {
    return {
      channelName: data[0],
      timestamp: parseInt(data[1], 10),
      diedAt: data[2],
      ...(
        GUILDS.reduce((participation, guild, index) => {
          participation[guild.name] = parseInt(data[index + 3], 10) || 0
          return participation
        }, {})
      )
    }
  })
}

const addKill = async (boss, completed) => {
  if (completed == null) {
    throw new Error('Must specify whether the kill has been completed')
  }

  const request = {
    spreadsheetId: '1G4E9RhKZteUUh0G_pl-ti64ZwqJAvgexGOpzI0BKqAA',
    // Values are appended after the last row of the table beginning at A1
    range: `'${completed ? 'Kill Logs' : 'Active Kills'}'!A1:A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    // Body to be appended
    resource: {
      majorDimension: 'ROWS',
      values: [
        [
          boss.channelName,
          boss.timestamp,
          boss.diedAt,
          ...(GUILDS.map(({ name }) => (boss[name] || 0)))
        ]
      ]
    }
  }

  return sheets.spreadsheets.values.append(request)
}

const updateActiveKill = async (index, guildName, participantCount) => {
  const { column } = findGuild(guildName)
  const cell = `${column}${index + 2}`

  const request = {
    spreadsheetId: '1G4E9RhKZteUUh0G_pl-ti64ZwqJAvgexGOpzI0BKqAA',
    // Values are appended after the last row of the table beginning at A1
    range: `'Active Kills'!${cell}:H${cell}`,
    valueInputOption: 'USER_ENTERED',
    // Body to be updated
    resource: {
      majorDimension: 'ROWS',
      values: [[participantCount]]
    }
  }

  return sheets.spreadsheets.values.update(request)
}

const updateAllActiveKills = async (bosses) => {
  const clearRequest = {
    spreadsheetId: '1G4E9RhKZteUUh0G_pl-ti64ZwqJAvgexGOpzI0BKqAA',
    range: `'Active Kills'!A2:${LAST_COLUMN}3`,
    resource: {}
  }

  await sheets.spreadsheets.values.clear(clearRequest)

  const updateRequest = {
    spreadsheetId: '1G4E9RhKZteUUh0G_pl-ti64ZwqJAvgexGOpzI0BKqAA',
    range: `'Active Kills'!A2:${LAST_COLUMN}3`,
    valueInputOption: 'USER_ENTERED',
    // Body to be updated
    resource: {
      majorDimension: 'ROWS',
      values: bosses.map(boss => {
        return [
          boss.channelName,
          boss.timestamp,
          boss.diedAt,
          ...(GUILDS.map(({ name }) => (boss[name] || 0)))
        ]
      })
    }
  }

  return sheets.spreadsheets.values.update(updateRequest)
}

const completeKillHelper = async ({ channelName }) => {
  const activeKills = await asyncQueue(getActiveKills)

  const currentBoss = activeKills.find(boss => boss.channelName === channelName)

  if (currentBoss == null) {
    throw new ValidationError(`Cannot find a kill for ${channelName}. See ${readfirst} and try \`!kill start\``)
  }

  const otherBosses = activeKills.filter(other => other !== currentBoss)

  await asyncQueue(updateAllActiveKills.bind(null, otherBosses))

  await asyncQueue(addKill.bind(null, currentBoss, true))
}

const killTimer = async () => {
  setTimeout(killTimer, KILL_COMPLETE_POLL_MS)

  const activeKills = await asyncQueue(getActiveKills)

  const currentTimestamp = Date.now()

  for (const currentBoss of activeKills) {
    const timeSinceUpdate = currentTimestamp - currentBoss.timestamp
    if (timeSinceUpdate > KILL_COMPLETE_TIMEOUT_MS) {
      await completeKillHelper(currentBoss)
    }
  }
}

const startKill = async (message) => {
  const channelName = message.channel.name

  const activeKills = await asyncQueue(getActiveKills)

  const currentBoss = activeKills.find(boss => boss.channelName === channelName)

  if (currentBoss != null) {
    throw new ValidationError(`Found an ongoing kill for **${channelName}**. See ${readfirst} and try \`!kill participate\` or \`!kill complete\``)
  }

  const timestamp = message.createdTimestamp

  const newBoss = {
    channelName,
    timestamp,
    diedAt: dateFromTimestamp(timestamp)
  }

  await asyncQueue(addKill.bind(null, newBoss, false))

  message.reply([
    `Killed **${channelName}** at ${newBoss.diedAt}.`,
    `Please add participants by using the command \`!kill participate\` (see ${readfirst}).`
  ].join('\n'))
}

const participateKill = async (message) => {
  const channelName = message.channel.name

  const activeKills = await asyncQueue(getActiveKills)

  const currentBossIndex = activeKills.findIndex(boss => boss.channelName === channelName)

  if (currentBossIndex === -1) {
    throw new ValidationError(`Cannot find a kill for ${channelName}. See ${readfirst} and try \`!kill start\``)
  }

  const currentBoss = activeKills[currentBossIndex]
  const parsed = message.content.split(/\s+/)
  const participantGuild = findGuild(parsed[2])
  const participantCount = parseInt(parsed[3], 10)

  if (participantGuild == null) {
    throw new ValidationError(`Cannot find guild matching ${parsed[2]}`)
  }

  if (participantCount == null) {
    throw new ValidationError('Please provide the number of guild members who participate')
  }

  const participantGuildName = participantGuild.name

  currentBoss[participantGuildName] = participantCount

  await asyncQueue(updateActiveKill.bind(null, currentBossIndex, participantGuildName, participantCount))

  const rolls = []

  let counter = 0

  for (const guild of GUILDS) {
    const guildName = guild.name
    const participantCount = currentBoss[guildName]

    if (participantCount > 0) {
      rolls.push({ guildName, start: counter + 1, stop: counter + participantCount })
      counter += participantCount
    }
  }

  const reply = [
    `Set ${participantCount} participants for ${participantGuild.name}.`,
    ...rolls.map(({ guildName, start, stop }) => `For **${guildName}**, roll **${start} to ${stop}**.`)
  ].join('\n')

  message.reply(reply)
}

const completeKill = async (message) => {
  const channelName = message.channel.name
  await completeKillHelper({ channelName })
  message.reply(`Completed kill for **${channelName}** and recorded to spreadsheet.`)
}

module.exports = {
  startKill,
  participateKill,
  completeKill,
  killTimer
}
