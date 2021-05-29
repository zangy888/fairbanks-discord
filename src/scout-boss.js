const { dateFromTimestamp, createAsyncQueue } = require('./utils')
const ValidationError = require('./validation-error')
const { google } = require('googleapis')

const { ALL_GUILD_ROLE_IDS } = require('./guilds')
const { readfirst } = require('./channels')

const sheets = google.sheets('v4')

const SCOUT_UPDATE_POLL_MS = 10 * 60 * 1000 // 10 minutes
const SCOUT_UPDATE_TIMEOUT_MS = 60 * 60 * 1000 // 1 hour

const asyncQueue = createAsyncQueue()

const getActiveScouts = async () => {
  const request = {
    spreadsheetId: '1G4E9RhKZteUUh0G_pl-ti64ZwqJAvgexGOpzI0BKqAA',
    range: "'Active Scouting'!A2:H1000",
    majorDimension: 'ROWS'
  }

  const scouts = (await sheets.spreadsheets.values.get(request)).data.values

  if (scouts == null) {
    return []
  }

  return scouts.map(data => {
    return {
      channelName: data[0],
      guildName: data[1],
      userName: data[2],
      toonName: data[3],
      createdTimestamp: parseInt(data[4], 10),
      createdAt: data[5],
      updatedTimestamp: parseInt(data[6], 10),
      updatedAt: data[7]
    }
  })
}

const addActiveScout = async (scout) => {
  const request = {
    spreadsheetId: '1G4E9RhKZteUUh0G_pl-ti64ZwqJAvgexGOpzI0BKqAA',
    // Values are appended after the last row of the table beginning at A1
    range: "'Active Scouting'!A1:A1",
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    // Body to be appended
    resource: {
      majorDimension: 'ROWS',
      values: [
        [
          scout.channelName,
          scout.guildName,
          scout.userName,
          scout.toonName,
          scout.createdTimestamp,
          scout.createdAt,
          scout.createdTimestamp, // updatedTimestamp value is createdTimestamp
          scout.createdAt // updatedAt value is createdAt
        ]
      ]
    }
  }

  return sheets.spreadsheets.values.append(request)
}

const updateActiveScout = async (index, updatedTimestamp, updatedAt) => {
  const request = {
    spreadsheetId: '1G4E9RhKZteUUh0G_pl-ti64ZwqJAvgexGOpzI0BKqAA',
    // Values are appended after the last row of the table beginning at A1
    range: `'Active Scouting'!G${index + 2}:H${index + 2}`,
    valueInputOption: 'USER_ENTERED',
    // Body to be updated
    resource: {
      majorDimension: 'ROWS',
      values: [[updatedTimestamp, updatedAt]]
    }
  }

  return sheets.spreadsheets.values.update(request)
}

const updateAllActiveScouts = async (scouts) => {
  const clearRequest = {
    spreadsheetId: '1G4E9RhKZteUUh0G_pl-ti64ZwqJAvgexGOpzI0BKqAA',
    range: "'Active Scouting'!A2:H1000",
    resource: {}
  }

  await sheets.spreadsheets.values.clear(clearRequest)

  const updateRequest = {
    spreadsheetId: '1G4E9RhKZteUUh0G_pl-ti64ZwqJAvgexGOpzI0BKqAA',
    range: "'Active Scouting'!A2:H1000",
    valueInputOption: 'USER_ENTERED',
    // Body to be updated
    resource: {
      majorDimension: 'ROWS',
      values: scouts.map(scout => {
        return [
          scout.channelName,
          scout.guildName,
          scout.userName,
          scout.toonName,
          scout.createdTimestamp,
          scout.createdAt,
          scout.updatedTimestamp,
          scout.updatedAt
        ]
      })
    }
  }

  return sheets.spreadsheets.values.update(updateRequest)
}

const addCompletedScout = async (completed) => {
  const request = {
    spreadsheetId: '1G4E9RhKZteUUh0G_pl-ti64ZwqJAvgexGOpzI0BKqAA',
    // Values are appended after the last row of the table beginning at A1
    range: "'Scouting Logs'!A1:A1",
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    // Body to be appended
    resource: {
      majorDimension: 'ROWS',
      values: [
        [
          completed.channelName,
          completed.guildName,
          completed.userName,
          completed.toonName,
          completed.duration,
          completed.createdAt,
          completed.stoppedAt
        ]
      ]
    }
  }

  return sheets.spreadsheets.values.append(request)
}

