const IlpStream = require('ilp-protocol-stream')
const crypto = require('crypto')
const EventEmitter = require('events')
const getIlpPlugin = require('ilp-plugin')
const debug = require('debug')('koa-web-monetization')

class KoaWebMonetization {
  constructor (opts) {
    this.connected = false
    this.plugin = (opts && opts.plugin) || getIlpPlugin()
    this.buckets = new Map()
    this.balanceEvents = new EventEmitter()
    this.maxBalance = (opts && opts.maxBalance) || Infinity
  }

  async connect () {
    if (this.connected) return
    this.connected = true

    await this.plugin.connect()

    this.server = new IlpStream.Server({
      plugin: this.plugin,
      serverSecret: crypto.randomBytes(32)
    })

    this.server.on('connection', conn => {
      const id = conn.connectionTag
      conn.on('money_stream', stream => {
        stream.setReceiveMax(Infinity)
        stream.on('incoming', amount => {
          let balance = this.buckets.get(id) || 0
          balance = Math.min(balance + Number(amount), this.maxBalance)
          this.buckets.set(id, balance)
          setImmediate(() => this.balanceEvents.emit(id, balance))
          debug('got money for bucket. amount=' + amount,
            'id=' + id,
            'balance=' + balance)
        })
      })
    })

    await this.server.listen()
  }

  awaitBalance (id, balance) {
    debug('awaiting balance. id=' + id, 'balance=' + balance)
    return new Promise(resolve => {
      const handleBalanceUpdate = _balance => {
        if (_balance < balance) return

        setImmediate(() =>
          this.balanceEvents.removeListener(id, handleBalanceUpdate))
        resolve()
      }

      this.balanceEvents.on(id, handleBalanceUpdate)
    })
  }

  spend (id, price) {
    const balance = this.buckets.get(id) || 0

    if (balance < price) {
      throw new Error('insufficient balance on id.' +
      ' id=' + id,
      ' price=' + price,
      ' balance=' + balance)
    }

    debug('spent money. id=' + id, 'price=' + price)
    this.buckets.set(id, balance - price)
  }

  paid ({ price, awaitBalance = false }) {
    return async (ctx, next) => {
      const id = ctx.params.id
      if (!id) {
        return ctx.throw(400, 'ctx.params.id must be defined')
      }

      const _price = (typeof price === 'function')
        ? Number(price(ctx))
        : Number(price)

      if (awaitBalance) {
        await this.awaitBalance(id, _price)
      }

      try {
        this.spend(id, _price)
        return next()
      } catch (e) {
        return ctx.throw(402, e.message)
      }
    }
  }

  receiver () {
    return async ctx => {
      await this.connect()

      if (ctx.get('Accept').indexOf('application/spsp+json') === -1) {
        return ctx.throw(404)
      }

      const { destinationAccount, sharedSecret } =
        this.server.generateAddressAndSecret(ctx.params.id)

      ctx.set('Content-Type', 'application/spsp+json')
      ctx.body = {
        destination_account: destinationAccount,
        shared_secret: sharedSecret.toString('base64')
      }
    }
  }
}

module.exports = KoaWebMonetization
