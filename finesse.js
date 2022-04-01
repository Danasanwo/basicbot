require('dotenv').config()
const ccxt = require('ccxt')
const axios = require('axios')
const { config } = require('dotenv')

const tick = async(config, binanceClient) => {

    // market 
    const { asset, base, spread, allocation} = config
    const market = `${asset}/${base}`

    // orders 
    const closedOrders = await binanceClient.fetchClosedOrders(market)
    const openOrders = await binanceClient.fetchOpenOrders(market)
    const lastCompletedOrder = await closedOrders[(closedOrders.length - 1)]

     // cancel existing orders 

     if (openOrders.length > 1) {
        console.log(` ${ openOrders[0].id } is still active `);
    }

    // market Price 

    // const results = await Promise.all([
    //     axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'),
    //     axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
    // ])

    // const marketPrice = results[0].data.solana.usd/ results[1].data.tether.usd

    const results = await binanceClient.fetchOrderBook(market)

    const marketPrice = await results.bids[0][0]

    // balances 

    const balances = await binanceClient.fetchBalance()
    const baseBalance = balances.free[base]
    const assetBalance = balances.free[asset]

    // buy if exceed 

    // OHLVC 

    const historicalOHLVC = (await binanceClient.fetchMarkOHLCV ('SOL/USDT', '5m'))
    const lastFiveOHLVC  = await historicalOHLVC.splice((historicalOHLVC.length - 5))

    const timeOne = lastFiveOHLVC[0][4]
    const timeTwo = lastFiveOHLVC[1][4]
    const timeThree = lastFiveOHLVC[2][4]
    const timeFour = lastFiveOHLVC[3][4]
    const timeFive = lastFiveOHLVC[4][4]



    // conditional OHLVC 

    let conditioner = 0

    if (timeTwo > timeOne) {
        conditioner = conditioner + 1
    }
    if (timeThree > timeTwo) {
        conditioner = conditioner + 1
    }
    if (timeFour > timeThree) {
        conditioner = conditioner + 1
    }
    if (timeFive > timeFour) {
        conditioner = conditioner + 1
    }

    console.log(conditioner);
   

    // conditional trades 

    if (conditioner < 2) {

        // cancel existing sell order 

        if (openOrders.length > 0) {
            openOrders.forEach(i => {
                if ( i.side == 'sell') binanceClient.cancelOrder(i.id, i.symbol)
            });
        }

        // place one order 
        if (baseBalance > 30 && baseBalance < 60) {
            const buyPrice = marketPrice * (1 - spread)
            const buyVolume = (baseBalance * allocation) / marketPrice

            await binanceClient.createLimitBuyOrder(market, buyVolume, buyPrice)

            console.log(
                `New tick for ${market}
                Created limit buy order of ${buyVolume} @ ${buyPrice}
                 `
            );
        }

        // place two orders 

        if (baseBalance > 60) {
            const oneBuyPrice = marketPrice * (1 - spread)
            const twoBuyPrice = marketPrice * (1 - (2 * spread))
            const buyVolume = (baseBalance * (allocation/ 2)) / marketPrice

            await binanceClient.createLimitBuyOrder(market, buyVolume, oneBuyPrice)
            await binanceClient.createLimitBuyOrder(market, buyVolume, twoBuyPrice)

            console.log(
                `New tick for ${market}
                Created limit buy order of ${buyVolume} @ ${oneBuyPrice}
                Created limit buy order of ${buyVolume} @ ${twoBuyPrice}
                 `
            );
        }
    } 

    if (conditioner > 2) {

        // cancel all existing order 

        if (openOrders.length > 0) {
            openOrders.forEach(i => {
                if ( i.side == 'buy') binanceClient.cancelOrder(i.id, i.symbol)
            });
        } 

        // place one order 

        if (assetBalance > 0.3 && assetBalance < 0.6) {
            const sellPrice = marketPrice * (1 + spread)
            const sellVolume = (assetBalance * allocation) 

            await binanceClient.createLimitSellOrder(market, sellVolume, sellPrice)

            console.log(
                `New tick for ${market}
                Created limit sell order of ${sellVolume} @ ${sellPrice}
                `
            ); 
        }  

        // place two orders 
        if (assetBalance > 0.6) {

            const oneSellPrice = marketPrice * (1 + spread)
            const twoSellPrice = marketPrice * (1 + (2 * spread))
            const sellVolume = (assetBalance * (allocation/2)) 

            console.log(market, sellVolume, oneSellPrice);


            await binanceClient.createLimitSellOrder(market, sellVolume, oneSellPrice)
            await binanceClient.createLimitSellOrder(market, sellVolume, twoSellPrice)

            
            console.log(
                `New tick for ${market}
                Created limit sell order of ${sellVolume} @ ${oneSellPrice}
                Created limit sell order of ${sellVolume} @ ${twoSellPrice}
                `
            ); 
        }
    }

    if (conditioner == 2) {
        console.log('we go again')
    }
    
}



const run = () => {
    const config = {
        asset : 'SOL',
        base : 'USDT',
        allocation : 1,
        spread : 0.003,
        tickInterval: 300000
    }

    const binanceClient = new ccxt.binance({
        apiKey: process.env.API_KEY,
        secret: process.env.API_SECRET
    })


    tick(config, binanceClient)
    setInterval(tick, config.tickInterval, config, binanceClient)
}




run()