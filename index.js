const { createReceiver } = require('ilp-protocol-psk2')
const EventEmitter = require('events')
const getIlpPlugin = require('ilp-plugin')
const debug = require('debug')('koa-web-monetization')
const { randomBytes } = require('crypto')

class KoaWebMonetization {
  constructor (opts) {
    this.connected = false
    this.plugin = (opts && opts.plugin) || getIlpPlugin()
    this.buckets = new Map()
    this.balanceEvents = new EventEmitter()
    this.maxBalance = (opts && opts.maxBalance) || Infinity
    this.cookieName = (opts && opts.cookieName) || '__monetizer'
    this.cookieOptions = {
      httpOnly: false
    }
    if (opts && opts.cookieOptions) {
      this.cookieOptions = Object.assign(opts.cookieOptions, this.cookieOptions)
    }
    this.receiverEndpointUrl = (opts && opts.receiverEndpointUrl) || '/__monetizer/:id'
  }

  generatePayerId (ctx) {
    // Check for cookie in request otherwise generate newId.
    const cookie = ctx.cookies.get(this.cookieName)
    if (cookie) {
      return cookie
    }
    // ctx.cookies.set(this.cookieName, randomBytes(16).toString('hex'))
    // return next()
    return randomBytes(16).toString('hex')
  }

  async connect () {
    if (this.connected) return
    this.connected = true
    await this.plugin.connect()

    this.receiver = await createReceiver({
      plugin: this.plugin,
      paymentHandler: async params => {
        const amount = params.prepare.amount
        const id = params.prepare.destination.split('.').slice(-3)[0]

        let balance = this.buckets.get(id) || 0
        balance = Math.min(balance + Number(amount), this.maxBalance)
        this.buckets.set(id, balance)
        setImmediate(() => this.balanceEvents.emit(id, balance))
        debug('got money for bucket. amount=' + amount,
          'id=' + id,
          'balance=' + balance)

        await params.acceptSingleChunk()
      }
    })
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

  async receive (ctx) {
    await this.connect()

    if (ctx.get('Accept').indexOf('application/spsp+json') === -1) {
      return ctx.throw(404)
    }

    const { destinationAccount, sharedSecret } =
      this.receiver.generateAddressAndSecret()

    const segments = destinationAccount.split('.')
    const resultAccount = segments.slice(0, -2).join('.') +
      '.' + ctx.params.id +
      '.' + segments.slice(-2).join('.')

    ctx.set('Content-Type', 'application/spsp+json')
    ctx.body = {
      destination_account: resultAccount,
      shared_secret: sharedSecret.toString('base64')
    }
  }
}

const WebMonetizationMiddleWare = (monetizer) => {
  return async (ctx, next) => {
    // ctx.state.awaitBalance = monetizer.awaitBalance
    // ctx.state.spend = monetizer.spend
    //
    ctx.cookies.set(monetizer.cookieName, monetizer.generatePayerId(ctx), monetizer.cookieOptions)
    return next()
  }
}

module.exports = {
  WebMonetizationMiddleWare,
  KoaWebMonetization
}
