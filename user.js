const request = require('request')
var shell = require('shelljs')
const fs = require(`fs`)

const MY_SERVER_IP = '127.0.0.1:8081'
const CA_IP = '127.0.0.1:8080'

fs.writeFileSync('file_signature_base64', '') // to remove the old signed files

request(`http://${MY_SERVER_IP}/file`, function(err, res, body){
    fs.writeFileSync(`file_to_sign.txt`, body)
    
    request(`http://${MY_SERVER_IP}/signed_file`, function(err, res, body){
    
        fs.writeFileSync(`file_signature_base64`, body)
    
        var FROM_BASE64_TO_SHA = `openssl base64 -d -in file_signature_base64 -out obtained_file_sign.sha256`
        shell.exec(FROM_BASE64_TO_SHA)
    
        request(`http://${MY_SERVER_IP}/certificate`, function(err, res, body){
    
            //console.log(body)
            fs.writeFileSync('my_server.pem', body)
                
            request(`http://${CA_IP}/certificate`, function(err, res, body){
    
                fs.writeFileSync('ca.pem', body)
                
                var VERIFY_MY_SERVER_CRT = `openssl verify -CAfile ca.pem my_server.pem`
                
                if(shell.exec(VERIFY_MY_SERVER_CRT).code == 0){
                    console.log(`CRT verified`)
                    
                    var GET_PUBK_FROM_CRT = `openssl x509 -pubkey -noout -in my_server.pem  > my_server_pubkey_from_pem.pem`
                    shell.exec(GET_PUBK_FROM_CRT)
                    
                    var SIGN_VERIFICATION = `openssl dgst -sha256 -verify my_server_pubkey_from_pem.pem -signature obtained_file_sign.sha256 file_to_sign.txt`
                    var exit_code = shell.exec(SIGN_VERIFICATION).code

                    if(exit_code == 0){
                        console.log(`SIGN verified`)
                        var GET_SERIAL_NUMBER = `openssl x509 -in my_server.pem -serial -noout`
                        var {stdout, stderr, code} = shell.exec(GET_SERIAL_NUMBER, { silent: true })
                    
                        var serial_number = (stdout.replace(`serial=`, ``)).replace(/(\r\n|\n|\r)/gm, "");
                        console.log(serial_number)
                        request(`http://${CA_IP}/CRL`, function(err, res, body){
                            CRL = body.split(`;`)
                            console.log(CRL)
                            if(CRL.indexOf(serial_number) == -1){
                                console.log(`verified`)
                            }
                            else{
                                console.log(`certified revoked`)
                            } 
                        })
    
                    }
                    else{
                        console.log(`SIGN not verified`)
                    }
    
                }
                else{
                    console.log(`certified not signed by the CA`)
                }
            })
        })
    })
})
