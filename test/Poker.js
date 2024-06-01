const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Poker Contract", function () {
  let Poker, poker, Evaluator7, evaluator7, Token, token;
  let owner, addr1, addr2, addr3;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    // Deploy the token
    Token = await ethers.getContractFactory("MockERC20");
    console.log('Token:', Token);
    token = await Token.deploy("Poker Token", "PTKN", ethers.utils.parseEther("10000"));
    await token.deployed();

    // Deploy the evaluator
    Evaluator7 = await ethers.getContractFactory("Evaluator7");
    evaluator7 = await Evaluator7.deploy();
    await evaluator7.deployed();

    // Deploy the poker contract
    Poker = await ethers.getContractFactory("Poker");
    poker = await Poker.deploy(evaluator7.address);
    await poker.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await poker.owner()).to.equal(owner.address);
    });

    it("Should set the evaluator address correctly", async function () {
      expect(await poker.EVALUATOR7()).to.equal(evaluator7.address);
    });
  });

  describe("Tables", function () {
    it("Should create a table", async function () {
      await poker.createTable(
        ethers.utils.parseEther("100"),
        3,
        ethers.utils.parseEther("10"),
        token.address
      );

      const table = await poker.tables(0);
      expect(table.buyInAmount).to.equal(ethers.utils.parseEther("100"));
      expect(table.maxPlayers).to.equal(3);
      expect(table.bigBlind).to.equal(ethers.utils.parseEther("10"));
      expect(table.token).to.equal(token.address);
      expect(table.state).to.equal(1); // Inactive
    });

    it("Should allow a player to buy in", async function () {
      await poker.createTable(
        ethers.utils.parseEther("100"),
        3,
        ethers.utils.parseEther("10"),
        token.address
      );

      await token.transfer(addr1.address, ethers.utils.parseEther("200"));
      await token.connect(addr1).approve(poker.address, ethers.utils.parseEther("200"));
      await poker.connect(addr1).buyIn(0, ethers.utils.parseEther("150"));

      const chips = await poker.chips(addr1.address, 0);
      expect(chips).to.equal(ethers.utils.parseEther("150"));
    });
  });

  describe("Gameplay", function () {
    beforeEach(async function () {
      await poker.createTable(
        ethers.utils.parseEther("100"),
        3,
        ethers.utils.parseEther("10"),
        token.address
      );

      await token.transfer(addr1.address, ethers.utils.parseEther("200"));
      await token.transfer(addr2.address, ethers.utils.parseEther("200"));
      await token.connect(addr1).approve(poker.address, ethers.utils.parseEther("200"));
      await token.connect(addr2).approve(poker.address, ethers.utils.parseEther("200"));
      await poker.connect(addr1).buyIn(0, ethers.utils.parseEther("150"));
      await poker.connect(addr2).buyIn(0, ethers.utils.parseEther("150"));
    });

    it("Should deal cards and start the game", async function () {
      const playerCardHashes = [
        { card1Hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("card1_1")), card2Hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("card2_1")) },
        { card1Hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("card1_2")), card2Hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("card2_2")) },
      ];

      await poker.dealCards(playerCardHashes, 0);

      const table = await poker.tables(0);
      expect(table.state).to.equal(0); // Active
    });

    it("Should play a round of poker", async function () {
      const playerCardHashes = [
        { card1Hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("card1_1")), card2Hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("card2_1")) },
        { card1Hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("card1_2")), card2Hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("card2_2")) },
      ];

      await poker.dealCards(playerCardHashes, 0);

      // addr1 checks
      await poker.connect(addr1).playHand(0, 2, 0); // Check

      // addr2 raises
      await poker.connect(addr2).playHand(0, 1, ethers.utils.parseEther("20")); // Raise

      // addr1 calls
      await poker.connect(addr1).playHand(0, 0, 0); // Call

      // Verify round data
      const round = await poker.rounds(0, 0);
      expect(round.highestChip).to.equal(ethers.utils.parseEther("20"));
    });

    it("Should perform a showdown and determine the winner", async function () {
      const playerCardHashes = [
        { card1Hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("card1_1")), card2Hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("card2_1")) },
        { card1Hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("card1_2")), card2Hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("card2_2")) },
      ];

      await poker.dealCards(playerCardHashes, 0);

      // addr1 checks
      await poker.connect(addr1).playHand(0, 2, 0); // Check

      // addr2 raises
      await poker.connect(addr2).playHand(0, 1, ethers.utils.parseEther("20")); // Raise

      // addr1 calls
      await poker.connect(addr1).playHand(0, 0, 0); // Call

      // Move to showdown
      const keys = [ethers.utils.formatBytes32String("key1"), ethers.utils.formatBytes32String("key2")];
      const playerCards = [
        { card1: 1, card2: 2 },
        { card1: 3, card2: 4 },
      ];

      await poker.showdown(0, keys, playerCards);

      const chipsAddr1 = await poker.chips(addr1.address, 0);
      const chipsAddr2 = await poker.chips(addr2.address, 0);

      expect(chipsAddr1).to.equal(ethers.utils.parseEther("150")); // Update according to the winner
      expect(chipsAddr2).to.equal(ethers.utils.parseEther("150")); // Update according to the winner
    });
  });
});
