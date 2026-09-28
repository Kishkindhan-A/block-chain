const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('EnergyMeter authorization', function () {
  it('rejects unauthorized writes from non-owner accounts', async function () {
    const [owner, attacker] = await ethers.getSigners();
    const EnergyMeter = await ethers.getContractFactory('EnergyMeter');
    const meter = await EnergyMeter.deploy();
    await meter.waitForDeployment();

    await expect(
      meter.connect(attacker).storeReading(
        'MTR999',
        230000,
        3500,
        805000,
        980,
        12345,
        '2026-09-26T12:00:00Z',
        '0xdeadbeef'
      )
    ).to.be.revertedWith('Only authorized writer can call this.');

    const count = await meter.getReadingCount();
    expect(Number(count)).to.equal(0);
    expect(await meter.owner()).to.equal(owner.address);
  });
});
