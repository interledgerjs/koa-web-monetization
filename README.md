# Koa Web Monetization
> Charge for resources and API calls with web monetization

- [Overview](#overview)
- [Example Code](#example-code)
- [Try it Out](#try-it-out)
  - [Prerequisites](#prerequisites)
  - [Install and Run](#install-and-run)
- [API Docs](#api)
  - [Constructor](#constructor)
  - [Receiver](#receiver)
  - [Paid](#paid)

## Overview

Using [Interledger](https://interledger.org) for payments, [Web
Monetization](https://github.com/interledger/rfcs/blob/master/0028-web-monetization/0028-web-monetization.md#web-monetization)
allows sites to monetize their traffic without being tied to an ad network. And
because payments happen instantly, they can also be tracked on the server-side
to unlock exclusive content or paywalls.

`koa-web-monetization` makes this easy by providing middleware for your
[Koa](http://koajs.com/) application. Charging your users is as easy as putting
`monetization.paid({ price: 100 })` in front of it. No need to convince them to
buy a subscription or donate.

## Example Code

Below is an example of some of the functions that you would use to create
paywalled content. For a complete and working example, look at the next
section.

```js
const Koa = require('koa')
const app = new Koa()

const router = require('koa-router')()
const WebMonetization = require('koa-web-monetization')
const monetization = new WebMonetization()

// This is the SPSP endpoint that lets you receive ILP payments.  Money that
// comes in is associated with the :id
router.get('/pay/:id', monetization.receiver())

// This endpoint charges 100 units to the user with :id
// If awaitBalance is set to true, the call will stay open until the balance is sufficient. This is convenient
// for making sure that the call doesn't immediately fail when called on startup.
router.get('/content/:id/:content_id/', monetization.paid({ price: 100, awaitBalance: true }), async ctx => {
  // load content by :content_id
})

router.get('/', async ctx => {
  // load index page
})

app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8080)
```

The client side code to support this is very simple too:

```html
<script src="node_modules/koa-web-monetization/client.js"></script>
<script>
  getMonetizationId('http://localhost:8080/pay/:id')
    .then(id => {
      var img = document.createElement('img')
      var container = document.getElementById('container')

      img.src = '/content/' + id
      img.width = '600'
      container.appendChild(img)
    })
</script>
```

## Try it out

This repo comes with an example server that you can run. It serves a page that has a single paywalled image on it.
The server waits for money to come in and then shows the image.

### Prerequisites

- You should be running [Moneyd](https://github.com/interledgerjs/moneyd-xrp)
  for Interledger payments. [Local
  mode](https://github.com/interledgerjs/moneyd-xrp#local-test-network) will work
  fine.

- Build and install the [Minute](https://github.com/sharafian/minute)
  extension. This adds Web Monetization support to your browser.

### Install and Run

```sh
git clone https://github.com/sharafian/koa-web-monetization.git
cd koa-web-monetization
npm install
DEBUG=koa* node example/index.js
```

Now go to [http://localhost:8080](http://localhost:8080), and watch the server
logs.

If you configured Minute and Moneyd correctly, you'll start to see that money
is coming in. Once the user has paid 100 units, the example image will load on
the page.

## API Docs

### Constructor

```ts
new KoaWebMonetization(opts: Object | void): KoaWebMonetization
```

Create a new `KoaWebMonetization` instance.

- `opts.plugin` - Supply an ILP plugin. Defaults to using Moneyd.
- `opts.maxBalance` - The maximum balance that can be associated with any user. Defaults to `Infinity`.

### Receiver

```ts
instance.receiver(): Function
```

Returns a koa middleware for setting up Interledger payments with
[SPSP](https://github.com/sharafian/ilp-protocol-spsp) (used in Web
Monetization).

The endpoint on which this is attached must contain `:id` in the path.

### Paid

```ts
instance.paid(opts: Object): Function
```

- `opts.price` - Function that takes koa `ctx` and returns price, or a number.
  Specifies how many units to charge the user. Required.
- `opts.awaitBalance` - Whether to make the HTTP call wait until the user has
  sufficient balance. Defaults to `false`.

Returns a koa middleware that charges the user whose `:id` is in the path.  It
is meant to be chained with other middlewares, as shown in the [example
code](#example-code)

`awaitBalance` can be useful for when a call is being done at page start.
Rather than immediately failing because the user hasn't paid, the server will
wait until the user has paid the specified price.
