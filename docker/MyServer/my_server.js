const waitPort = require('wait-port')
var FormData = require('form-data')
const express = require('express')
var shell = require('shelljs')

//const request = require('request')
const fs = require('fs')

const app = express()


fs.writeFileSync('my_server.pem', '') // to remove the old certificate

 
const GENERATE_KEY = 'openssl genpkey -algorithm RSA -out my_server.key'
const GENERATE_CERTIFICATE_SIGNING_REQUEST = 'openssl req -sha256 -new -key my_server.key -out my_server.csr < myserver.info'


var shell = require('shelljs')

if (!fs.existsSync("my_server.key")){
    shell.exec(GENERATE_KEY)
    shell.exec(GENERATE_CERTIFICATE_SIGNING_REQUEST)
    
}

// ask CA to sign the CSR


waitPort({host: 'ca',port: 8000})
  .then((open) => {
    if (open) {
        console.log('The port is now open!');

        var form = new FormData()

        form.append('csr', fs.createReadStream('my_server.csr'))
        form.submit('http://ca:8000/sign', function(err, res) {
            //console.log(res)
            
            res.on('data', function(data) {
                process.stdout.write(data)
                fs.appendFileSync('my_server.pem', data)
            })
        })
        
    }
    else{
        console.log('timeout exausted')
    }
  })
  .catch((err) => {
    console.err(`An unknown error occured while waiting for the port: ${err}`);
  });




app.get('/', function (req, res) {
    console.log('get / received')
    res.send('My Server')
})

app.get('/signed_file', function(req, res){

    console.log(`/signed_file`)

    shell.exec(`openssl dgst -sha256 -sign my_server.key -out file_sign.sha256 file_to_sign.txt`)
    shell.exec(`openssl base64 -in file_sign.sha256 -out file_signature_base64`)

    res.download(`/home/node/app/file_signature_base64`)
})


app.get('/certificate', function (req, res) {

    console.log('get /certificate received')
    res.download('/home/node/app/my_server.pem')
})

app.get(`/file`, function(req,res){

    console.log('get /file received')
    res.download('/home/node/app/file_to_sign.txt')
})

app.listen(8000)