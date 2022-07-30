import { expect } from "chai"
import { ethers } from "hardhat"
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
const { time } = require("@openzeppelin/test-helpers")

describe("Trace Labs Bank", () => {
  const T = 3600

  async function deployTokenFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners()

	  const tokenFanctory = await ethers.getContractFactory("XYZ")
    const token = await tokenFanctory.deploy("XYZ", "XYZ")
    await token.deployed()
    console.log(`Before Deployment`)
    console.log(`owner : ` + await token.balanceOf(owner.address))
    
	  const bankFactory = await ethers.getContractFactory("Bank")
    const bank = await bankFactory.deploy(token.address, 1000, T)
    await bank.deployed()
    
    token.transfer(bank.address, 1000)
    console.log(`\n After Deployment`)
    console.log(`owner : ` + await token.balanceOf(owner.address))
    console.log(`bank : ` + await token.balanceOf(bank.address))

    token.mint(user1.address, 1000)
    token.mint(user2.address, 1000)
    token.mint(user3.address, 1000)

    console.log(`user1 : ` + await token.balanceOf(user1.address))
    console.log(`user2 : ` + await token.balanceOf(user2.address))
    console.log(`user3 : ` + await token.balanceOf(user3.address))

    return { token, bank, owner, user1, user2, user3 };
  }

  it("Users can deposit while T-interval from the deployed Time", async () => {
    const {token, bank, user1, user2, user3} = await loadFixture(deployTokenFixture)

    await token.connect(user1).approve(bank.address, 1000)
    await bank.connect(user1).deposit(1000)

    await token.connect(user2).approve(bank.address, 1000)
    await bank.connect(user2).deposit(1000)

    await token.connect(user3).approve(bank.address, 1000)
    await bank.connect(user3).deposit(1000)

    expect( await token.balanceOf(bank.address) ).to.equal(4000)
  })

  it("Users cannot deposit or withdraw between T and 2T", async () => {
    const { token, bank, user1 } = await loadFixture(deployTokenFixture)
    
    // increase 4000s = 1h + 400s
    await ethers.provider.send('evm_increaseTime', [4000])
    await ethers.provider.send('evm_mine', [])

    await token.connect(user1).approve(bank.address, 1000)
    
    expect(bank.connect(user1).deposit(1000)).to.be.revertedWith(`Deposit Not allowed`)
    expect(bank.connect(user1).withdraw()).to.be.revertedWith(`Withdraw Not allowed`)
  })

  it("Users can withdraw after 2T", async () => {
    const { token, bank, user1, user2, user3 } = await loadFixture(deployTokenFixture)
    
    await token.connect(user1).approve(bank.address, 1000)
    await bank.connect(user1).deposit(1000)

    await token.connect(user2).approve(bank.address, 1000)
    await bank.connect(user2).deposit(1000)

    await token.connect(user3).approve(bank.address, 1000)
    await bank.connect(user3).deposit(1000)

    // increase 2h
    await ethers.provider.send('evm_increaseTime', [7200])
    await ethers.provider.send('evm_mine', [])
    await bank.connect(user1).withdraw()

    // 1000 + 1000 * 0.2(first reward pool 20%) * 0.3(staked percent 33%) = 1066
    expect(await token.balanceOf(user1.address)).to.equal(1066);

    // increase 1h
    await ethers.provider.send('evm_increaseTime', [3600])
    await ethers.provider.send('evm_mine', [])
    await bank.connect(user2).withdraw()

    // 1000 + 67 + 1000 * 0.3(second reward pool 20%) * 0.5(staked percent 50%) = 1217
    expect(await token.balanceOf(user2.address)).to.equal(1217);

    // increase 1h
    await ethers.provider.send('evm_increaseTime', [3600])
    await ethers.provider.send('evm_mine', [])
    await bank.connect(user3).withdraw()

    // 1000 + 217 + 1000 * 0.5(third reward pool 20%) * 1(staked percent 100%) = 1717
    expect(await token.balanceOf(user3.address)).to.equal(1717);
  })

  it("Bank Owner can withdraw the rest of the staked tokens", async () => {
    const { token, bank, owner, user1, user2, user3 } = await loadFixture(deployTokenFixture)
    
    await token.connect(user1).approve(bank.address, 1000)
    await bank.connect(user1).deposit(1000)

    await token.connect(user2).approve(bank.address, 1000)
    await bank.connect(user2).deposit(1000)

    await token.connect(user3).approve(bank.address, 1000)
    await bank.connect(user3).deposit(1000)

    // increase 2h
    await ethers.provider.send('evm_increaseTime', [7200])
    await ethers.provider.send('evm_mine', [])
    await bank.connect(user1).withdraw()

    // 1000 + 1000 * 0.2(first reward pool 20%) * 0.3(staked percent 33%) = 1066
    expect(await token.balanceOf(user1.address)).to.equal(1066);

    // increase 1h
    await ethers.provider.send('evm_increaseTime', [3600])
    await ethers.provider.send('evm_mine', [])
    await bank.connect(user2).withdraw()

    // 1000 + 67 + 1000 * 0.3(second reward pool 20%) * 0.5(staked percent 50%) = 1217
    expect(await token.balanceOf(user2.address)).to.equal(1217);

    await bank.withdrawalByOwner();
    expect(await token.balanceOf(owner.address)).to.equal(10717);
  })
})
