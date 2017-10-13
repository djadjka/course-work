const app = require('express')();
const https = require('https');
// const mongoose = require('mongoose');
// mongoose.connect('mongodb://localhost/crawler');
const fs = require('fs');
const privateKey = fs.readFileSync('./server.key');
const certificate = fs.readFileSync('./server.pem');

const credentials = {
    key: privateKey,
    cert: certificate,
    passphrase: 'garena97',
};
const app1 = https.createServer(credentials, app);


const bodyParser = require('body-parser');
const Crawler = require('./Crawler.js');


app.use(bodyParser.json());

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});



app.post('/', function(req, res) {
   let crawler = new Crawler(req.body.domain, req.body.comands);
   crawler.start();
   res.send('ok');
});


app1.listen(3822, () => {
    console.log('Example app listening on port 3500!');
});

app.listen(3000, () => {
    console.log('Example app listening on port 3000!');
});
