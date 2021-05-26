const { ALL_GUILD_ROLE_IDS, findGuild } = require('./guilds')

module.exports = async (message) => {
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
  await member.roles.add(chosenRole.roleId)

  // assign nickname
  const nickname = `<${chosenRole.name}> ${author.username}`
  await member.setNickname(nickname)

  message.reply([
    `You've been added to **${chosenRole.name}** guild.`,
    `Your nickname has been updated to **${nickname}**. You can edit this, but **do not remove <GUILD> prefix!**`,
    'You have been removed from all other coalition guild roles.'
  ].join('\n\n'))
}
