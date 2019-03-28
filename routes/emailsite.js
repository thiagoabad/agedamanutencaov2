module.exports = function(app) {
  const nodemailer = require('nodemailer');
  var listaEquipamentos = function(req, res, next) {
      var connection = app.infra.connectionFactory();
      var equipamentosDAO = new app.infra.EquipamentosDAO(connection);
      equipamentosDAO.listaVencidos(function(err, results) {
          if(err) {
              return next(err);
          }
          req.listaEquipamentos = results;
          next();
      });

      connection.end();
  }
  var enviaEmail = function(req, res, next) {
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
      to: 'thiago@phyti.com.br',
      subject: 'Sistema de agenda de manutenção',
      text: 'Lista de nobreaks necessitando de manutenção',
      html: '<h1>Segue a lista de nobreaks necessitando de manutenção:</h1><table border="1px"><tr><th>Nome Do Equipamento</th><th>Data da próxima manutenção</th><th>Data da última manutenção</th></tr>'
    };
    equipamentos = req.listaEquipamentos
    for(var i=0; i<equipamentos.length; i++) {
      var datamanut = equipamentos[i].dtmanut.toISOString().replace(/(\d{4})-(\d{2})-(\d{2})[^\r\n]*/, '$3/$2/$1');
      var datault = equipamentos[i].dtult.toISOString().replace(/(\d{4})-(\d{2})-(\d{2})[^\r\n]*/, '$3/$2/$1');
      mailOptions.html = mailOptions.html + "<tr><td>" + equipamentos[i].nome + "</td>";
      mailOptions.html = mailOptions.html + "<td>" + datamanut + "</td>";
      mailOptions.html = mailOptions.html + "<td>" + datault + "</td></tr>";
    }
    mailOptions.html = mailOptions.html + "</table>";
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
        res.render('equipamentos/form', {errosValidacao:{}, equipamentos:{}});
      } else {
        console.log('Email enviado pelo site: ' + info.response);
        res.render('equipamentos/form', {errosValidacao:{}, equipamentos:{}});
      }
    });
  };

  app.get('/email', listaEquipamentos, enviaEmail);

}
