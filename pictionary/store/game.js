// Thin Mongo access boundary for Game documents. The discord adapter imports
// the model from here rather than models/ directly, so pictionary/discord is
// the only place doing Mongo reads/writes and pictionary/engine stays pure.
module.exports = require('../../models/pictionaryGameSchema');
