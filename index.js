const { createReceiver } = require('ilp-protocol-psk2')
const EventEmitter = require('events')
const getIlpPlugin = require('ilp-plugin')

class WebMonetizationAccountant {
  constructor (opts) {
    this.connected = false
    this.plugin = (opts && opts.plugin) || getIlpPlugin()
    this.buckets = new Map()
    this.balanceEvents = new EventEmitter()
  }

  async connect () {
    if (this.connected) return

    await this.plugin.connect()

    this.receiver = await createReceiver({
      plugin,
      paymentHandler: async params => {
        const amount = params.prepare.amount
        const id = params.prepare.destination.split('.').slice(-3)[0]

        let balance = this.buckets.get(id) || 0
        balance += Number(amount) * 5000
        this.buckets.set(id, balance)
        setImmediate(() => this.balanceEvents.emit(id, balance))
        console.log('got money for bucket. amount=' + amount,
          'id=' + id,
          'balance=' + balance)

        await params.acceptSingleChunk()
      }
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

  paid ({ price }) {
    return async ctx => {
      const id = ctx.params.id
      if (!id) {
        return ctx.throw(400, 'ctx.params.id must be defined') 
      }

      const _price = (typeof price === 'function')
        ? Number(price(ctx))
        : Number(price)

      try {
        spend(id, _price)    
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
