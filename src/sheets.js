const { google } = require('googleapis')
const sheets = google.sheets('v4')
const GUILDS = require('./GUILDS')

module.exports = {
  logKill: async (boss) => {
    console.log(`Kill completed for ${boss.name}`)

    const request = {
    // The ID of the spreadsheet to update.
      spreadsheetId: '1G4E9RhKZteUUh0G_pl-ti64ZwqJAvgexGOpzI0BKqAA',

      // The A1 notation of a range to search for a logical table of data.
      // Values are appended after the last row of the table.
      range: "'Kill Logs'!A1:A1",

      // How the input data should be interpreted.
      valueInputOption: 'USER_ENTERED',

      // How the input data should be inserted.
      insertDataOption: 'INSERT_ROWS',

      resource: {
        majorDimension: 'COLUMNS',
        values: [
          [boss.name],
          [boss.timestamp],
          [boss.diedAt],
          ...(GUILDS.map(({ name }) => ([boss.participants.get(name) || null])))
        ]
      }
    }

    await sheets.spreadsheets.values.append(request)
  }
}
