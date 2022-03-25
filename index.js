require('dotenv').config()
const ccxt = require('ccxt')
const axios = require('axios')
const { config } = require('dotenv')

const tick = async(config, binanceClient) => {
    const { asset, base, spread, allocation} = config
    const market = `${asset}/${base}`

    const closedOrders = await binanceClient.fetchClosedOrders(market)
    const openOrders = await binanceClient.fetchOpenOrders(market)
    const lastCompletedOrder = await closedOrders[(closedOrders.length - 1)]


    if (lastCompletedOrder.side == 'sell') {
        if ( openOrders.length == 1 ) {
            console.log(` ${openOrders[0].side} order ${openOrders[0].id} of ${openOrders[0].amount} at ${openOrders[0].price} is still active`);
        } else {
        
            const buyPrice = lastCompletedOrder.price * (1 - (2 * spread))
            const balances = await binanceClient.fetchBalance()
            const baseBalance = balances.free[base]
            const buyVolume = (baseBalance * allocation) / marketPrice

            await binanceClient.createLimitBuyOrder(market, buyVolume, buyPrice)

            console.log(
                `New tick for ${market}
                Created limit buy order of ${buyVolume} @ ${buyPrice}
                 `
            );
        }
    } else if (lastCompletedOrder.side == 'buy') {
        if ( openOrders.length == 1 ) {

            openOrders.forEach( async order => {   
                await binanceClient.cancelOrder(order.id, order.symbol);
            })
        }

        const results = await Promise.all([
            axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'),
            axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
        ])

        const marketPrice = results[0].data.solana.usd/ results[1].data.tether.usd
        const sellPrice = marketPrice * (1 + spread)
        const balances = await binanceClient.fetchBalance()
        const assetBalance = balances.free[asset]
        const sellVolume =  assetBalance * allocation 

        await binanceClient.createLimitSellOrder(market, sellVolume, sellPrice)

        console.log(
            `New tick for ${market}
            Created limit sell order of ${sellVolume} @ ${sellPrice}
            `
        );

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