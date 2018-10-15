const StarNotary = artifacts.require('StarNotary')

contract('StarNotary', accounts => {
    const name = 'awesome star!';
    const story = 'I love my wonderful star';
    const ra = "ra_032.155";
    const dec = "dec_121.874";
    const mag = "mag_245.978";
    const cot = "cot_788.90";
    const tokenId = 1;

    beforeEach(async function () {
        this.contract = await StarNotary.new({ from: accounts[0] })
    })

    describe('createStar test', () => {
        it('can create a star', async function () {
            await this.contract.createStar(name, story, ra, dec, mag, cot, tokenId, { from: accounts[0] });

            it('can create a star and get its info', async function () {
                assert.deepEqual(await this.contract.tokenIdToStarInfo(tokenId), [name, story, ra, dec, mag, cot]);
            });
        })
    })

    // describe('buying and selling stars', () => {
    //     let user1 = accounts[1]
    //     let user2 = accounts[2]
    //     let randomMaliciousUser = accounts[3]

    //     let starId = 1
    //     let starPrice = web3.toWei(.01, "ether")

    //     beforeEach(async function () {
    //         await this.contract.createStar('awesome star!', starId, {from: user1})
    //     })

    //     it('user1 can put up their star for sale', async function () {
    //         assert.equal(await this.contract.ownerOf(starId), user1)
    //         await this.contract.putStarUpForSale(starId, starPrice, {from: user1})

    //         assert.equal(await this.contract.starsForSale(starId), starPrice)
    //     })

    //     describe('user2 can buy a star that was put up for sale', () => {
    //         beforeEach(async function () {
    //             await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
    //         })

    //         it('user2 is the owner of the star after they buy it', async function() {
    //             await this.contract.buyStar(starId, {from: user2, value: starPrice, gasPrice: 0})
    //             assert.equal(await this.contract.ownerOf(starId), user2)
    //         })

    //         it('user2 ether balance changed correctly', async function () {
    //             let overpaidAmount = web3.toWei(.05, 'ether')
    //             const balanceBeforeTransaction = web3.eth.getBalance(user2)
    //             await this.contract.buyStar(starId, {from: user2, value: overpaidAmount, gasPrice: 0})
    //             const balanceAfterTransaction = web3.eth.getBalance(user2)

    //             assert.equal(balanceBeforeTransaction.sub(balanceAfterTransaction), starPrice)
    //         })
    //     })
    // })
})