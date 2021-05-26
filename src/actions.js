const { startKill, participateKill, completeKill } = require('./kill-boss')
const { scoutStart, scoutContinue, scoutStop } = require('./scout-boss')
const { register } = require('./registration')

const startsWith = test => content => content.startsWith(test)
const equals = test => content => content === test

module.exports = [{
  test: startsWith('!scout start'),
  name: '!scout start',
  execute: scoutStart
}, {
  test: startsWith('!scout continue'),
  name: '!scout continue',
  execute: scoutContinue
}, {
  test: startsWith('!scout stop'),
  name: '!scout stop',
  execute: scoutStop
}, {
  test: startsWith('!register'),
  name: '!register',
  execute: register
}, {
  test: equals('!kill start'),
  name: '!kill start',
  execute: startKill
}, {
  test: startsWith('!kill participate'),
  name: '!kill participate',
  execute: participateKill
}, {
  test: equals('!kill complete'),
  name: '!kill complete',
  execute: completeKill
}, {
  test: equals('!ping'),
  name: '!ping',
  execute: message => message.reply('Hello!')
}]
