const express = require('express');
const passport = require('passport');
const Account = require('../models/account');
const router = express.Router();
const db = require("../infra/db");
const nodemailer = require('nodemailer');

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
    //This if grants that some that enter here without login not get an error
    if (req.user){
      var user = req.user.username
    }
    var Equips1 = db.Mongoose.model('equips', db.Equips);
    Equips1.find({user: user, datamanut : {$lte: new Date()}}).lean().exec(function(err, results) {
      if (err) {
        res.redirect('/errors');
      } else {
        req.equipamentos1 = results;
        return next();
      };
    });
  },
  function(req, res, next) {
    //This if grants that some that enter here without login not get an error
    if (req.user){
      var user = req.user.username
    }
    var Equips2 = db.Mongoose.model('equips', db.Equips);
    Equips2.find({user: user, datamanut : {$lt: new Date(new Date().setDate(new Date().getDate()+30)), $gt: new Date()}}).lean().exec(function(err, results) {
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

    //This if grants that some that enter here without login not get an error
    if (req.user){
      var user = req.user.username
    }

    Equips.find({user : user}).lean().exec(function(err, results) {
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
                res.status(400).render('form', {errosValidacao:erros, equipamentos:equipamento});
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
});

router.get('/email', function(req, res, next){
      if (req.user){
        var user = req.user.username
      }
      var Equips = db.Mongoose.model('equips', db.Equips);
      Equips.find({user: user, datamanut : {$lt: new Date(new Date().setDate(new Date().getDate()+30))}}).lean().exec(function(err, results) {
          if(err) {
              return next(err);
          }
          if(results[0] == null){
            req.sendEmail = false;
          } else {
            req.sendEmail = true;
          }
          req.listaEquipamentos = results;
          next();
      });
  },function(req, res){
    if (req.user){
      var user = req.user.username
    }
    if (req.sendEmail) {
      const transporter = nodemailer.createTransport({
        host: "mail.phyti.com.br",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
    	     user: 'thiago@phyti.com.br',
    	      pass: "Senh@123"
          },
        tls: { rejectUnauthorized: false }
      });
      const mailOptions = {
        from: 'thiago@phyti.com.br',
        to: user,
        subject: 'Sistema de agenda de manutenção',
        text: 'Lista de nobreaks necessitando de manutenção',
        html: '<h1>Segue a lista de nobreaks necessitando de manutenção:</h1><table border="1px"><tr><th>Nome Do Equipamento</th><th>Data da próxima manutenção</th><th>Data da última manutenção</th></tr>'
      };
      equipamentos = req.listaEquipamentos
      for(var i=0; i<equipamentos.length; i++) {
        var datamanut = equipamentos[i].datamanut.toISOString().replace(/(\d{4})-(\d{2})-(\d{2})[^\r\n]*/, '$3/$2/$1');
        var datault = equipamentos[i].datault.toISOString().replace(/(\d{4})-(\d{2})-(\d{2})[^\r\n]*/, '$3/$2/$1');
        mailOptions.html = mailOptions.html + "<tr><td>" + equipamentos[i].nome + "</td>";
        mailOptions.html = mailOptions.html + "<td>" + datamanut + "</td>";
        mailOptions.html = mailOptions.html + "<td>" + datault + "</td></tr>";
      }
      mailOptions.html = mailOptions.html + "</table>";
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
          res.render('/inicial', {user : req.user,errosValidacao:{}, equipamentos:{}});
        } else {
          console.log('Email enviado pelo site: ' + info.response);
          res.redirect('/inicial');
        }
      });
    } else {
      res.redirect('/inicial');
    }
});

router.get('/emailviascript', function(req, res, next){
      Account.find({}).lean().exec(function(err, results) {
          if(err) {
              return next(err);
          }
          req.listaUsuarios = results;
          next();
      });
  },function(req, res){
      for(var i1=0; i1<3; i1++){
        var Equips = db.Mongoose.model('equips', db.Equips);
        Equips.find({user : req.listaUsuarios[i1].username, datamanut : {$lt: new Date(new Date().setDate(new Date().getDate()+30))}}).lean().exec(function(err, results) {
          if (results[0] == null){
            to = 'a@a.com'
          } else {
            to = results[0].user
          }
          const transporter = nodemailer.createTransport({
            host: "mail.phyti.com.br",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
        	     user: "thiago@phyti.com.br",
        	      pass: "Senh@123"
              },
            tls: { rejectUnauthorized: false }
          });
          const mailOptions = {
            from: 'thiago@phyti.com.br',
            to: to,
            subject: 'Sistema de agenda de manutenção',
            text: 'Lista de nobreaks necessitando de manutenção',
            html: '<h1>Segue a lista de nobreaks necessitando de manutenção:</h1><table border="1px"><tr><th>Nome Do Equipamento</th><th>Data da próxima manutenção</th><th>Data da última manutenção</th></tr>'
          };
          equipamentos = results
          for(var i2=0; i2<equipamentos.length; i2++) {
            var datamanut = equipamentos[i2].datamanut.toISOString().replace(/(\d{4})-(\d{2})-(\d{2})[^\r\n]*/, '$3/$2/$1');
            var datault = equipamentos[i2].datault.toISOString().replace(/(\d{4})-(\d{2})-(\d{2})[^\r\n]*/, '$3/$2/$1');
            mailOptions.html = mailOptions.html + "<tr><td>" + equipamentos[i2].nome + "</td>";
            mailOptions.html = mailOptions.html + "<td>" + datamanut + "</td>";
            mailOptions.html = mailOptions.html + "<td>" + datault + "</td></tr>";
          }
          mailOptions.html = mailOptions.html + "</table>";
          //como o to = a@a.com significa que o email não irá sair, eu controlei via IF aqui
          if (to != 'a@a.com'){
            transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
              res.render('/inicial', {user : req.user,errosValidacao:{}, equipamentos:{}});
            } else {
              console.log('Email enviado pelo site: ' + info.response);
              res.redirect('/inicial');
            }
          });
          }
        })
      }
    });

module.exports = router;
