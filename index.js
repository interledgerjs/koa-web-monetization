const { createReceiver } = require('ilp-protocol-psk2')
const EventEmitter = require('events')
const getIlpPlugin = require('ilp-plugin')

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

    this.receiver = await createReceiver({
      plugin: this.plugin,
      paymentHandler: async params => {
        const amount = params.prepare.amount
        const id = params.prepare.destination.split('.').slice(-3)[0]

        let balance = this.buckets.get(id) || 0
        balance = Math.min(balance + Number(amount), this.maxBalance)
        this.buckets.set(id, balance)
        setImmediate(() => this.balanceEvents.emit(id, balance))
        console.log('got money for bucket. amount=' + amount,
          'id=' + id,
          'balance=' + balance)

        await params.acceptSingleChunk()
      }
    })
  }

  awaitBalance (id, balance) {
    return new Promise(resolve => {
      const handleBalanceUpdate = _balance => {
        console.log('balance of', _balance)
        if (_balance < balance) return
        console.log('done')

        setImmediate(() =>
          this.balanceEvents.removeListener(id, handleBalanceUpdate))
        resolve()
      }

      this.balanceEvents.on(id, handleBalanceUpdate)
    })
  }

  spend (id, price) {
    const balance = this.buckets.get(id)

    if (balance < price) {
      throw new Error('insufficient balance on id.' +
      ' id=' + id,
      ' price=' + price,
      ' balance=' + balance)
    }

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
        console.log('awaiting balance')
        await this.awaitBalance(id, _price)
      }
      console.log('finished')

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
}

module.exports = KoaWebMonetization
