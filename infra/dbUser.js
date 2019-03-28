var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true }, { useMongoClient: true });

var Users = new mongoose.Schema({
    user: String,
    pass: String,
}, { collection: 'users' }
);

module.exports = { Mongoose: mongoose, Users: Users };
