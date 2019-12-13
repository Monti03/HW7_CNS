const formidable = require('formidable')
const express = require('express')
const app = express()

var fs = require('fs')
var shell = require('shelljs')

var REVOKED = [`gianni`]

const GENERATE_KEY = 'openssl genpkey -algorithm RSA -out ca.key'
const GENERATE_SELF_SEGNED_CERTIFICATE = 'openssl req -new -x509 -days 3650 -key ca.key -sha256 -extensions v3_ca -out ca.pem < ca.info'

if (!fs.existsSync("ca.key")){
  
  shell.exec(GENERATE_KEY)
  shell.exec(GENERATE_SELF_SEGNED_CERTIFICATE)

}


app.get('/revoke', function (req, res) {
  console.log('get /revoke received')

  to_revoke = req.query.to_revoke

  REVOKED.push(to_revoke)
  
  res.send('OK')
})

app.get('/CRL', function(req, res){
  console.log(`CRL`)
  var all_revoked = ``
  for (revoked_ in REVOKED){
    all_revoked = `${all_revoked};${REVOKED[revoked_]}`
  }
  console.log(`CRL ${all_revoked}`)
  res.send(all_revoked)
})

app.get('/certificate', function(req, res){
  console.log(`certificate`)
  res.download(`/home/node/app/ca.pem`)
})

app.post('/sign', function(req,res){
  console.log('sign /sign req received')

  //console.log(req)

  var form = new formidable.IncomingForm();
 
  form.parse(req, function(err, fields, files) {

    //console.log('files:'+files)
    for(file_name in files){
      console.log('eccolo')
      //console.log(files[file_name])

      var path = files[file_name].path
      
      if(fs.existsSync(path)){
        console.log('exists')
        var GENERATE_SERVER_CERTIFICATE = `openssl x509 -sha256 -req -in ${path} -CA ca.pem -CAkey ca.key -CAcreateserial -out ./${files[file_name].name}.pem -days 3650`
        shell.exec(GENERATE_SERVER_CERTIFICATE)
        res.download(`/home/node/app/${files[file_name].name}.pem`)

      }
      else{
        console.log('error -> csr not saved')
        res.send('error')
      }
    }
    console.log('end for')
  })

  console.log("")
})

app.listen(8000)
