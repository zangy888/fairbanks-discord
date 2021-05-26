const { startKill, participateKill, completeKill } = require('./kill-boss')
const { scoutStart, scoutContinue, scoutStop } = require('./scout-boss')
const { register } = require('./registration')

const startsWith = test => content => content.startsWith(test)
const equals = test => content => content === test

module.exports = [{
  test: startsWith('!scout start'),
  name: '!scout start',
  channels: ['scout-kazzak', 'scout-doomwalker'],
  execute: scoutStart
}, {
  test: startsWith('!scout continue'),
  name: '!scout continue',
  channels: ['scout-kazzak', 'scout-doomwalker'],
  execute: scoutContinue
}, {
  test: startsWith('!scout stop'),
  name: '!scout stop',
  channels: ['scout-kazzak', 'scout-doomwalker'],
  execute: scoutStop
}, {
  test: startsWith('!register'),
  channels: ['general'],
  name: '!register',
  execute: register
}, {
  test: equals('!kill start'),
  name: '!kill start',
  channels: ['kill-kazzak', 'kill-doomwalker'],
  execute: startKill
}, {
  test: startsWith('!kill participate'),
  name: '!kill participate',
  channels: ['kill-kazzak', 'kill-doomwalker'],
  execute: participateKill
}, {
  test: equals('!kill complete'),
  name: '!kill complete',
  channels: ['kill-kazzak', 'kill-doomwalker'],
  execute: completeKill
}, {
  test: equals('!ping'),
  name: '!ping',
  execute: message => message.reply('Hello!')
}]
