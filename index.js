require('dotenv').config()
const ccxt = require('ccxt')
const axios = require('axios')
const { config } = require('dotenv')

const tick = async(config, binanceClient) => {
    const { asset, base, spread, allocation} = config
    const market = `${asset}/${base}`

    const orders = await binanceClient.fetchOpenOrders(market)
    console.log(orders);

    if ( orders.length == 1) {
        console.log(` ${orders[0].side} order ${orders[0].id} of ${orders[0].amount} at ${orders[0].price} is still active`);
        
    } else {

        orders.forEach( async order => {   
            await binanceClient.cancelOrder(order.id, order.symbol);
        })
        
        const results = await Promise.all([
            axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),
            axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
        ])
    
        const marketPrice = results[0].data.bitcoin.usd/ results[1].data.tether.usd
    
        const sellPrice = marketPrice * (1 + spread)
        const buyPrice = marketPrice * (1 - spread)
        const balances = await binanceClient.fetchBalance()
        const assetBalance = balances.free[asset]
        const baseBalance = balances.free[base]
        const sellVolume =  assetBalance * allocation 
        const buyVolume = (baseBalance * allocation) / marketPrice
    
        console.log(market, buyPrice, sellPrice, sellVolume, buyVolume);
        console.log(balances.free[asset], balances.free[base]);
    
        
    
        await binanceClient.createLimitBuyOrder(market, buyVolume, buyPrice)
        await binanceClient.createLimitSellOrder(market, sellVolume, sellPrice)
    
    
        console.log(orders);
    
    
        console.log(
            `New tick for ${market}
            Created limit sell order of ${sellVolume} @ ${sellPrice}
            Created limit buy order of ${buyVolume} @ ${buyPrice}
    
            `
        );

    } 

}



const run = () => {
    const config = {
        asset : 'BTC',
        base : 'USDT',
        allocation : 0.7,
        spread : 0.001,
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