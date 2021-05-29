// The order of these entries must reflect the order of columns in the spreadsheet
const GUILDS = [
  { name: 'Phoenix', roleId: '845903390960779284', column: 'D' },
  { name: 'LPB', roleId: '845906478425440286', column: 'E' },
  { name: 'NWFS', roleId: '845908959642648648', column: 'F' },
  { name: 'CL', roleId: '847220677550931999', column: 'G' }
]

const ALL_GUILD_ROLE_IDS = GUILDS.map(guild => guild.roleId)

const findGuild = input => {
  input = input.toLowerCase()
  return GUILDS.find(guild => guild.name.toLowerCase() === input)
}

module.exports = {
  GUILDS,
  ALL_GUILD_ROLE_IDS,
  findGuild
}
