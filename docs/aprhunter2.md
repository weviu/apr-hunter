check README.md; this project is for lazy investors who are looking for somewhere to put their money, and get more 
money in return by staking/earning from different exchanges (starting from binance, okx, kucoin then moving to DeFi
exchanges like kraken and aave). In the later stages: it's very important to use YEARN to automatically move your
crypto between other DeFi protocols. the ui is already created: check ../apr-hunter. Only copy the UI but none of
the backend functions; we'll create a new backend.

IMPORTANT: I want to use next.js, remote mongodb, and instead of 2 separate frontend and backend folders i want
ONE MAIN FOLDER. 

as it's shown in the readme file, at the first stage this project will only be an info website, meaning it will 
fetch apr rates from exchanges using API keys and show the best oppurtunities to the lazy investor. we will use 
smart contracts in the future to make it interactive (meaning that the user will be able to buy and sell through
website, check README.md phase 3 i think.)  GNU nano 8.4                                         aprhunter2.md *                                                
check README.md; this project is for lazy investors who are looking for somewhere to put their money, and get more 
money in return by staking/earning from different exchanges (starting from binance, okx, kucoin then moving to DeFi
exchanges like kraken and aave). In the later stages: it's very important to use YEARN to automatically move your 
crypto between other DeFi protocols. the ui is already created: check ../apr-hunter. Only copy the UI but none of  
the backend functions; we'll create a new backend.

IMPORTANT: I want to use next.js, remote mongodb, and instead of 2 separate frontend and backend folders i want
ONE MAIN FOLDER.    

as it's shown in the readme file, at the first stage this project will only be an info website, meaning it will 
fetch apr rates from exchanges using API keys and show the best oppurtunities to the lazy investor. we will use    
smart contracts in the future to make it interactive (meaning that the user will be able to buy and sell through   
website, check README.md phase 3 i think.)

---

**Status · 2025‑12‑22**

- Bootstrapped a single Next.js folder (no separate frontend/backend) and ported the UI from `../apr-hunter`.
- Added API routes inside Next.js that aggregate APR data (Binance signer implemented, others using placeholders until keys are provided) with MongoDB persistence optional.
- Remote MongoDB + API key driven data flow documented inside `README.md`.
- Upcoming: connect real OKX/KuCoin/Kraken/Aave/Yearn endpoints, add wallet/alerts (Phase 2), then smart contracts + Yearn automation (Phase 3).
