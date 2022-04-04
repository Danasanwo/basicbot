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

    // market Price 

    const results = await binanceClient.fetchOrderBook(market)
    const marketPrice = await results.bids[0][0]

    // balances 

    const balances = await binanceClient.fetchBalance()
    const baseBalance = balances.free[base]
    const assetBalance = balances.free[asset]

    // in case market goes high/low

    if (openOrders.length > 0) {
        openOrders.forEach( async i=> {

            // cancel buy limit orders that are less than 1% below the market price 

            if (i.side == 'buy' && i.price <= (0.98 * marketPrice)) {
                await binanceClient.cancelOrder(i.id, i.symbol)
                const buyVolume = (baseBalance * allocation) / marketPrice
                await binanceClient.createLimitBuyOrder(market, buyVolume, marketPrice)

                console.log(
                    `New tick for ${market}
                    Created limit buy order of ${buyVolume} @ ${marketPrice}
                     `
                );
            }

            // cancel sell limit orders that are above than 1% above the market price 

            if (i.side == 'sell' && i.price >= (1.02 * marketPrice)) {
                await binanceClient.cancelOrder(i.id, i.symbol)
                const sellVolume =  assetBalance * allocation 
                await binanceClient.createLimitSellOrder(market, sellVolume, marketPrice)

                console.log(
                    `New tick for ${market}
                    Created limit sell order of ${sellVolume} @ ${marketPrice}
                    `
                ); 

            }
        })
    } else if (openOrders.length == 0) {
        if ( marketPrice > (1.02 * lastCompletedOrder.price) && lastCompletedOrder.side == 'sell' && baseBalance > 30) {
            const buyVolume = (baseBalance * allocation) / marketPrice
            await binanceClient.createLimitBuyOrder(market, buyVolume, marketPrice)

            console.log(
                `New tick for ${market}
                Created limit buy order of ${buyVolume} @ ${marketPrice}
                 `
            );
        }

        if (marketPrice < (0.98 * lastCompletedOrder.price) && lastCompletedOrder.side == 'buy' && assetBalance > 0.3) {
            const sellVolume =  assetBalance * allocation 
            await binanceClient.createLimitSellOrder(market, sellVolume, marketPrice)

            console.log(
                `New tick for ${market}
                Created limit sell order of ${sellVolume} @ ${marketPrice}
                `
            ); 
        }
    
    }



    // conditional trades 

    // buy orders 

    if (lastCompletedOrder.side == 'sell' && marketPrice < lastCompletedOrder.price && baseBalance > 30) {
        const buyVolume = (baseBalance * allocation) / marketPrice
        const buyPrice =  marketPrice * (1 - spread)
        
        await binanceClient.createLimitBuyOrder(market, buyVolume, buyPrice)

        console.log(
            `   New tick for ${market}
                Created limit buy order of ${buyVolume} @ ${buyPrice}
            `
        );     
    }
    
    // sell orders 

    if (lastCompletedOrder.side == 'buy' && marketPrice > lastCompletedOrder.price && assetBalance > 0.3) {
        const sellVolume =  assetBalance * allocation 
        const sellPrice =  marketPrice * (1 + spread)

        console.log(sellVolume, sellPrice);
        
        await binanceClient.createLimitSellOrder(market, sellVolume, sellPrice)

        console.log(
            `   New tick for ${market}
                Created limit sell order of ${sellVolume} @ ${sellPrice}
            `
        );     
    }

    

    console.log('we go again');
}



const run = () => {
    const config = {
        asset : 'SOL',
        base : 'USDT',
        allocation : 1,
        spread : 0.0025,
        tickInterval: 60000
    }

    const binanceClient = new ccxt.binance({
        apiKey: process.env.API_KEY,
        secret: process.env.API_SECRET
    })

    

    tick(config, binanceClient)
    setInterval(tick, config.tickInterval, config, binanceClient)
}




run()