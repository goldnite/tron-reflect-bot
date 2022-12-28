const { nextTick } = require("process");
const TronWeb = require("tronweb");
const { createDeflateRaw } = require("zlib");
const readline = require("readline");
const HttpProvider = TronWeb.providers.HttpProvider;
/* Tron mainnet */
// const fullHost = new HttpProvider("https://api.trongrid.io");
// const solidityNode = new HttpProvider("https://api.trongrid.io");
// const eventServer = new HttpProvider("https://api.trongrid.io");

/* Tron nile testnet */
const fullHost = new HttpProvider("https://api.nileex.io/");
const API_KEY = "2357eeaa-71a0-45d3-b724-858103f76cc8";

// Reflection wallet
const reflection_privateKey = "faa616059b569776702e2a0e4493c0b9fa833d0d3acbc74e09d7d1e2349d257b";
const reflection_wallet = "TD81bdork73wQqiA7JEMk2ZPA1casUwDoD";

// Withdraw wallet
// const withdraw_privateKey = "81d763aeb04791fa91b534313751a6dc5a91edaa4408dbb2afd835cb0a0e383b";
const withdraw_wallet = "TY3rts6TVEokuDZuJZ8BHyNeiYLxUViX3g";

const tronWeb = new TronWeb({
  fullHost: fullHost,
  headers: { "TRON-PRO-API-KEY": API_KEY },
  privateKey: reflection_privateKey,
});

const WAITING_TIME = 2;
const TRX = 1000000;
const waitForSeconds = async (sec) => {
  await new Promise((r) =>
    setTimeout(() => {
      r();
    }, sec * 1000)
  );
};

const writeWaitingSeconds = async (sec) => {
  while (sec-- > 0) {
    await new Promise((r) =>
      setTimeout(() => {
        r();
      }, 1000)
    );
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`Trying again in ${sec} seconds ...`);
  }
};

const logger = (msg) => {
  console.log(msg);
}

const main = async () => {
  try {
    logger("\nFetching account balance ...");
    const [rw_account, ww_account] = await Promise.all([tronWeb.trx.getAccount(reflection_wallet), tronWeb.trx.getAccount(withdraw_wallet)]);
    logger(`Current reflection wallet balance  is ${(rw_account?.balance ?? 0) / TRX} TRX.`);
    logger(`Current withdraw wallet balance is ${(ww_account?.balance ?? 0) / TRX} TRX.`);
    if ((rw_account?.balance ?? 0) > 1 * TRX) {
      const sendValue = rw_account.balance - 1 * TRX;
      logger(`Sending ${sendValue / TRX} TRX (${sendValue} sun) to withdraw wallet ...`);
      const txnResp = await tronWeb.trx.sendTransaction(withdraw_wallet, sendValue); // Leave 1 TRX for transaction
      if ((txnResp?.result ?? false) == true) {
        logger(`Sending succeed.\nWaiting for transaction validation...`);
        // logger(Date.now());
        let ww_account_new;
        do {
          ww_account_new = await tronWeb.trx.getAccount(withdraw_wallet);
          await waitForSeconds(WAITING_TIME / 10);
        } while (ww_account_new.balance === ww_account.balance);
        // logger(Date.now());
        logger(`New withdraw wallet balance is ${ww_account_new.balance / TRX} TRX.`);
      } else {
        logger(`${Buffer.from(txnResp.message, "hex").toString("utf8")}`);
        logger(`Error Code: ${txnResp.code}`);
        logger(`Tx Id: ${txnResp.txid}`);
      }
      //   logger(txnResp);
    } else {
      if ((rw_account?.balance ?? 0) > 0) logger(`Current reflection wallet has too small balance to withdraw.`);
      else logger(`Current reflection wallet has no balance.`);
      await writeWaitingSeconds(WAITING_TIME);
      //   await waitForSeconds(WAITING_TIME);
    }
  } catch (err) {
    console.error(err);
  }
  logger("");
  nextTick(main);
};
main();
