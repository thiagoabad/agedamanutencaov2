var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true });

var equips = new mongoose.Schema({
    tipo: String,
    nome: String,
    datamanut: Date,
    datault: Date
}, { collection: 'agendamanut' }
);

module.exports = { Mongoose: mongoose, Equips: equips };
