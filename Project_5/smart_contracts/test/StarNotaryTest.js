const StarNotary = artifacts.require('StarNotary')

contract('StarNotary', accounts => {
    const name = 'awesome star!';
    const story = 'I love my wonderful star';
    const ra = "ra_032.155";
    const dec = "dec_121.874";
    const mag = "mag_245.978";
    const cent = "cot_788.90";
    const tokenId = 1;

    beforeEach(async function () {
        this.contract = await StarNotary.new({ from: accounts[0] })
        // console.log(this.contract)
    })


    describe('createStar', () => {
        it('can create a star and return its info', async function () {
            await this.contract.createStar(name, story, ra, dec, mag, cent, {from: accounts[1]});
            console.log(await this.contract.tokenCount());
            console.log(await this.contract.tokenIdToStarInfo(3))
            assert.deepEqual(await this.contract.tokenIdToStarInfo(tokenId), [name, story, ra, dec, mag, cent]);
        });

        it('will check if a given value is empty', async function() {
            let empty = await this.contract.isEmpty('');
            assert.equal(true, empty);
        });

        it("will generate a hash with keccak256", async function(){
            let hsh = await this.contract.generateCoordsHash(ra, dec, mag, cent);
            assert.equal(hsh, '0xca3b5818f40e387895371bd04b85b0af950833fbaa742abd454161de67a88ecc')
        });

        it("will check if a start already registered", async function (){
            await this.contract.createStar(name, story, ra, dec, mag, cent, {from: accounts[2]});
            let isExt = await this.contract.checkIfStarExist(ra, dec, mag, cent);
            assert.equal(isExt, true);
        });

    });



    describe('buying and selling stars', () => {
        let user1 = accounts[1]
        let user2 = accounts[2]

        let starId = tokenId
        let starPrice = web3.toWei(.01, "ether")

        beforeEach(async function () {
            // await this.contract.createStar('awesome star!', starId, {from: user1}
            await this.contract.createStar(name, story, ra, dec, mag, cent, {from: user1})}
            )


        it('user1 can put up their star for sale', async function () {
            assert.equal(await this.contract.ownerOf(starId), user1)
            await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
            assert.equal(await this.contract.starsForSale(starId), starPrice)
        })

        describe('user2 can buy a star that was put up for sale', () => {
            beforeEach(async function () {
                await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
            })

            it('user2 is the owner of the star after they buy it', async function () {
                await this.contract.buyStar(starId, {from: user2, value: starPrice})
                assert.equal(await this.contract.ownerOf(starId), user2)

            })

            it('user2 ether balance changed correctly', async function () {
                let overpaidAmount = web3.toWei(.05, 'ether')
                const balanceBeforeTransaction = web3.eth.getBalance(user2)
                await this.contract.buyStar(starId, {from: user2, value: overpaidAmount, gasPrice: 0})
                const balanceAfterTransaction = web3.eth.getBalance(user2)

                assert.equal(balanceBeforeTransaction.sub(balanceAfterTransaction), starPrice)
            })
        })
    })


    describe("can grant approval to transfer", () => {
        let tx;
        let starId = tokenId;
        let starPrice = web3.toWei(.01, "ether")
        beforeEach(async function (){
            await this.contract.createStar(name, story, ra, dec, mag, cent, {from: accounts[1]});
            await this.contract.putStarUpForSale(starId, starPrice, {from: accounts[1]})
            tx = await this.contract.approve(accounts[2], tokenId, {from: accounts[1]});
        });

        it("set accounts[2] as an approved address", async function(){
            assert.equal(await this.contract.getApproved(tokenId), accounts[2]);
        });

        it("allow accouts[2] to transfer", async function(){
            await this.contract.transferFrom(accounts[1], accounts[2], tokenId
                ,{from: accounts[2] });
            assert.equal(await this.contract.ownerOf(tokenId), accounts[2]);
        });

        it("emits the correct event", async function(){
            assert.equal(tx.logs[0].event, 'Approval');
            assert.equal(tx.logs[0].args.tokenId, tokenId);
            assert.equal(tx.logs[0].args.approved, accounts[2]);
            assert.equal(tx.logs[0].args.owner, accounts[1]);
        });
    });


    describe("can set an operator", () => {
        let tx;
        beforeEach(async function (){
            await this.contract.createStar(name, story, ra, dec, mag, cent, {from: accounts[4]});
            tx = await this.contract.setApprovalForAll(accounts[5], true,
                {from: accounts[4]});
        });

        it("can set an operator", async function(){
            // console.log(await this.contract.isApprovedForAll(accounts[5], accounts[4])
            assert.equal(await this.contract.isApprovedForAll(accounts[4], accounts[5]), true)
            assert.equal(tx.logs[0].event, 'ApprovalForAll');
            assert.equal(tx.logs[0].args.owner, accounts[4]);
            assert.equal(tx.logs[0].args.operator, accounts[5]);
            assert.equal(tx.logs[0].args.approved, true);

        })
    });



    describe("can transfer star ownership", () => {
        let tx;

        beforeEach( async function(){
            await this.contract.createStar(name, story, ra, dec, mag, cent, {from: accounts[1]});
            tx = await this.contract.safeTransferFrom(accounts[1], accounts[2], tokenId, {from: accounts[1]});
        });

        it("star has new owner", async function(){
            // console.log(await this.contract.ownerOf(tokenId))
            assert.equal(await this.contract.ownerOf(tokenId), accounts[2])
        });

        it("emit the correct events", async function(){
            // console.log(tx.logs)
            assert.equal(tx.logs[0].event, 'Transfer');
            assert.equal(tx.logs[0].args.tokenId, tokenId);
            assert.equal(tx.logs[0].args.to, accounts[2]);
            assert.equal(tx.logs[0].args.from, accounts[1]);
        });

        it("only permissioned users can transfer stars", async function (){
            let randomPersonTryingToStealTokens = accounts[4]

            await expectThrow(this.contract.safeTransferFrom(accounts[1], randomPersonTryingToStealTokens,
                tokenId, {from: randomPersonTryingToStealTokens}))
        });

    });


})

var expectThrow = async function(promise) {
    try {
        await promise
    } catch (error) {
        assert.exists(error)
        return
    }

    assert.fail('Expected an error but didnt see one!')
}






