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
    //      openOrders.forEach( async i => {
    //        await binanceClient.cancelOrder(i.id, i.symbol)
    //     });
        console.log(openOrders[0].id);
    }

    // market Price 
    const results = await Promise.all([
        axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'),
        axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
    ])

    const marketPrice = results[0].data.solana.usd/ results[1].data.tether.usd

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

    console.log(timeOne, timeTwo, timeThree, timeFour, timeFive);

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
        if (openOrders.length == 1) {
            if (openOrders[0].side == 'sell') binanceClient.cancelOrder(openOrders[0].id, openOrders[0].symbol)
        }

        if (baseBalance > 30) {
            const buyPrice = marketPrice * (1 - spread)
            const buyVolume = (baseBalance * allocation) / marketPrice

            await binanceClient.createLimitBuyOrder(market, buyVolume, buyPrice)

            console.log(
                `New tick for ${market}
                Created limit buy order of ${buyVolume} @ ${buyPrice}
                 `
            );
        }
    } 

    if (conditioner > 2) {
        if (openOrders.length == 1) {
            if (openOrders[0].side == 'buy') binanceClient.cancelOrder(openOrders[0].id, openOrders[0].symbol)
        }

        if (assetBalance > 0.3) {
            const sellPrice = marketPrice * (1 + spread)
            const sellVolume = (assetBalance * allocation) 

            console.log(sellVolume, sellPrice);

            await binanceClient.createLimitSellOrder(market, sellVolume, sellPrice)

            console.log(
                `New tick for ${market}
                Created limit sell order of ${sellVolume} @ ${sellPrice}
                `
            ); 
        }  
    }

    if (conditioner == 2) {
        console.log('we go again')
    }

    // if (conditioner == 2) {
    //     const buyPrice = marketPrice * (1 - (1.3 * spread))
    //     const buyVolume = (baseBalance * allocation) / marketPrice
    //     const sellPrice = marketPrice * (1 + (1.3 * spread))
    //     const sellVolume = (assetBalance * allocation) 

    //     await binanceClient.createLimitBuyOrder(market, buyVolume, buyPrice)
    //     await binanceClient.createLimitSellOrder(market, sellVolume, sellPrice)

    //     console.log(
    //         `New tick for ${market}
    //         Created limit buy order of ${buyVolume} @ ${buyPrice}
    //         Created limit sell order of ${sellVolume} @ ${sellPrice}
    //         `
    //     ); 

    // }
    
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