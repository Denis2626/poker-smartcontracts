async function main() {
    // Get the contract to deploy
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    // Deploy the Evaluator7 contract first
    const Evaluator7 = await ethers.getContractFactory("Evaluator7");
    const evaluator7 = await Evaluator7.deploy();
    await evaluator7.deployed();
  
    console.log("Evaluator7 deployed to:", evaluator7.address);
  
    // Deploy the MockERC20 token contract
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy();
    await token.deployed();
  
    console.log("MockERC20 deployed to:", token.address);
  
    // Deploy the Poker contract
    const Poker = await ethers.getContractFactory("Poker");
    const poker = await Poker.deploy(evaluator7.address);
    await poker.deployed();
  
    console.log("Poker deployed to:", poker.address);
    console.log("Account balance after deployment:", (await deployer.getBalance()).toString());
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
  