module.exports = {
  dateFromTimestamp: timestamp => (new Date(timestamp)).toLocaleString('en').replace(',', '')
}
