// The order of these entries must reflect the order of columns in the spreadsheet
const GUILDS = [
  { name: 'Phoenix', roleId: '845903390960779284', column: 'D' },
  { name: 'NWFS', roleId: '845908959642648648', column: 'E' },
  { name: 'CL', roleId: '847220677550931999', column: 'F' },
  { name: 'Special', roleId: '858159164542418954', column: 'G' },
  { name: 'PT', roleId: '858192014499643412', column: 'H' },
  { name: 'Sir', roleId: '858192979399016458', column: 'I' }
]

const ALL_GUILD_ROLE_IDS = GUILDS.map(guild => guild.roleId)

const findGuild = input => {
  if (input == null) {
    return null
  }

  input = input.toLowerCase()
  return GUILDS.find(guild => guild.name.toLowerCase() === input)
}

module.exports = {
  GUILDS,
  ALL_GUILD_ROLE_IDS,
  findGuild
}