const deriveScoutInformation = async (message) => {
  const { content, guild, author, channel } = message

  const toonName = content.split(/\s+/)[2]

  if (toonName == null) {
    throw new ValidationError('`!scout` commands should have a toon name')
  }

  const member = await guild.members.fetch(author.id)

  const guildRole = member.roles.cache.find(role => ALL_GUILD_ROLE_IDS.includes(role.id))

  if (guildRole == null) {
    throw new ValidationError(`No guild role found. See ${readfirst} and try \`!register\``)
  }

  return {
    toonName,
    userName: author.username,
    guildName: guildRole.name,
    channelName: channel.name
  }
}

const scoutStopHelper = async ({ userName, toonName, channelName }) => {
  const activeScouts = await asyncQueue(getActiveScouts)

  const existingScout = activeScouts.find(scout => {
    return scout.userName === userName && scout.toonName === toonName
  })

  if (existingScout == null) {
    throw new ValidationError(`No scouting session found for user. See ${readfirst} and try \`!scout start\``)
  }

  if (existingScout.channelName !== channelName) {
    throw new ValidationError(`Scouting session started for a different boss. Please check #${existingScout.channelName}`)
  }

  const endTimestamp = Date.now()

  const otherScouts = activeScouts.filter(scout => scout !== existingScout)

  await asyncQueue(updateAllActiveScouts.bind(null, otherScouts))

  const result = {
    ...existingScout,
    duration: (endTimestamp - existingScout.createdTimestamp) / 60000,
    stoppedAt: dateFromTimestamp(endTimestamp)
  }

  await asyncQueue(addCompletedScout.bind(null, result))

  return result
}

const scoutTimer = async () => {
  setTimeout(scoutTimer, SCOUT_UPDATE_POLL_MS)

  const activeScouts = await asyncQueue(getActiveScouts)

  const currentTimestamp = Date.now()

  for (const activeScout of activeScouts) {
    const timeSinceUpdate = currentTimestamp - activeScout.updatedTimestamp
    if (timeSinceUpdate > SCOUT_UPDATE_TIMEOUT_MS) {
      await scoutStopHelper(activeScout)
    }
  }
}

const scoutStart = async (message) => {
  const { userName, toonName, guildName, channelName } = await deriveScoutInformation(message)
  const activeScouts = await asyncQueue(getActiveScouts)

  const existingScout = activeScouts.find(scout => {
    return scout.userName === userName && scout.toonName === toonName
  })

  if (existingScout != null) {
    throw new ValidationError(`Must stop a scouting session before starting a new scouting session. See ${readfirst} and try \`!scout stop\``)
  }

  const { createdTimestamp } = message

  const newScout = {
    channelName,
    userName,
    guildName,
    toonName,
    createdTimestamp,
    createdAt: dateFromTimestamp(createdTimestamp)
  }

  await asyncQueue(addActiveScout.bind(null, newScout))

  message.reply(`**Starting** to scout with **${toonName}** in **${channelName}** at ${newScout.createdAt}`)
}

const scoutContinue = async (message) => {
  const { userName, toonName, channelName } = await deriveScoutInformation(message)

  const activeScouts = await asyncQueue(getActiveScouts)

  const existingScoutIndex = activeScouts.findIndex(scout => {
    return scout.userName === userName && scout.toonName === toonName
  })

  if (existingScoutIndex === -1) {
    throw new ValidationError(`No scouting session found for user. See ${readfirst} and try \`!scout start\``)
  }

  const existingScout = activeScouts[existingScoutIndex]

  if (existingScout.channelName !== channelName) {
    throw new ValidationError(`Scouting session started for a different boss. Please check #${existingScout.channelName}`)
  }

  const updatedTimestamp = message.createdTimestamp
  const updatedAt = dateFromTimestamp(updatedTimestamp)

  await asyncQueue(updateActiveScout.bind(null, existingScoutIndex, updatedTimestamp, updatedAt))

  message.reply(`**Continuing** to scout with **${toonName}** in **${channelName}** at ${updatedAt}`)
}

const scoutStop = async (message) => {
  const { userName, toonName, channelName } = await deriveScoutInformation(message)

  const result = await scoutStopHelper({ userName, toonName, channelName })

  message.reply(`**Stopped** scout with **${toonName}** in **${channelName}**.\n Scouted for a total of ${result.duration} minutes. Thank you!`)
}

module.exports = {
  scoutStart,
  scoutContinue,
  scoutStop,
  scoutTimer
}
