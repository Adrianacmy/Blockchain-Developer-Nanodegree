const express = require('express')
const bitcoinMessage = require('bitcoinjs-message')
const app = express()
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const port = 8000

const Block = require('./block')
const BlockChain = require('./simpleChain')


const hexEncode = (str) => {
    let arr1 = [];
    for (let n = 0, l = str.length; n < l; n++) {
        let hex = Number(str.charCodeAt(n)).toString(16);
        arr1.push(hex);
    }
    return arr1.join('');
};

const isASCII = (aStr) => {
    return /^[\x00-\x7F]*$/.test(aStr);
};

const allString = lst => {
    return lst.every(item => typeof item === 'string')
};

const validBody = body => {
    let valid = true;
    let message = '';
    let { address, star } = body;
    const { dec, ra, story, magnitude, constellation } = star;
    let lst = [address, dec, ra, story]
    if (!address || !dec || !ra || !story || !allString(lst)) {
        valid = false;
        message = 'address, dec, ra, story must be strings and all of them are required';
    }
    if (isASCII(story)) {
        if (hexEncode(story).length > 500) {
            valid = false;
            message = 'Story is too long';
        }
    }
    return [valid, message];
};

let blockchain = new BlockChain();

let registerStar = {
    registerStar: false,
    status: {
        address: "",
        requestTimeStamp: "",
        message: "",
        validationWindow: 300
    }
}


/***
 * look up star with block height
 * param:
 *     blockHeight: integer, required
 * return a block in json
 */

app.get('/block/:blockHeight', async (req, res) => {
    let height = req.params.blockHeight;

    try {
        const response = await blockchain.getBlock(height)
        res.send(response);
    } catch (err) {
        res.status(404).json({
            "status": 404,
            "message": "Block not found"
        })
    }

})


/**
 * request Validation
 * param:
 *     walletAddress: string, required
 * return address, requestTimeStamp, message, validationWindow
 *
 */
app.post('/requestValidation', (req, res) => {
        if (!registerStar.status.requestTimeStamp) {
        registerStar.status.requestTimeStamp = new Date().getTime().toString().slice(0, -3);
    }
    let walletAddress = req.body.address;

    if (!walletAddress) {
        res.status(400).json({
            "status": 400,
            "message": "Please provide your wallet address"
        })
    } else {
        if (walletAddress !== registerStar.status.address) {
            registerStar.status.address = walletAddress;
            registerStar.registerStar = '';
            registerStar.status.validationWindow = 300;
            registerStar.status.requestTimeStamp = new Date().getTime().toString().slice(0, -3);
        } else {
            let newTimeStamp = new Date().getTime().toString().slice(0, -3);
            let timeDelta = parseInt(newTimeStamp) - parseInt(registerStar.status.requestTimeStamp);

            if (timeDelta >= 300) {
                registerStar.status.validationWindow = 300,
                registerStar.status.requestTimeStamp = '';

            } else {
                registerStar.status.validationWindow = 300 - timeDelta;
            }
        }
        registerStar.status.message = `${registerStar.status.address}:${registerStar.status.requestTimeStamp}:starRegistry`
        res.send(registerStar.status);
    }
})


/**
 * verify identity
 * params:
 *      address: string, required
 *      signature: string, required
 * return registerStar, status
 */
app.post('/message-signature/validate', (req, res) => {
    let walletAddress = req.body.address;
    let signature = req.body.signature;
    if (!walletAddress || !signature) {
        res.status(400).json({
            "status": 400,
            "message": "Please provide your wallet address and signature"
        })
    } else {
        let { address, requestTimeStamp, message} = registerStar.status;
        let valid = bitcoinMessage.verify(message, address, signature);

        let newTimeStamp = new Date().getTime().toString().slice(0, -3);
        let timeDelta = parseInt(newTimeStamp) - parseInt(registerStar.status.requestTimeStamp);
        let timeLeft = 300 - timeDelta > 0 ? 300 - timeDelta : 0;

        if (valid){
            registerStar.registerStar = true;
            res.status(200).json({
                "registerStar": registerStar.registerStar,
                "status": {
                    "address": address,
                    "requestTimeStamp": requestTimeStamp,
                    "message": message,
                    "validationWindow": timeLeft > 0 ? timeLeft : 0,
                    "messageSignature": 'valid'
                }
            })
        }else{
            registerStar.registerStar = false;

            if (registerStar.status.validationWindow = 0){
                res.json({"message": "validation window expired"});
            }else{
                res.status(200).json({
                    "registerStar": registerStar.registerStar,
                    "status": {
                        "address": address,
                        "requestTimeStamp": requestTimeStamp,
                        "message": message,
                        "validationWindow": timeLeft > 0 ? timeLeft : 0,
                        "messageSignature": 'invalid'
                    }
                })
            }
        }
    }
})


/**
 * register a new star when registerStar is true
 * params:
 *     address: string, required
*      star: {
            "dec": string, required,
            "ra": string, required,
            "story": Ascii string limited to 250 words/500 bytes, required,
            "magnitude": string, optional,
            "constellation": string, optional
            }
    return a new star block in json
 */
app.post('/block', async (req, res) => {
    console.log(registerStar)
    if (registerStar.registerStar) {
        let re = validBody(req.body);
        if (re[0]) {
            // console.log(req.body.star.story);
            hexStory = hexEncode(req.body.star.story);
            const { address, star } = req.body;
            const { dec, ra, story } = star;

            newBody = {
                address: address,
                star: {
                    dec: dec,
                    ra: ra,
                    story: hexStory
                }
            }
            const { magnitude, constellation } = req.body.star;
            if (magnitude && allString([magnitude])) {
                newBody.star.magnitude = magnitude;
            }
            if (constellation && allString([constellation])) {
                newBody.star.constellation = constellation;
            }
            await blockchain.addBlock(new Block(newBody));
            const height = await blockchain.getBlockHeight()
            const response = await blockchain.getBlock(height)
            registerStar.registerStar = false;
            res.status(201).send(response);
        } else {
            res.send(re[1]);
        }

    } else {
        res.json({
            "message": "Not allowed to register star, please verify yourself first."
        })
    }

})


/**
 * star look up
 * params:
 *     address: string, required
 * ｒeturn a list of stars
 */

app.get('/stars/address:address', async (req, res) => {
    let address = req.params.address.slice(1);
    if (!address) {
        res.status(400).json({
            "message": "Please provide your wallet address"
        })
    } else {
        const response = await blockchain.getBlockByAddress(address);
        // console.log(response);
        res.send(response)
    }

})


/**
 * star look up
 * params:
 *     hash: string, required
 * ｒeturn a star
 */
app.get('/stars/hash:hash', async (req, res) => {
    let hash = req.params.hash.slice(1);
    console.log(hash);
    if (!hash) {
        res.status(400).json({
            "message": "Please provide hash"
        })
    } else {
        const response = await blockchain.getBlockByHash(hash);
        res.send(response);
    }

})


app.get('*', function (req, res) {
    res.status(404).send('Route Not Found');
});


app.listen(port, () => console.log(`API is listening on port ${port}!`))