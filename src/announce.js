const ValidationError = require('./validation-error')

const announce = async (message) => {
  const { content, channel } = message

  const toonName = content.split(/\s+/)[1]

  if (toonName == null) {
    throw new ValidationError('Need a toon name. Try `!up toon`')
  }

  let boss = channel.name.split('-')[1]
  boss = boss.charAt(0).toUpperCase() + boss.substring(1)

  channel.send([
    `@everyone !! **${boss}** has spawned !!`,
    `Whisper **${toonName}** the password to join the raid.`,
    'See #read-first for password.'
  ].join('\n'))
}

module.exports = { announce }
