const express = require('express');
const passport = require('passport');
const Account = require('../models/account');
const router = express.Router();
const db = require("../infra/db");

router.get('/', (req, res) => {
    res.render('index', { user : req.user });
});

router.get('/register', (req, res) => {
    res.render('register', { });
});

router.post('/register', (req, res, next) => {
    Account.register(new Account({ username : req.body.username }), req.body.password, (err, account) => {
        if (err) {
          return res.render('register', { error : err.message });
        }

        passport.authenticate('local')(req, res, () => {
            req.session.save((err) => {
                if (err) {
                    return next(err);
                }
                res.redirect('/inicial');
            });
        });
    });
});


router.get('/login', (req, res) => {
    res.render('login', { user : req.user, error : req.flash('error')});
});

router.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), (req, res, next) => {
    req.session.save((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/inicial');
    });
});

router.get('/logout', (req, res, next) => {
    req.logout();
    req.session.save((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

router.get('/ping', (req, res) => {
    res.status(200).send("pong!");
});

router.get('/inicial',
  function(req, res, next) {
    var Equips1 = db.Mongoose.model('equips', db.Equips);
    Equips1.find({datamanut : {$lte: new Date()}}).lean().exec(function(err, results) {
      if (err) {
        res.redirect('/errors');
      } else {
        req.equipamentos1 = results;
        return next();
      };
    });
  },
  function(req, res, next) {
    var Equips2 = db.Mongoose.model('equips', db.Equips);
    Equips2.find({datamanut : {$lt: new Date(new Date().setDate(new Date().getDate()+30)), $gt: new Date()}}).lean().exec(function(err, results) {
      if (err) {
        res.redirect('/errors');
      } else {
        req.equipamentos2 = results;
        return next();
      };
    });
  },
  function(req, res) {
  //cria uma identificação única para a sessão
  res.render('inicial',{
      user : req.user,
      equipamentos1: req.equipamentos1,
      equipamentos2: req.equipamentos2});
  }
);

var listaEquipamentos = function(req, res, next) {

    var Equips = db.Mongoose.model('equips', db.Equips);

    Equips.find({}).lean().exec(function(err, results) {
        if(err) {
            return next(err);
        }
        res.format({
            html: function() {
                res.render('lista', {user : req.user, equipamentos:results});
            },
            json: function() {
                res.json(results);
            }
        });
    });
}

router.get('/equipamentos', listaEquipamentos);

router.get('/equipamentos/json', function(req, res) {
    var connection = app.infra.connectionFactory();
    var equipamentosDAO = new app.infra.EquipamentosDAO(connection);

    equipamentosDAO.lista(function(err, results) {
        res.json(results);
    });

    connection.end();
});

router.get('/equipamentos/form', function(req, res) {
    res.render('form', {user : req.user, errosValidacao:{}, equipamentos:{}});
});

router.post('/equipamentos/form', function(req, res) {
  var Equips = db.Mongoose.model('equips', db.Equips);
  Equips.findById( req.body.id ).lean().exec(function(err, results) {
        res.render('form', {user : req.user, errosValidacao:{}, equipamentos:results});
    });
});

router.post('/equipamentos/form/remove', function(req, res) {
  var Equips = db.Mongoose.model('equips', db.Equips);
  Equips.deleteOne( {_id : req.body.id }, function(err) {
    if (err) {
      res.redirect('/errors');
    } else {
      res.redirect('/equipamentos');
    }
  });
});

router.post('/equipamentos', function(req, res) {
    var equipamento = req.body;
    req.assert('nome', 'Nome é obrigatório').notEmpty();

    var erros = req.validationErrors();
    if(erros) {
        res.format({
            html: function() {
                res.status(400).render('sform', {errosValidacao:erros, equipamentos:equipamento});
            },
            json: function() {
                res.status(400).json(erros);
            }
        });

        return;
    }

    arrayDtmanut = equipamento.datamanut.split('/');
    arrayDtult = equipamento.datault.split('/');
    var Equips = db.Mongoose.model('equips', db.Equips);

    //verificar se é uma edição ou um novo registro (salvamento)
    if (equipamento.tipo == 'salvar') {
      delete equipamento.tipo;
      delete equipamento.id;
      equipamento.datamanut = new Date(arrayDtmanut[2], arrayDtmanut[1]-1, arrayDtmanut[0]);
      equipamento.datault = new Date(arrayDtult[2], arrayDtult[1]-1, arrayDtult[0]);
      Equips.create(equipamento, function(err, results) {
        if (err) {
          res.redirect('/errors');
        } else {
          res.redirect('/equipamentos');
        };
      });
    } else {
      query = "{_id : ObjectId('" + equipamento.id  + "')}"
      Equips.findById(equipamento.id, function (err, results){
        if (err != null) {
            res.redirect('/errors');
        } else {
          results.nome = equipamento.nome;
          results.datamanut.setDate(arrayDtmanut[0]);
          results.datamanut.setMonth(arrayDtmanut[1]-1);
          results.datamanut.setYear(arrayDtmanut[2]);
          results.datault.setDate(arrayDtult[0]);
          results.datault.setMonth(arrayDtult[1]-1);
          results.datault.setYear(arrayDtult[2]);
          results.markModified('datamanut');
          results.markModified('datault');
          results.save();
          res.redirect('/equipamentos');
        }
      });
    }

    //connection.end();
});

module.exports = router;
