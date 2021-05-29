const { startKill, participateKill, completeKill } = require('./kill-boss')
const { scoutStart, scoutContinue, scoutStop } = require('./scout-boss')
const { register } = require('./registration')
const { announce } = require('./announce')

const startsWith = test => content => content.startsWith(test)
const equals = test => content => content === test

module.exports = [{
  test: startsWith('!scout start'),
  channels: ['scout-kazzak', 'scout-doomwalker'],
  execute: scoutStart
}, {
  test: startsWith('!scout continue'),
  channels: ['scout-kazzak', 'scout-doomwalker'],
  execute: scoutContinue
}, {
  test: startsWith('!scout stop'),
  channels: ['scout-kazzak', 'scout-doomwalker'],
  execute: scoutStop
}, {
  test: startsWith('!register'),
  channels: ['general'],
  execute: register
}, {
  test: equals('!kill start'),
  channels: ['kill-kazzak', 'kill-doomwalker'],
  execute: startKill
}, {
  test: startsWith('!kill participate'),
  channels: ['kill-kazzak', 'kill-doomwalker'],
  execute: participateKill
}, {
  test: equals('!kill complete'),
  channels: ['kill-kazzak', 'kill-doomwalker'],
  execute: completeKill
}, {
  test: startsWith('!up'),
  channels: ['announce-kazzak', 'announce-doomwalker'],
  execute: announce
}, {
  test: equals('!ping'),
  execute: message => message.reply('Hello!')
}]
